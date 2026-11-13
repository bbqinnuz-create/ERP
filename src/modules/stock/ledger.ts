import type { Db } from '../../db/connection';
import { uuidv7 } from '../../core/uuid';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'WRITE_OFF'
  | 'ADJUST_PLUS'
  | 'ADJUST_MINUS'
  | 'REVERSAL';

export interface StockMovementInput {
  branchId: string;
  warehouseId: string;
  productId: string;
  batchId?: string | null;
  type: StockMovementType;
  qty: number;
  unitCost?: number | null;
  unitPrice?: number | null;
  docType: string;
  docId: string;
  userId: string;
  reversesId?: string | null;
  note?: string | null;
  createdAt?: string;
}

export interface StockDiscrepancy {
  kind: 'batch' | 'stock_cache';
  productId: string;
  warehouseId: string;
  expectedQty: number;
  cachedQty: number | null;
  batchId?: string;
}

interface PairQtyRow {
  product_id: string;
  warehouse_id: string;
  qty: number;
}

function assertInTransaction(db: Db): void {
  if (!db.inTransaction) throw new Error('Stock ledger operations must run inside a transaction.');
}

function movementQtyForPair(db: Db, productId: string, warehouseId: string): number {
  const row = db.prepare(
    'SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements WHERE product_id = ? AND warehouse_id = ?',
  ).get(productId, warehouseId) as { qty: number };
  return row.qty;
}

function movementQtyForBatch(db: Db, batchId: string): number {
  const row = db.prepare(
    'SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements WHERE batch_id = ?',
  ).get(batchId) as { qty: number };
  return row.qty;
}

export function refreshStockCache(db: Db, productId: string, warehouseId: string): number {
  assertInTransaction(db);
  const qty = movementQtyForPair(db, productId, warehouseId);
  if (!Number.isSafeInteger(qty) || qty < 0) throw new Error('stock.balance_invalid');
  db.prepare(
    `INSERT INTO stock_cache (product_id, warehouse_id, qty, reserved) VALUES (?, ?, ?, 0)
     ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = excluded.qty`,
  ).run(productId, warehouseId, qty);
  return qty;
}

export function refreshBatchCache(db: Db, batchId: string): number {
  assertInTransaction(db);
  const batch = db.prepare('SELECT qty_in FROM batches WHERE id = ?').get(batchId) as
    | { qty_in: number }
    | undefined;
  if (!batch) throw new Error('stock.batch_not_found');
  const qty = movementQtyForBatch(db, batchId);
  if (!Number.isSafeInteger(qty) || qty < 0 || qty > batch.qty_in) {
    throw new Error('stock.batch_balance_invalid');
  }
  db.prepare('UPDATE batches SET qty_left = ? WHERE id = ?').run(qty, batchId);
  return qty;
}

