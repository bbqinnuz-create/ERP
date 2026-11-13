import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inTransaction } from '../src/core/tx';
import { uuidv7 } from '../src/core/uuid';
import { addProduct, addUser, makeEnv, type TestEnv } from './helpers';
import { createPurchase, reversePurchase } from '../src/modules/purchases/service';
import { consumeFifo } from '../src/modules/fifo/service';
import { appendStockMovement, rebuildStockCaches, reconcileStockCaches } from '../src/modules/stock/ledger';

let env: TestEnv;
let adminId: string;
let productA: string;

beforeEach(() => {
  env = makeEnv();
  adminId = addUser(env.db, 'admin', 'admin');
  productA = addProduct(env.db, 'P-A');
});

afterEach(() => env.cleanup());

function create(input: Record<string, unknown> = {}) {
  return createPurchase(env.db, adminId, {
    warehouseId: env.warehouseId,
    date: '2026-11-13',
    supplier: 'Поставщик',
    lines: [{ productId: productA, qty: '2.500', unitCost: 12345 }],
    ...input,
  });
}

function balanceForProduct(): number {
  return (env.db.prepare(
    'SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements WHERE product_id = ? AND warehouse_id = ?',
  ).get(productA, env.warehouseId) as { qty: number }).qty;
}

describe('приходы и кэши остатков', () => {
  it('проводит приход одной транзакцией и создаёт партию, движение, кэши, аудит и outbox', () => {
    const { purchase, lines } = create();
    expect(purchase.number).toBe('A-P-000001');
    expect(purchase.total_cost).toBe(30863);
    expect(lines).toHaveLength(1);

    const movement = env.db.prepare(
      "SELECT type, qty, batch_id FROM stock_movements WHERE doc_type = 'purchase' AND doc_id = ?",
    ).get(purchase.id) as { type: string; qty: number; batch_id: string };
    expect(movement).toMatchObject({ type: 'PURCHASE', qty: 2500 });
    expect(env.db.prepare('SELECT qty, reserved FROM stock_cache WHERE product_id = ? AND warehouse_id = ?')
      .get(productA, env.warehouseId)).toEqual({ qty: 2500, reserved: 0 });
    expect(env.db.prepare('SELECT qty_in, qty_left FROM batches WHERE id = ?').get(movement.batch_id))
      .toEqual({ qty_in: 2500, qty_left: 2500 });
    expect((env.db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'purchase.create'").get() as { n: number }).n).toBe(1);
    expect((env.db.prepare("SELECT COUNT(*) AS n FROM sync_outbox WHERE table_name = 'stock_movements'").get() as { n: number }).n).toBe(1);
    expect(reconcileStockCaches(env.db)).toEqual([]);
  });

  it('откатывает документ, партии и номер, если запись движения завершается ошибкой', () => {
    env.db.exec(
      `CREATE TRIGGER test_fail_movement BEFORE INSERT ON stock_movements
       BEGIN SELECT RAISE(ABORT, 'test movement failure'); END`,
    );
    expect(() => create()).toThrow(/test movement failure/);
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM purchases').get() as { n: number }).n).toBe(0);
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM batches').get() as { n: number }).n).toBe(0);
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM counters').get() as { n: number }).n).toBe(0);
  });

  it('updates sale price with the purchase in one transaction and records before/after audit', () => {
    const expectedBasePrice = (env.db.prepare('SELECT base_price FROM products WHERE id = ?')
      .get(productA) as { base_price: number }).base_price;
    const { purchase } = create({
      productPriceUpdates: [{
        productId: productA,
        expectedBasePrice,
        basePrice: expectedBasePrice + 125,
      }],
    });

    expect(env.db.prepare('SELECT base_price FROM products WHERE id = ?').get(productA))
      .toEqual({ base_price: expectedBasePrice + 125 });
    const audit = env.db.prepare(
      "SELECT before_json, after_json FROM audit_log WHERE action = 'products.update' AND entity_id = ?",
    ).get(productA) as { before_json: string; after_json: string };
    expect(JSON.parse(audit.before_json)).toEqual({ base_price: expectedBasePrice });
    expect(JSON.parse(audit.after_json)).toEqual({ base_price: expectedBasePrice + 125 });
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM purchases WHERE id = ?').get(purchase.id))
      .toEqual({ n: 1 });
  });

  it('rolls back the purchase if a requested sale-price update fails', () => {
    const expectedBasePrice = (env.db.prepare('SELECT base_price FROM products WHERE id = ?')
      .get(productA) as { base_price: number }).base_price;
    env.db.exec(
      `CREATE TRIGGER test_fail_product_price_update BEFORE UPDATE OF base_price ON products
       BEGIN SELECT RAISE(ABORT, 'test price update failure'); END`,
    );

    expect(() => create({
      productPriceUpdates: [{
        productId: productA,
        expectedBasePrice,
        basePrice: expectedBasePrice + 125,
      }],
    })).toThrow(/test price update failure/);
    expect(env.db.prepare('SELECT base_price FROM products WHERE id = ?').get(productA))
      .toEqual({ base_price: expectedBasePrice });
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM purchases').get()).toEqual({ n: 0 });
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get()).toEqual({ n: 0 });
  });

  it('отклоняет одинаковый товар в нескольких строках и заблокированный товар', () => {
    expect(() => create({
      lines: [
        { productId: productA, qty: '1', unitCost: 10 },
        { productId: productA, qty: '2', unitCost: 11 },
      ],
    })).toThrow('purchase.duplicate_product');
    const stocktakeId = uuidv7();
    env.db.prepare(
      `INSERT INTO stocktakes (id, number, warehouse_id, mode, status, user_id, started_at)
       VALUES (?, ?, ?, 'selected', 'active', ?, ?)`,
    ).run(stocktakeId, 'A-I-LOCK', env.warehouseId, adminId, new Date().toISOString());
    env.db.prepare(
      `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(uuidv7(), stocktakeId, env.warehouseId, productA, new Date().toISOString());
    expect(() => create()).toThrow('stock.locked_by_stocktake');
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM purchases').get() as { n: number }).n).toBe(0);
  });

  it('сторнирует только полностью восстановленный приход и блокирует повтор', () => {
    const { purchase } = create();
    const batch = env.db.prepare("SELECT id FROM batches WHERE source_id = ?").get(purchase.id) as { id: string };
    inTransaction(env.db, () => {
      appendStockMovement(env.db, {
        branchId: env.branchId,
        warehouseId: env.warehouseId,
        productId: productA,
        batchId: batch.id,
        type: 'SALE',
        qty: -2500,
        unitCost: 12345,
        docType: 'sale',
        docId: uuidv7(),
        userId: adminId,
      });
      appendStockMovement(env.db, {
        branchId: env.branchId,
        warehouseId: env.warehouseId,
        productId: productA,
        batchId: batch.id,
        type: 'RETURN',
        qty: 2500,
        unitCost: 12345,
        docType: 'return',
        docId: uuidv7(),
        userId: adminId,
      });
    });

    const result = reversePurchase(env.db, adminId, purchase.id);
    expect(result.purchase.status).toBe('reversed');
    expect(balanceForProduct()).toBe(0);
    expect(env.db.prepare('SELECT qty_left FROM batches WHERE id = ?').get(batch.id)).toEqual({ qty_left: 0 });
    expect((env.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE type = 'REVERSAL'").get() as { n: number }).n).toBe(1);
    expect(() => reversePurchase(env.db, adminId, purchase.id)).toThrow('purchase.already_reversed');
    expect(reconcileStockCaches(env.db)).toEqual([]);
  });

  it('не сторнирует документ, если хотя бы одна из его партий не восстановлена', () => {
    const productB = addProduct(env.db, 'P-B');
    const { purchase } = create({
      lines: [
        { productId: productA, qty: '1', unitCost: 100 },
        { productId: productB, qty: '1', unitCost: 200 },
      ],
    });
    const batch = env.db.prepare(
      "SELECT id FROM batches WHERE source_id = ? AND product_id = ?",
    ).get(purchase.id, productA) as { id: string };
    inTransaction(env.db, () => {
      appendStockMovement(env.db, {
        branchId: env.branchId,
        warehouseId: env.warehouseId,
        productId: productA,
        batchId: batch.id,
        type: 'SALE',
        qty: -500,
        unitCost: 100,
        docType: 'sale',
        docId: uuidv7(),
        userId: adminId,
      });
    });
    expect(() => reversePurchase(env.db, adminId, purchase.id))
      .toThrow('purchase.reversal_stock_not_restored');
    expect(env.db.prepare('SELECT status FROM purchases WHERE id = ?').get(purchase.id))
      .toEqual({ status: 'posted' });
    expect((env.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE type = 'REVERSAL'").get() as { n: number }).n).toBe(0);
  });

  it('пересчитывает кэши из журнала и обнаруживает расхождения', () => {
    create();
    env.db.prepare('UPDATE stock_cache SET qty = 1 WHERE product_id = ? AND warehouse_id = ?')
      .run(productA, env.warehouseId);
    env.db.prepare('UPDATE batches SET qty_left = 1 WHERE product_id = ?').run(productA);
    expect(reconcileStockCaches(env.db)).toHaveLength(2);
    inTransaction(env.db, () => rebuildStockCaches(env.db));
    expect(reconcileStockCaches(env.db)).toEqual([]);
    expect(balanceForProduct()).toBe(2500);
  });

  it('сохраняет согласованность после воспроизводимой серии вариативных приходов и FIFO-списаний', () => {
    let seed = 0x12345678;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    let available = 0;

    for (let index = 0; index < 30; index += 1) {
      if (index % 3 !== 2 || available === 0) {
        const qty = 100 + Math.floor(random() * 2400);
        const qtyText = `${Math.floor(qty / 1000)}.${String(qty % 1000).padStart(3, '0')}`;
        create({ lines: [{ productId: productA, qty: qtyText, unitCost: 100 + index }] });
        available += qty;
      } else {
        const qty = 1 + Math.floor(random() * Math.min(available, 2000));
        inTransaction(env.db, () => consumeFifo(env.db, {
          branchId: env.branchId,
          warehouseId: env.warehouseId,
          productId: productA,
          qty,
          movementType: 'SALE',
          docType: 'sale',
          docId: uuidv7(),
          userId: adminId,
        }));
        available -= qty;
      }
    }

    expect(balanceForProduct()).toBe(available);
    expect(env.db.prepare('SELECT qty FROM stock_cache WHERE product_id = ? AND warehouse_id = ?')
      .get(productA, env.warehouseId)).toEqual({ qty: available });
    expect(reconcileStockCaches(env.db)).toEqual([]);
  });
});

describe('FIFO', () => {
  it('списывает по received_at через три партии и возвращает точную себестоимость в тийинах', () => {
    const purchases = [
      create({ lines: [{ productId: productA, qty: '1.500', unitCost: 101 }] }),
      create({ lines: [{ productId: productA, qty: '2.000', unitCost: 203 }] }),
      create({ lines: [{ productId: productA, qty: '3.000', unitCost: 305 }] }),
    ];
    const batchIds = purchases.map(({ purchase }) =>
      (env.db.prepare('SELECT id FROM batches WHERE source_id = ?').get(purchase.id) as { id: string }).id);
    batchIds.forEach((id, index) => {
      env.db.prepare('UPDATE batches SET received_at = ? WHERE id = ?')
        .run(`2026-11-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`, id);
    });
    const allocations = inTransaction(env.db, () => consumeFifo(env.db, {
      branchId: env.branchId,
      warehouseId: env.warehouseId,
      productId: productA,
      qty: 3750,
      movementType: 'SALE',
      docType: 'sale',
      docId: uuidv7(),
      userId: adminId,
    }));
    expect(allocations.map(({ batchId, qty }) => ({ batchId, qty }))).toEqual([
      { batchId: batchIds[0], qty: 1500 },
      { batchId: batchIds[1], qty: 2000 },
      { batchId: batchIds[2], qty: 250 },
    ]);
    expect(allocations.reduce((total, allocation) => total + allocation.costTotal, 0)).toBe(634);
    expect(balanceForProduct()).toBe(2750);
    expect(reconcileStockCaches(env.db)).toEqual([]);
  });

  it('отказывает без остатка или при блокировке, не записывая частичное списание', () => {
    create({ lines: [{ productId: productA, qty: '1', unitCost: 100 }] });
    const before = (env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n;
    expect(() => inTransaction(env.db, () => consumeFifo(env.db, {
      branchId: env.branchId,
      warehouseId: env.warehouseId,
      productId: productA,
      qty: 1500,
      movementType: 'SALE',
      docType: 'sale',
      docId: uuidv7(),
      userId: adminId,
    }))).toThrow('stock.insufficient');
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n).toBe(before);
    const stocktakeId = uuidv7();
    env.db.prepare(
      `INSERT INTO stocktakes (id, number, warehouse_id, mode, status, user_id, started_at)
       VALUES (?, ?, ?, 'selected', 'active', ?, ?)`,
    ).run(stocktakeId, 'A-I-FIFO', env.warehouseId, adminId, new Date().toISOString());
    env.db.prepare(
      `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(uuidv7(), stocktakeId, env.warehouseId, productA, new Date().toISOString());
    expect(() => inTransaction(env.db, () => consumeFifo(env.db, {
      branchId: env.branchId,
      warehouseId: env.warehouseId,
      productId: productA,
      qty: 500,
      movementType: 'SALE',
      docType: 'sale',
      docId: uuidv7(),
      userId: adminId,
    }))).toThrow('stock.locked_by_stocktake');
    expect((env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n).toBe(before);
  });
});
