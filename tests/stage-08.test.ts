import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { uuidv7 } from '../src/core/uuid';
import { openDb } from '../src/db/connection';
import { migrate } from '../src/db/migrate';
import { addCartLine } from '../src/modules/carts/service';
import {
  holdActiveCart,
  reserveHeldCart,
  setReservationQuantity,
} from '../src/modules/carts/held';
import { collectDebtPayment } from '../src/modules/debts/service';
import { createPurchase } from '../src/modules/purchases/service';
import { createReturn, quoteReturn } from '../src/modules/returns/service';
import { createSale } from '../src/modules/sales/service';
import { completeStocktake, saveStocktakeCounts, startStocktake } from '../src/modules/stocktakes/service';
import { createWriteOff } from '../src/modules/writeoffs/service';
import { addCustomer, addProduct, addUser, makeEnv, type TestEnv } from './helpers';

let env: TestEnv;
let adminId: string;

beforeEach(() => {
  env = makeEnv();
  adminId = addUser(env.db, 'stage8-admin', 'admin');
});

afterEach(() => env.cleanup());

function purchase(productId: string, qty: string, unitCost: number) {
  return createPurchase(env.db, adminId, {
    warehouseId: env.warehouseId,
    date: '2026-11-13',
    lines: [{ productId, qty, unitCost }],
  });
}

