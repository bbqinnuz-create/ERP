import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db/connection';
import { uuidv7 } from '../src/core/uuid';
import { addCartLine, getActiveCart } from '../src/modules/carts/service';
import { hasPermission } from '../src/modules/auth/permissions';
import { inTransaction } from '../src/core/tx';
import { expireReservations } from '../src/modules/carts/held';
import { createPurchase } from '../src/modules/purchases/service';
import { saveReference } from '../src/modules/references/service';
import { createCounterOrder, createSale, payCounterOrder, quoteSale } from '../src/modules/sales/service';
import { addCustomer, addProduct, addUser, makeEnv } from './helpers';

function seedStock(
  db: ReturnType<typeof makeEnv>['db'],
  userId: string,
  warehouseId: string,
  productId: string,
  unitCost: number,
  qty = '3',
) {
  createPurchase(db, userId, {
    warehouseId,
    date: '2026-11-13',
    lines: [{ productId, qty, unitCost }],
  });
}

describe('sales and persistent carts', () => {
  it('creates a price-locked counter order and lets another cashier pay it exactly once', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const creatorId = addUser(db, 'counter-order-creator', 'admin');
      const collectorId = addUser(db, 'counter-order-collector', 'admin');
      const productId = addProduct(db, 'COUNTER-ORDER-1', 'шт', 20_000);
      seedStock(db, creatorId, warehouseId, productId, 1_000_000);
      const customerId = addCustomer(db, 'Counter order customer');
      addCartLine(db, creatorId, { productId, qty: '1' });
      const input = {
        idempotencyKey: 'counter-order-once',
        customerId,
        warehouseId,
        receiptLang: 'ru',
      };

      const created = createCounterOrder(db, creatorId, 'ru', input);
      expect(created.replayed).toBe(false);
      expect(created.order).toMatchObject({
        number: 'A-000001',
        customerId,
        total: 2_000_000,
        status: 'pending',
      });
      expect(createCounterOrder(db, creatorId, 'ru', input).replayed).toBe(true);
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(0);
      expect((db.prepare('SELECT COUNT(*) AS count FROM payments').get() as { count: number }).count).toBe(0);
      expect((db.prepare('SELECT COUNT(*) AS count FROM debt_ledger').get() as { count: number }).count).toBe(0);
      expect((db.prepare(
        "SELECT snapshot_json FROM print_jobs WHERE doc_type = 'counter_order' AND doc_id = ?",
      ).get(created.order.id) as { snapshot_json: string }).snapshot_json).toMatch('"reservationHours":2');

      db.prepare('UPDATE products SET base_price = ? WHERE id = ?').run(3_000_000, productId);
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as
        { id: string }).id;
      const payment = payCounterOrder(db, collectorId, 'ru', created.order.id, {
        methodId: cashMethodId,
        idempotencyKey: 'counter-order-payment-once',
      });
      expect(payment.receipt.sale).toMatchObject({
        number: created.order.number,
        total: 2_000_000,
      });
      expect(payment.replayed).toBe(false);
      expect(payCounterOrder(db, collectorId, 'ru', created.order.id, {
        methodId: cashMethodId,
        idempotencyKey: 'counter-order-payment-once',
      }).replayed).toBe(true);
      expect((db.prepare('SELECT status, sale_id FROM counter_orders WHERE id = ?').get(created.order.id) as
        { status: string; sale_id: string })).toMatchObject({ status: 'paid' });
      expect((db.prepare(
        'SELECT user_id FROM sales WHERE id = (SELECT sale_id FROM counter_orders WHERE id = ?)',
      ).get(created.order.id) as { user_id: string }).user_id).toBe(collectorId);
      expect((db.prepare('SELECT status FROM reservations WHERE cart_id = ?').get(
        (db.prepare('SELECT held_cart_id FROM counter_orders WHERE id = ?').get(created.order.id) as
          { held_cart_id: string }).held_cart_id,
      ) as { status: string }).status).toBe('consumed');
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) AS count FROM payments').get() as { count: number }).count).toBe(1);
    } finally {
      env.cleanup();
    }
  });

  it('expires unpaid counter orders and releases their stock reservation', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'counter-order-expiry', 'admin');
      const productId = addProduct(db, 'COUNTER-ORDER-EXPIRY', 'шт', 20_000);
      seedStock(db, ownerId, warehouseId, productId, 1_000_000);
      addCartLine(db, ownerId, { productId, qty: '1' });
      const { order } = createCounterOrder(db, ownerId, 'ru', {
        idempotencyKey: 'counter-order-expiry',
        warehouseId,
      });
      const future = new Date(Date.parse(order.expiresAt) + 1).toISOString();

      inTransaction(db, () => expireReservations(db, future));

      expect((db.prepare('SELECT status FROM counter_orders WHERE id = ?').get(order.id) as
        { status: string }).status).toBe('expired');
      const heldCartId = (db.prepare('SELECT held_cart_id FROM counter_orders WHERE id = ?').get(order.id) as
        { held_cart_id: string }).held_cart_id;
      expect((db.prepare('SELECT status FROM reservations WHERE cart_id = ?').get(heldCartId) as
        { status: string }).status).toBe('released');
      expect(() => payCounterOrder(db, ownerId, 'ru', order.id, {
        methodId: (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as
          { id: string }).id,
        idempotencyKey: 'counter-order-expired-payment',
      })).toThrowError(expect.objectContaining({ errorKey: 'counter_order.not_pending' }));
    } finally {
      env.cleanup();
    }
  });

  it('requires an explicit default warehouse when multiple warehouses are active', () => {
    const env = makeEnv();
    try {
      const { db, branchId } = env;
      const ownerId = addUser(db, 'warehouse-required', 'admin');
      saveReference(db, ownerId, 'warehouses', {
        branch_id: branchId,
        name: 'Second warehouse',
      });
      const productId = addProduct(db, 'WAREHOUSE-REQUIRED', 'шт');
      addCartLine(db, ownerId, { productId, qty: '1' });
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;

      expect(() => createSale(db, ownerId, 'ru', {
        idempotencyKey: 'warehouse-required',
        payments: [{ methodId: cashMethodId, amount: 1 }],
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'settings.default_warehouse_required',
      }));
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(0);
    } finally {
      env.cleanup();
    }
  });

  it('restores a cashier cart after reopening its temporary database', () => {
    const env = makeEnv();
    try {
      const ownerId = addUser(env.db, 'persistent-cart', 'cashier');
      const productId = addProduct(env.db, 'CART-PERSIST', 'шт');
      const saved = addCartLine(env.db, ownerId, { productId, qty: '1.25' });
      env.db.close();
      env.db = openDb({ path: join(env.dir, 'test.db') });

      expect(getActiveCart(env.db, ownerId)).toMatchObject({
        id: saved.id,
        lines: [{ productId, qty: 1250 }],
      });
    } finally {
      env.cleanup();
    }
  });

  it('merges cart lines and atomically posts mixed payments, debt, FIFO, audit and queues', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'sales-owner', 'admin');
      const productId = addProduct(db, 'SALE-1', 'шт', 20_000);
      seedStock(db, ownerId, warehouseId, productId, 1_000_000, '1');
      seedStock(db, ownerId, warehouseId, productId, 1_200_000, '2');
      const firstCart = addCartLine(db, ownerId, { productId, qty: '0.5' });
      const mergedCart = addCartLine(db, ownerId, { productId, qty: '1' });
      expect(mergedCart.lines).toHaveLength(1);
      expect(mergedCart.lines[0]).toMatchObject({ qty: 1500, active: true });

      const customerId = addCustomer(db, 'Клиент продажи');
      const methods = db.prepare('SELECT id, kind FROM payment_methods ORDER BY rowid').all() as
        Array<{ id: string; kind: string }>;
      const cashMethodId = methods.find((method) => method.kind === 'cash')!.id;
      const cardMethodId = methods.find((method) => method.kind === 'card')!.id;
      const input = {
        idempotencyKey: 'sale-once',
        customerId,
        receiptLang: 'uz',
        payments: [
          { methodId: cashMethodId, amount: 1_000_000, tendered: 1_200_000 },
          { methodId: cardMethodId, amount: 1_000_000 },
        ],
      };
      const result = createSale(db, ownerId, 'ru', input);

      expect(result.replayed).toBe(false);
      expect(result.receipt.sale).toMatchObject({
        number: 'A-000001',
        total: 3_000_000,
        paidTotal: 2_000_000,
        debtAmount: 1_000_000,
      });
      expect(result.receipt.payments).toEqual(expect.arrayContaining([
        expect.objectContaining({ amount: 1_000_000, tendered: 1_200_000, change: 200_000 }),
        expect.objectContaining({ amount: 1_000_000, tendered: null, change: 0 }),
      ]));
      expect((db.prepare('SELECT cost_total, profit FROM sales WHERE id = ?').get(result.receipt.sale.id) as
        { cost_total: number; profit: number })).toEqual({ cost_total: 1_600_000, profit: 1_400_000 });
      expect((db.prepare("SELECT amount FROM cash_ledger WHERE doc_type = 'sale'").get() as { amount: number }).amount)
        .toBe(1_000_000);
      expect((db.prepare("SELECT amount FROM debt_ledger WHERE type = 'DEBT_ADD'").get() as { amount: number }).amount)
        .toBe(1_000_000);
      expect((db.prepare("SELECT COUNT(*) AS count FROM stock_movements WHERE type = 'SALE'").get() as { count: number }).count)
        .toBe(2);
      expect((db.prepare('SELECT qty_left FROM batches WHERE product_id = ? ORDER BY created_at, id').all(productId) as
        Array<{ qty_left: number }>).map((batch) => batch.qty_left)).toEqual([0, 1500]);
      expect((db.prepare(
        'SELECT a.qty, a.unit_cost FROM sale_line_batch_allocations a JOIN batches b ON b.id = a.batch_id ORDER BY b.received_at, b.id',
      ).all() as
        Array<{ qty: number; unit_cost: number }>)).toEqual([
        { qty: 1000, unit_cost: 1_000_000 },
        { qty: 500, unit_cost: 1_200_000 },
      ]);
      expect((db.prepare('SELECT COUNT(*) AS count FROM print_jobs WHERE doc_id = ?').get(result.receipt.sale.id) as
        { count: number }).count).toBe(1);
      expect((db.prepare('SELECT lang FROM print_jobs WHERE doc_id = ?').get(result.receipt.sale.id) as
        { lang: string }).lang).toBe('uz');
      expect((db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'sale.create'").get() as { count: number }).count)
        .toBe(1);
      expect((db.prepare("SELECT COUNT(*) AS count FROM sync_outbox WHERE table_name = 'sales'").get() as { count: number }).count)
        .toBe(1);
      const nextCart = getActiveCart(db, ownerId);
      expect(nextCart.id).not.toBe(firstCart.id);
      expect(nextCart.lines).toEqual([]);

      const replay = createSale(db, ownerId, 'ru', input);
      expect(replay.replayed).toBe(true);
      expect(replay.receipt.sale.id).toBe(result.receipt.sale.id);
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
      expect((db.prepare("SELECT COUNT(*) AS count FROM payments WHERE purpose = 'sale'").get() as { count: number }).count)
        .toBe(2);
    } finally {
      env.cleanup();
    }
  });

  it('rolls back the number, FIFO movements and cart closure when price is below cost', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'cost-owner', 'admin');
      const productId = addProduct(db, 'SALE-COST', 'шт', 5_000);
      seedStock(db, ownerId, warehouseId, productId, 1_000_000);
      addCartLine(db, ownerId, { productId, qty: '1' });
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;

      expect(() => createSale(db, ownerId, 'ru', {
        idempotencyKey: 'below-cost',
        payments: [{ methodId: cashMethodId, amount: 500_000 }],
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'sale.below_cost',
      }));

      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(0);
      expect((db.prepare("SELECT COUNT(*) AS count FROM stock_movements WHERE type = 'SALE'").get() as { count: number }).count)
        .toBe(0);
      expect((db.prepare('SELECT COUNT(*) AS count FROM idempotency_keys').get() as { count: number }).count).toBe(0);
      expect((db.prepare("SELECT last_value FROM counters WHERE name = 'sale'").get() as { last_value?: number } | undefined))
        .toBeUndefined();
      expect(getActiveCart(db, ownerId).lines).toHaveLength(1);
    } finally {
      env.cleanup();
    }
  });

  it('rejects discounts beyond the cashier limit during server-side quote calculation', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const cashierId = addUser(db, 'limited-cashier', 'cashier');
      const productId = addProduct(db, 'SALE-LIMIT', 'шт', 10_000);
      seedStock(db, cashierId, warehouseId, productId, 100_000);
      addCartLine(db, cashierId, { productId, qty: '1' });
      db.prepare(
        `INSERT INTO user_permissions (user_id, permission, value) VALUES
         (?, 'discount_check', 1), (?, 'discount_check_limit_bp', 500)`,
      ).run(cashierId, cashierId);
      expect(hasPermission(db, cashierId, 'discount_check')).toBe(true);

      expect(() => quoteSale(db, cashierId, {
        checkDiscount: { kind: 'percent', valueBp: 501 },
      })).toThrowError(expect.objectContaining({
        status: 400,
        errorKey: 'sale.discount_limit_exceeded',
      }));
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(0);
      expect((db.prepare("SELECT COUNT(*) AS count FROM stock_movements WHERE type = 'SALE'").get() as { count: number }).count)
        .toBe(0);
    } finally {
      env.cleanup();
    }
  });

  it('persists automatic and receipt discounts with the final server-calculated amount', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'discount-owner', 'admin');
      const productId = addProduct(db, 'SALE-DISCOUNT', 'шт', 20_000);
      seedStock(db, ownerId, warehouseId, productId, 1_000_000);
      const ruleId = uuidv7();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO price_rules
           (id, type, product_id, percent_bp, created_at, updated_at)
         VALUES (?, 'promo', ?, 1000, ?, ?)`,
      ).run(ruleId, productId, now, now);
      addCartLine(db, ownerId, { productId, qty: '1' });
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;

      const result = createSale(db, ownerId, 'ru', {
        idempotencyKey: 'discounted-sale',
        checkDiscount: { kind: 'percent', valueBp: 100 },
        payments: [{ methodId: cashMethodId, amount: 1_782_000 }],
      });

      expect(result.receipt.sale.total).toBe(1_782_000);
      expect((db.prepare('SELECT price_rule_id, line_discount, line_total FROM sale_lines').get() as {
        price_rule_id: string;
        line_discount: number;
        line_total: number;
      })).toEqual({ price_rule_id: ruleId, line_discount: 218_000, line_total: 1_782_000 });
      expect((db.prepare(
        'SELECT kind, amount, percent_bp FROM sale_discounts ORDER BY kind',
      ).all() as Array<{ kind: string; amount: number; percent_bp: number }>)).toEqual([
        { kind: 'check', amount: 18_000, percent_bp: 100 },
        { kind: 'promo', amount: 200_000, percent_bp: 1000 },
      ]);
    } finally {
      env.cleanup();
    }
  });

  it('refuses stocktake-locked goods and rolls the entire checkout back', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'locked-sale-owner', 'admin');
      const productId = addProduct(db, 'SALE-LOCK', 'шт', 20_000);
      seedStock(db, ownerId, warehouseId, productId, 1_000_000);
      addCartLine(db, ownerId, { productId, qty: '1' });
      const stocktakeId = uuidv7();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO stocktakes (id, number, warehouse_id, mode, status, user_id, started_at)
         VALUES (?, 'A-I-LOCK', ?, 'selected', 'active', ?, ?)`,
      ).run(stocktakeId, warehouseId, ownerId, now);
      db.prepare(
        `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(uuidv7(), stocktakeId, warehouseId, productId, now);
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;

      expect(() => createSale(db, ownerId, 'ru', {
        idempotencyKey: 'locked-sale',
        payments: [{ methodId: cashMethodId, amount: 2_000_000 }],
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'stock.locked_by_stocktake',
      }));
      expect((db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(0);
      expect((db.prepare("SELECT COUNT(*) AS count FROM stock_movements WHERE type = 'SALE'").get() as { count: number }).count)
        .toBe(0);
      expect(getActiveCart(db, ownerId).lines).toHaveLength(1);
    } finally {
      env.cleanup();
    }
  });
});
