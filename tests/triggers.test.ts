import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeEnv, addUser, addProduct, addBatch, addMovement, addPaymentMethod, addCustomer, type TestEnv } from './helpers';
import { uuidv7 } from '../src/core/uuid';
import { nowIso } from '../src/core/time';
import { writeAudit } from '../src/core/audit';

let env: TestEnv;
let userId: string;
let productId: string;
let batchId: string;
let methodId: string;
let customerId: string;

beforeEach(() => {
  env = makeEnv();
  userId = addUser(env.db);
  productId = addProduct(env.db);
  batchId = addBatch(env.db, productId, env.warehouseId, 10_000, 1_000_000);
  methodId = addPaymentMethod(env.db);
  customerId = addCustomer(env.db);
});
afterEach(() => env.cleanup());

/** Создаёт по одной валидной записи в каждом журнале и возвращает id для проверок. */
function seedJournals() {
  const db = env.db;
  const movementId = addMovement(db, {
    branchId: env.branchId,
    warehouseId: env.warehouseId,
    productId,
    batchId,
    type: 'SALE',
    qty: -1000,
  });

  const saleId = uuidv7();
  db.prepare(
    `INSERT INTO sales (id, number, branch_id, user_id, subtotal, total, paid_total, debt_amount, created_at)
     VALUES (?, 'A-000001', ?, ?, 100, 100, 100, 0, ?)`,
  ).run(saleId, env.branchId, userId, nowIso());

  const paymentId = uuidv7();
  db.prepare(
    `INSERT INTO payments (id, purpose, sale_id, method_id, amount, direction, user_id, created_at)
     VALUES (?, 'sale', ?, ?, 100, 'in', ?, ?)`,
  ).run(paymentId, saleId, methodId, userId, nowIso());

  const debtId = uuidv7();
  db.prepare(
    `INSERT INTO debt_ledger (id, customer_id, sale_id, type, amount, user_id, created_at)
     VALUES (?, ?, ?, 'DEBT_ADD', 500, ?, ?)`,
  ).run(debtId, customerId, saleId, userId, nowIso());

  const cashId = uuidv7();
  db.prepare(
    `INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at)
     VALUES (?, ?, 100, 'sale', ?, ?, ?)`,
  ).run(cashId, methodId, saleId, userId, nowIso());

  const auditId = writeAudit(db, { userId, action: 'test.action', entity: 'sales', entityId: saleId });

  return { movementId, paymentId, debtId, cashId, auditId };
}

describe('защита журналов от правки и удаления', () => {
  it('stock_movements: UPDATE и DELETE отклоняются', () => {
    const { movementId } = seedJournals();
    expect(() => env.db.prepare('UPDATE stock_movements SET qty = -5 WHERE id = ?').run(movementId)).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM stock_movements WHERE id = ?').run(movementId)).toThrow(/append-only/);
  });

  it('payments: UPDATE и DELETE отклоняются', () => {
    const { paymentId } = seedJournals();
    expect(() => env.db.prepare('UPDATE payments SET amount = 1 WHERE id = ?').run(paymentId)).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId)).toThrow(/append-only/);
  });

  it('debt_ledger: UPDATE и DELETE отклоняются', () => {
    const { debtId } = seedJournals();
    expect(() => env.db.prepare('UPDATE debt_ledger SET amount = 1 WHERE id = ?').run(debtId)).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM debt_ledger WHERE id = ?').run(debtId)).toThrow(/append-only/);
  });

  it('cash_ledger: UPDATE и DELETE отклоняются', () => {
    const { cashId } = seedJournals();
    expect(() => env.db.prepare('UPDATE cash_ledger SET amount = 1 WHERE id = ?').run(cashId)).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM cash_ledger WHERE id = ?').run(cashId)).toThrow(/append-only/);
  });

  it('audit_log: UPDATE и DELETE отклоняются', () => {
    const { auditId } = seedJournals();
    expect(() => env.db.prepare("UPDATE audit_log SET action = 'x' WHERE id = ?").run(auditId)).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM audit_log WHERE id = ?').run(auditId)).toThrow(/append-only/);
  });

  it('массовое удаление без WHERE тоже отклоняется, данные остаются', () => {
    seedJournals();
    for (const table of ['stock_movements', 'payments', 'debt_ledger', 'cash_ledger', 'audit_log']) {
      expect(() => env.db.prepare(`DELETE FROM ${table}`).run(), table).toThrow(/append-only/);
      const n = (env.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
      expect(n, table).toBeGreaterThan(0);
    }
  });

  it('добавление в журналы работает', () => {
    const ids = seedJournals();
    expect(Object.values(ids).every(Boolean)).toBe(true);
  });
});