function cashMethod(): string {
  return (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
}

describe('этап 8: возвраты, списания, инвентаризация и резервы', () => {
  it('частично возвращает чек по исходным партиям, сначала погашает его долг и выплачивает остаток наличными', () => {
    const productId = addProduct(env.db, 'RETURN-1', 'шт', 15_000);
    const first = purchase(productId, '1', 100_000);
    const second = purchase(productId, '1.5', 200_000);
    const customerId = addCustomer(env.db);
    addCartLine(env.db, adminId, { productId, qty: '2.5' });
    const sale = createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage8-return-sale',
      customerId,
      payments: [],
    });
    expect(sale.receipt.sale.debtAmount).toBe(3_750_000);
    const cardMethod = (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'card'").get() as { id: string }).id;
    collectDebtPayment(env.db, adminId, {
      customerId,
      methodId: cardMethod,
      amount: 1_000_000,
      idempotencyKey: 'stage8-return-debt-payment',
    }, 'ru');
    const saleLine = env.db.prepare('SELECT id FROM sale_lines WHERE sale_id = ?').get(sale.receipt.sale.id) as { id: string };

    expect(quoteReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      lines: [{ saleLineId: saleLine.id, qty: '1' }],
    })).toEqual({ totalRefund: 1_500_000, debtOffset: 1_500_000, payout: 0 });
    const firstReturn = createReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      reason: 'Повреждена упаковка',
      idempotencyKey: 'stage8-return-first',
      lines: [{ saleLineId: saleLine.id, qty: '1' }],
      payments: [],
    });
    expect(firstReturn).toMatchObject({ totalRefund: 1_500_000, debtOffset: 1_500_000, payout: 0 });

    const secondReturn = createReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      reason: 'Возврат остатка',
      idempotencyKey: 'stage8-return-second',
      receiptLang: 'uz',
      lines: [{ saleLineId: saleLine.id, qty: '1.5' }],
      payments: [{ methodId: cashMethod(), amount: 1_000_000 }],
    });
    expect(secondReturn).toMatchObject({ totalRefund: 2_250_000, debtOffset: 1_250_000, payout: 1_000_000 });
    expect((env.db.prepare('SELECT SUM(amount) AS balance FROM debt_ledger WHERE sale_id = ?')
      .get(sale.receipt.sale.id) as { balance: number }).balance).toBe(0);
    expect((env.db.prepare("SELECT amount FROM cash_ledger WHERE doc_type = 'return'").get() as { amount: number }).amount)
      .toBe(-1_000_000);
    expect((env.db.prepare(
      'SELECT qty_left FROM batches WHERE id IN (SELECT id FROM batches WHERE source_id IN (?, ?)) ORDER BY received_at',
    ).all(first.purchase.id, second.purchase.id) as Array<{ qty_left: number }>).map((row) => row.qty_left))
      .toEqual([1000, 1500]);
    const printJob = env.db.prepare(
      "SELECT doc_type, lang, snapshot_json FROM print_jobs WHERE doc_id = ?",
    ).get(secondReturn.id) as { doc_type: string; lang: string; snapshot_json: string };
    expect(printJob.doc_type).toBe('return');
    expect(printJob.lang).toBe('uz');
    expect(JSON.parse(printJob.snapshot_json).documentLabel).toBe('return');
    expect(() => createReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      reason: 'Слишком много',
      idempotencyKey: 'stage8-return-over',
      lines: [{ saleLineId: saleLine.id, qty: '0.001' }],
      payments: [],
    })).toThrowError(expect.objectContaining({ errorKey: 'return.quantity_exceeded' }));
  });

  it('списывает строго по FIFO и не обходит блокировку инвентаризации', () => {
    const productId = addProduct(env.db, 'WRITEOFF-1');
    const first = purchase(productId, '1', 100_000);
    const second = purchase(productId, '1', 200_000);
    const result = createWriteOff(env.db, adminId, {
      warehouseId: env.warehouseId,
      reason: 'damaged',
      note: 'Повреждение',
      lines: [{ productId, qty: '1.5' }],
    });
    expect(result.lines[0]).toMatchObject({ qty: 1500, costTotal: 200_000 });
    const batchRows = env.db.prepare(
      `SELECT source_id, qty_left FROM batches WHERE source_id IN (?, ?) ORDER BY received_at`,
    ).all(first.purchase.id, second.purchase.id) as Array<{ source_id: string; qty_left: number }>;
    expect(batchRows.map((row) => row.qty_left)).toEqual([0, 500]);

    const stocktakeId = uuidv7();
    env.db.prepare(
      `INSERT INTO stocktakes (id, number, warehouse_id, mode, status, user_id, started_at)
       VALUES (?, ?, ?, 'selected', 'active', ?, ?)`,
    ).run(stocktakeId, 'A-I-WRITELOCK', env.warehouseId, adminId, new Date().toISOString());
    env.db.prepare(
      `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(uuidv7(), stocktakeId, env.warehouseId, productId, new Date().toISOString());
    expect(() => createWriteOff(env.db, adminId, {
      warehouseId: env.warehouseId,
      reason: 'other',
      lines: [{ productId, qty: '0.1' }],
    })).toThrowError(expect.objectContaining({ errorKey: 'stock.locked_by_stocktake' }));
  });

  it('снимает снимок, блокирует движения, применяет FIFO-недостачу и добавляет излишек по ручной себестоимости', () => {
    const productId = addProduct(env.db, 'STOCKTAKE-1');
    purchase(productId, '2', 100_000);
    const started = startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [productId],
    });
    expect(started.lines).toBe(1);
    expect(() => purchase(productId, '1', 100_000)).toThrowError(expect.objectContaining({
      errorKey: 'stock.locked_by_stocktake',
    }));
    saveStocktakeCounts(env.db, adminId, started.id, [{ productId, qtyCounted: '1.5' }]);
    expect(completeStocktake(env.db, adminId, started.id)).toMatchObject({ status: 'completed', movements: 1 });
    expect((env.db.prepare(
      'SELECT qty FROM stock_cache WHERE product_id = ? AND warehouse_id = ?',
    ).get(productId, env.warehouseId) as { qty: number }).qty).toBe(1500);

    const surplusProduct = addProduct(env.db, 'STOCKTAKE-SURPLUS');
    const next = startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [surplusProduct],
    });
    saveStocktakeCounts(env.db, adminId, next.id, [{
      productId: surplusProduct,
      qtyCounted: '2',
      manualUnitCost: 12345,
    }]);
    completeStocktake(env.db, adminId, next.id);
    const batch = env.db.prepare(
      'SELECT source_type, source_id, qty_in, unit_cost FROM batches WHERE product_id = ?',
    ).get(surplusProduct) as { source_type: string; source_id: string; qty_in: number; unit_cost: number };
    expect(batch).toMatchObject({ source_type: 'stocktake', source_id: next.id, qty_in: 2000, unit_cost: 12345 });
    expect((env.db.prepare(
      "SELECT type, qty FROM stock_movements WHERE doc_type = 'stocktake' AND doc_id = ?",
    ).get(next.id) as { type: string; qty: number })).toEqual({ type: 'ADJUST_PLUS', qty: 2000 });
  });

  it('сохраняет активную инвентаризацию после перезапуска и не допускает вторую на том же складе', () => {
    const productId = addProduct(env.db, 'STOCKTAKE-RESTART');
    purchase(productId, '2', 100_000);
    const started = startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [productId],
    });
    saveStocktakeCounts(env.db, adminId, started.id, [{ productId, qtyCounted: '1.5' }]);

    expect(() => startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [addProduct(env.db, 'STOCKTAKE-SECOND')],
    })).toThrowError(expect.objectContaining({ errorKey: 'stocktake.already_active' }));

    env.db.close();
    env.db = openDb({ path: join(env.dir, 'test.db') });
    migrate(env.db);
    expect(env.db.prepare('SELECT status FROM stocktakes WHERE id = ?').get(started.id))
      .toEqual({ status: 'active' });
    expect(env.db.prepare(
      'SELECT released_at FROM stocktake_locks WHERE stocktake_id = ? AND product_id = ?',
    ).get(started.id, productId)).toEqual({ released_at: null });
    expect(completeStocktake(env.db, adminId, started.id)).toMatchObject({ status: 'completed', movements: 1 });
  });

  it('откатывает все корректировки и блокировки, если завершение инвентаризации не может провести одну строку', () => {
    const deficitProduct = addProduct(env.db, 'STOCKTAKE-ATOMIC-1');
    const surplusProduct = addProduct(env.db, 'STOCKTAKE-ATOMIC-2');
    purchase(deficitProduct, '2', 100_000);
    const started = startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [deficitProduct, surplusProduct],
    });
    saveStocktakeCounts(env.db, adminId, started.id, [
      { productId: deficitProduct, qtyCounted: '1' },
      { productId: surplusProduct, qtyCounted: '1' },
    ]);

    expect(() => completeStocktake(env.db, adminId, started.id)).toThrowError(
      expect.objectContaining({ errorKey: 'stocktake.manual_cost_required' }),
    );
    expect(env.db.prepare('SELECT status FROM stocktakes WHERE id = ?').get(started.id))
      .toEqual({ status: 'active' });
    expect(env.db.prepare(
      "SELECT COUNT(*) AS count FROM stock_movements WHERE doc_type = 'stocktake' AND doc_id = ?",
    ).get(started.id)).toEqual({ count: 0 });
    expect(env.db.prepare(
      'SELECT COUNT(*) AS count FROM stocktake_locks WHERE stocktake_id = ? AND released_at IS NULL',
    ).get(started.id)).toEqual({ count: 2 });
  });

  it('сохраняет и резервирует корзину, затем атомарно закрывает её продажей и потребляет резерв', () => {
    const productId = addProduct(env.db, 'HELD-1', 'шт');
    purchase(productId, '3', 100_000);
    const customerId = addCustomer(env.db);
    addCartLine(env.db, adminId, { productId, qty: '2' });
    const held = holdActiveCart(env.db, adminId, customerId);
    reserveHeldCart(env.db, adminId, held.id, env.warehouseId);
    expect((env.db.prepare(
      'SELECT reserved FROM stock_cache WHERE product_id = ? AND warehouse_id = ?',
    ).get(productId, env.warehouseId) as { reserved: number }).reserved).toBe(2000);

    const result = createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage8-held-sale',
      heldCartId: held.id,
      payments: [{ methodId: cashMethod(), amount: 3_000_000 }],
    });
    expect((env.db.prepare('SELECT cart_id FROM sales WHERE id = ?').get(result.receipt.sale.id) as
      { cart_id: string }).cart_id).toBe(held.id);
    expect((env.db.prepare('SELECT status, sale_id FROM held_carts WHERE id = ?').get(held.id) as
      { status: string; sale_id: string }).status).toBe('closed');
    expect((env.db.prepare("SELECT status FROM reservations WHERE cart_id = ?").get(held.id) as
      { status: string }).status).toBe('consumed');
    expect((env.db.prepare(
      'SELECT qty, reserved FROM stock_cache WHERE product_id = ? AND warehouse_id = ?',
    ).get(productId, env.warehouseId) as { qty: number; reserved: number })).toEqual({ qty: 1000, reserved: 0 });
  });

  it('показывает дефицит резерва после инвентаризации и позволяет уполномоченному пользователю освободить его', () => {
    const productId = addProduct(env.db, 'RESERVE-DEFICIT', 'шт');
    purchase(productId, '3', 100_000);
    const customerId = addCustomer(env.db);
    addCartLine(env.db, adminId, { productId, qty: '2' });
    const held = holdActiveCart(env.db, adminId, customerId);
    const reservedCart = reserveHeldCart(env.db, adminId, held.id, env.warehouseId);
    const reservationId = reservedCart.reservations[0]!.id;

    const stocktake = startStocktake(env.db, adminId, {
      warehouseId: env.warehouseId,
      mode: 'selected',
      productIds: [productId],
    });
    saveStocktakeCounts(env.db, adminId, stocktake.id, [{ productId, qtyCounted: '1' }]);
    expect(completeStocktake(env.db, adminId, stocktake.id).reserveDeficits).toBe(1);
    expect((env.db.prepare(
      'SELECT qty, reserved FROM stock_cache WHERE product_id = ? AND warehouse_id = ?',
    ).get(productId, env.warehouseId) as { qty: number; reserved: number })).toEqual({ qty: 1000, reserved: 2000 });

    addCartLine(env.db, adminId, { productId, qty: '1' });
    expect(() => createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage8-blocked-sale',
      payments: [{ methodId: cashMethod(), amount: 1_500_000 }],
    })).toThrowError(expect.objectContaining({ errorKey: 'stock.insufficient' }));
    setReservationQuantity(env.db, adminId, reservationId, '0');
    expect((env.db.prepare(
      'SELECT reserved FROM stock_cache WHERE product_id = ? AND warehouse_id = ?',
    ).get(productId, env.warehouseId) as { reserved: number }).reserved).toBe(0);
    expect(createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage8-after-release-sale',
      payments: [{ methodId: cashMethod(), amount: 1_500_000 }],
    }).receipt.sale.total).toBe(1_500_000);
  });

  it('не разрешает зачислить возврат без выплаты оставшейся суммы', () => {
    const productId = addProduct(env.db, 'RETURN-PAYMENT-1');
    purchase(productId, '1', 100_000);
    addCartLine(env.db, adminId, { productId, qty: '1' });
    const sale = createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage8-payment-sale',
      payments: [{ methodId: cashMethod(), amount: 1_500_000 }],
    });
    const line = env.db.prepare('SELECT id FROM sale_lines WHERE sale_id = ?').get(sale.receipt.sale.id) as { id: string };
    expect(() => createReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      reason: 'Причина',
      idempotencyKey: 'stage8-payment-return',
      lines: [{ saleLineId: line.id, qty: '1' }],
      payments: [],
    })).toThrowError(expect.objectContaining({ errorKey: 'return.payment_total_mismatch' }));
  });
});
