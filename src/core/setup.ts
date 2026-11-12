import type { Db } from '../db/connection';
import { inTransaction } from './tx';
import { uuidv7 } from './uuid';
import { nowIso } from './time';
import { writeAudit } from './audit';

export interface BranchSetup {
  branchId: string;
  warehouseId: string;
  created: boolean;
}

/**
 * Первичная настройка: точка продажи (с кодом-префиксом чека), основной склад и способы оплаты.
 * Безопасно вызывать повторно: уже существующее не дублируется.
 */
export function ensureBranch(db: Db, opts: { code: string; name: string }): BranchSetup {
  return inTransaction(db, () => {
    const existing = db.prepare('SELECT id FROM branches WHERE code = ?').get(opts.code) as { id: string } | undefined;
    const now = nowIso();

    let branchId: string;
    let created = false;
    if (existing) {
      branchId = existing.id;
    } else {
      branchId = uuidv7();
      created = true;
      db.prepare(
        'INSERT INTO branches (id, code, name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
      ).run(branchId, opts.code, opts.name, now, now);
      writeAudit(db, { action: 'branch.create', entity: 'branches', entityId: branchId, after: opts });
    }

    let warehouse = db.prepare('SELECT id FROM warehouses WHERE branch_id = ? ORDER BY created_at LIMIT 1').get(branchId) as
      | { id: string }
      | undefined;
    if (!warehouse) {
      const id = uuidv7();
      db.prepare(
        'INSERT INTO warehouses (id, branch_id, name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
      ).run(id, branchId, 'Основной склад', now, now);
      warehouse = { id };
    }

    const methodCount = (db.prepare('SELECT COUNT(*) AS n FROM payment_methods').get() as { n: number }).n;
    if (methodCount === 0) {
      const insert = db.prepare(
        'INSERT INTO payment_methods (id, name_ru, name_uz, kind, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      );
      insert.run(uuidv7(), 'Наличные', 'Naqd pul', 'cash', now);
      insert.run(uuidv7(), 'Карта', 'Karta', 'card', now);
      insert.run(uuidv7(), 'Перевод', 'Oʻtkazma', 'transfer', now);
    }

    return { branchId, warehouseId: warehouse.id, created };
  });
}