describe('ограничения целостности', () => {
  it('знак количества должен соответствовать типу движения', () => {
    const base = { branchId: env.branchId, warehouseId: env.warehouseId, productId, batchId };
    expect(() => addMovement(env.db, { ...base, type: 'SALE', qty: 1000 })).toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'PURCHASE', qty: -1000 })).toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'WRITE_OFF', qty: 500 })).toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'RETURN', qty: -500 })).toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'SALE', qty: 0 })).toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'ADJUST_PLUS', qty: 100 })).not.toThrow();
    expect(() => addMovement(env.db, { ...base, type: 'ADJUST_MINUS', qty: -100 })).not.toThrow();
  });

  it('REVERSAL требует ссылку на отменяемую запись', () => {
    const base = { branchId: env.branchId, warehouseId: env.warehouseId, productId, batchId };
    expect(() => addMovement(env.db, { ...base, type: 'REVERSAL', qty: 1000 })).toThrow();
    const original = addMovement(env.db, { ...base, type: 'SALE', qty: -1000 });
    expect(() => addMovement(env.db, { ...base, type: 'REVERSAL', qty: 1000, reversesId: original })).not.toThrow();
  });

  it('неизвестный тип движения отклоняется', () => {
    const base = { branchId: env.branchId, warehouseId: env.warehouseId, productId, batchId };
    expect(() => addMovement(env.db, { ...base, type: 'MAGIC', qty: 1000 })).toThrow();
  });

  it('внешние ключи работают: движение несуществующего товара отклоняется', () => {
    expect(() =>
      addMovement(env.db, {
        branchId: env.branchId,
        warehouseId: env.warehouseId,
        productId: uuidv7(),
        type: 'ADJUST_PLUS',
        qty: 1000,
      }),
    ).toThrow(/FOREIGN KEY/);
  });

  it('остаток партии не может быть больше прихода или отрицательным', () => {
    expect(() => env.db.prepare('UPDATE batches SET qty_left = qty_in + 1 WHERE id = ?').run(batchId)).toThrow();
    expect(() => env.db.prepare('UPDATE batches SET qty_left = -1 WHERE id = ?').run(batchId)).toThrow();
    expect(() => env.db.prepare('UPDATE batches SET qty_left = 5000 WHERE id = ?').run(batchId)).not.toThrow();
  });

  it('штрихкод и артикул уникальны, штрихкод необязателен', () => {
    const now = nowIso();
    const ins = env.db.prepare(
      'INSERT INTO products (id, sku, name_ru, unit, barcode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    ins.run(uuidv7(), 'S1', 'a', 'шт', null, now, now);
    ins.run(uuidv7(), 'S2', 'b', 'шт', null, now, now); // два товара без штрихкода допустимы
    ins.run(uuidv7(), 'S3', 'c', 'шт', '4600000000011', now, now);
    expect(() => ins.run(uuidv7(), 'S4', 'd', 'шт', '4600000000011', now, now)).toThrow(/UNIQUE/);
    expect(() => ins.run(uuidv7(), 'S1', 'e', 'шт', null, now, now)).toThrow(/UNIQUE/);
  });

  it('чек: оплачено + долг должно равняться итогу', () => {
    const ins = () =>
      env.db
        .prepare(
          `INSERT INTO sales (id, number, branch_id, user_id, subtotal, total, paid_total, debt_amount, created_at)
           VALUES (?, ?, ?, ?, 100, 100, 60, 30, ?)`,
        )
        .run(uuidv7(), 'A-000999', env.branchId, userId, nowIso());
    expect(ins).toThrow();
  });

  it('знак записи долга соответствует типу, прощение требует причину', () => {
    const saleId = uuidv7();
    env.db
      .prepare(
        `INSERT INTO sales (id, number, branch_id, user_id, customer_id, subtotal, total, paid_total, debt_amount, created_at)
         VALUES (?, 'A-000050', ?, ?, ?, 1000, 1000, 0, 1000, ?)`,
      )
      .run(saleId, env.branchId, userId, customerId, nowIso());
    const ins = (type: string, amount: number, note: string | null = null) =>
      env.db
        .prepare(
          'INSERT INTO debt_ledger (id, customer_id, sale_id, type, amount, note, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(uuidv7(), customerId, saleId, type, amount, note, userId, nowIso());
    expect(() => ins('DEBT_ADD', -100)).toThrow();
    expect(() => ins('DEBT_PAY', 100)).toThrow();
    expect(() => ins('DEBT_ADD', 100)).not.toThrow();
    expect(() => ins('DEBT_PAY', -100)).not.toThrow();
    expect(() => ins('DEBT_FORGIVE', -50)).toThrow();           // без причины нельзя
    expect(() => ins('DEBT_FORGIVE', -50, '   ')).toThrow();    // пустая причина нельзя
    expect(() => ins('DEBT_FORGIVE', -50, 'Решение владельца')).not.toThrow();
  });
});