export function appendStockMovement(db: Db, input: StockMovementInput): string {
  assertInTransaction(db);
  if (!Number.isSafeInteger(input.qty) || input.qty === 0) throw new Error('stock.quantity_invalid');
  if (
    (['PURCHASE', 'RETURN', 'ADJUST_PLUS'].includes(input.type) && input.qty < 0) ||
    (['SALE', 'WRITE_OFF', 'ADJUST_MINUS'].includes(input.type) && input.qty > 0)
  ) {
    throw new Error('stock.movement_sign_invalid');
  }
  if (!Number.isSafeInteger(input.unitCost ?? 0) || (input.unitCost ?? 0) < 0) {
    throw new Error('stock.unit_cost_invalid');
  }
  if (!Number.isSafeInteger(input.unitPrice ?? 0) || (input.unitPrice ?? 0) < 0) {
    throw new Error('stock.unit_price_invalid');
  }
  if (input.batchId) {
    const batch = db.prepare(
      'SELECT 1 FROM batches WHERE id = ? AND product_id = ? AND warehouse_id = ?',
    ).get(input.batchId, input.productId, input.warehouseId);
    if (!batch) throw new Error('stock.batch_scope_invalid');
  }
  const id = uuidv7();
  db.prepare(
    `INSERT INTO stock_movements
       (id, created_at, branch_id, warehouse_id, product_id, batch_id, type, qty,
        unit_cost, unit_price, doc_type, doc_id, user_id, reverses_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.createdAt ?? nowIso(),
    input.branchId,
    input.warehouseId,
    input.productId,
    input.batchId ?? null,
    input.type,
    input.qty,
    input.unitCost ?? null,
    input.unitPrice ?? null,
    input.docType,
    input.docId,
    input.userId,
    input.reversesId ?? null,
    input.note ?? null,
  );
  if (input.batchId) refreshBatchCache(db, input.batchId);
  refreshStockCache(db, input.productId, input.warehouseId);
  return id;
}

export function rebuildStockCaches(db: Db): void {
  inTransaction(db, () => {
    const pairQty = db.prepare(
      `SELECT product_id, warehouse_id, SUM(qty) AS qty
       FROM stock_movements GROUP BY product_id, warehouse_id`,
    ).all() as PairQtyRow[];
    const knownPairs = db.prepare(
      'SELECT product_id, warehouse_id FROM stock_cache',
    ).all() as Pick<PairQtyRow, 'product_id' | 'warehouse_id'>[];
    const qtyByPair = new Map(pairQty.map((row) => [`${row.product_id}\u0000${row.warehouse_id}`, row.qty]));
    const pairs = new Map<string, Pick<PairQtyRow, 'product_id' | 'warehouse_id'>>();
    for (const row of pairQty) pairs.set(`${row.product_id}\u0000${row.warehouse_id}`, row);
    for (const row of knownPairs) pairs.set(`${row.product_id}\u0000${row.warehouse_id}`, row);

    const upsert = db.prepare(
      `INSERT INTO stock_cache (product_id, warehouse_id, qty, reserved) VALUES (?, ?, ?, 0)
       ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = excluded.qty`,
    );
    for (const [key, pair] of pairs) {
      const qty = qtyByPair.get(key) ?? 0;
      if (!Number.isSafeInteger(qty) || qty < 0) throw new Error('stock.balance_invalid');
      upsert.run(pair.product_id, pair.warehouse_id, qty);
    }

    const batches = db.prepare('SELECT id FROM batches').all() as { id: string }[];
    for (const batch of batches) refreshBatchCache(db, batch.id);
  });
}

function collectStockCacheDiscrepancies(db: Db): StockDiscrepancy[] {
  const discrepancies: StockDiscrepancy[] = [];
  const pairQty = db.prepare(
    `SELECT product_id, warehouse_id, SUM(qty) AS qty
     FROM stock_movements GROUP BY product_id, warehouse_id`,
  ).all() as PairQtyRow[];
  const cacheRows = db.prepare(
    'SELECT product_id, warehouse_id, qty FROM stock_cache',
  ).all() as (PairQtyRow & { qty: number })[];
  const cacheByPair = new Map(cacheRows.map((row) => [`${row.product_id}\u0000${row.warehouse_id}`, row.qty]));
  const checkedPairs = new Set<string>();

  for (const row of pairQty) {
    const key = `${row.product_id}\u0000${row.warehouse_id}`;
    checkedPairs.add(key);
    const cachedQty = cacheByPair.get(key) ?? null;
    if (cachedQty !== row.qty) {
      discrepancies.push({
        kind: 'stock_cache',
        productId: row.product_id,
        warehouseId: row.warehouse_id,
        expectedQty: row.qty,
        cachedQty,
      });
    }
  }
  for (const row of cacheRows) {
    const key = `${row.product_id}\u0000${row.warehouse_id}`;
    if (!checkedPairs.has(key) && row.qty !== 0) {
      discrepancies.push({
        kind: 'stock_cache',
        productId: row.product_id,
        warehouseId: row.warehouse_id,
        expectedQty: 0,
        cachedQty: row.qty,
      });
    }
  }

  const batchRows = db.prepare(
    `SELECT b.id, b.product_id, b.warehouse_id, b.qty_left, b.qty_in,
            COALESCE(SUM(sm.qty), 0) AS expected_qty
     FROM batches b LEFT JOIN stock_movements sm ON sm.batch_id = b.id
     GROUP BY b.id`,
  ).all() as {
    id: string;
    product_id: string;
    warehouse_id: string;
    qty_left: number;
    qty_in: number;
    expected_qty: number;
  }[];
  for (const row of batchRows) {
    if (row.qty_left !== row.expected_qty || row.expected_qty < 0 || row.expected_qty > row.qty_in) {
      discrepancies.push({
        kind: 'batch',
        productId: row.product_id,
        warehouseId: row.warehouse_id,
        batchId: row.id,
        expectedQty: row.expected_qty,
        cachedQty: row.qty_left,
      });
    }
  }
  return discrepancies;
}

export function reconcileStockCaches(db: Db): StockDiscrepancy[] {
  return db.transaction(() => collectStockCacheDiscrepancies(db))();
}
