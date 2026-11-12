import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, type Db } from '../src/db/connection';
import { migrate } from '../src/db/migrate';
import { ensureBranch } from '../src/core/setup';
import { uuidv7 } from '../src/core/uuid';
import { nowIso } from '../src/core/time';

export interface TestEnv {
  db: Db;
  dir: string;
  branchId: string;
  warehouseId: string;
  cleanup: () => void;
}

/** Создаёт чистую временную базу с применёнными миграциями и одной точкой продажи (код A). */
export function makeEnv(): TestEnv {
  const dir = mkdtempSync(join(tmpdir(), 'kassa-test-'));
  const db = openDb({ path: join(dir, 'test.db') });
  migrate(db);
  const { branchId, warehouseId } = ensureBranch(db, { code: 'A', name: 'Тест' });
  const env: TestEnv = {
    db,
    dir,
    branchId,
    warehouseId,
    // Закрываем ТЕКУЩЕЕ подключение (тесты могут заменить env.db после «перезапуска»).
    // На Windows открытый файл базы нельзя удалить, поэтому закрываем и повторяем удаление при блокировке.
    cleanup: () => {
      try {
        env.db.close();
      } catch {
        /* уже закрыто */
      }
      rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    },
  };
  return env;
}

export function addUser(db: Db, login = 'cashier1', role: 'admin' | 'cashier' = 'cashier'): string {
  const id = uuidv7();
  const now = nowIso();
  db.prepare(
    `INSERT INTO users (id, login, password_hash, full_name, role, lang, active, created_at, updated_at)
     VALUES (?, ?, 'x', ?, ?, 'ru', 1, ?, ?)`,
  ).run(id, login, login, role, now, now);
  return id;
}

export function addProduct(db: Db, sku = 'P-1', unit = 'm', basePriceSum = 15000): string {
  const id = uuidv7();
  const now = nowIso();
  db.prepare(
    `INSERT INTO products (id, sku, name_ru, unit, base_price, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, sku, `Товар ${sku}`, unit, basePriceSum * 100, now, now);
  return id;
}

export function addBatch(db: Db, productId: string, warehouseId: string, qtyMilli: number, unitCost: number): string {
  const id = uuidv7();
  db.prepare(
    `INSERT INTO batches (id, product_id, warehouse_id, source_type, received_at, qty_in, qty_left, unit_cost, created_at)
     VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, ?)`,
  ).run(id, productId, warehouseId, nowIso(), qtyMilli, qtyMilli, unitCost, nowIso());
  return id;
}

export interface MovementInput {
  branchId: string;
  warehouseId: string;
  productId: string;
  batchId?: string | null;
  type: string;
  qty: number;
  reversesId?: string | null;
}

export function addMovement(db: Db, m: MovementInput): string {
  const id = uuidv7();
  db.prepare(
    `INSERT INTO stock_movements
       (id, created_at, branch_id, warehouse_id, product_id, batch_id, type, qty, doc_type, doc_id, reverses_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'test', ?, ?)`,
  ).run(id, nowIso(), m.branchId, m.warehouseId, m.productId, m.batchId ?? null, m.type, m.qty, uuidv7(), m.reversesId ?? null);
  return id;
}

export function addPaymentMethod(db: Db): string {
  return (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
}

export function addCustomer(db: Db, name = 'Клиент'): string {
  const id = uuidv7();
  const now = nowIso();
  db.prepare('INSERT INTO customers (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
  return id;
}