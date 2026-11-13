import type { Db } from '../../db/connection';
import { mulQty } from '../../core/money';
import { assertPositiveQty } from '../../core/qty';
import { AuthError } from '../auth/service';
import { appendStockMovement } from '../stock/ledger';

export interface FifoConsumptionInput {
  branchId: string;
  warehouseId: string;
  productId: string;
  qty: number;
  movementType: 'SALE' | 'WRITE_OFF';
  docType: 'sale' | 'write_off';
  docId: string;
  userId: string;
  unitPrice?: number | null;
  note?: string | null;
}

export interface FifoAllocation {
  batchId: string;
  qty: number;
  unitCost: number;
  costTotal: number;
  movementId: string;
}

interface FifoBatchRow {
  id: string;
  qty_in: number;
  unit_cost: number;
  ledger_qty: number;
}

function assertNoStocktakeLock(db: Db, warehouseId: string, productId: string): void {
  const lock = db.prepare(
    `SELECT 1 FROM stocktake_locks
     WHERE warehouse_id = ? AND released_at IS NULL
       AND (product_id IS NULL OR product_id = ?)
     LIMIT 1`,
  ).get(warehouseId, productId);
  if (lock) throw new AuthError(409, 'stock.locked_by_stocktake');
}

function safeSum(values: number[], errorKey: string): number {
  if (values.some((value) => !Number.isSafeInteger(value))) throw new AuthError(409, errorKey);
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new AuthError(409, errorKey);
  return Number(total);
}

function costForQty(qty: number, unitCost: number): number {
  try {
    return mulQty(qty, unitCost);
  } catch {
    throw new AuthError(409, 'fifo.cost_out_of_range');
  }
}

export function consumeFifo(db: Db, input: FifoConsumptionInput): FifoAllocation[] {
  if (!db.inTransaction) throw new Error('consumeFifo must run inside the business operation transaction.');
  try {
    assertPositiveQty(input.qty);
    if (!Number.isSafeInteger(input.qty)) throw new Error('quantity_out_of_range');
  } catch {
    throw new AuthError(400, 'validation.invalid_quantity');
  }
  if (
    (input.movementType === 'SALE' && input.docType !== 'sale') ||
    (input.movementType === 'WRITE_OFF' && input.docType !== 'write_off')
  ) {
    throw new Error('fifo.document_type_mismatch');
  }
  if (input.unitPrice !== undefined && input.unitPrice !== null &&
      (!Number.isSafeInteger(input.unitPrice) || input.unitPrice < 0)) {
    throw new AuthError(400, 'validation.invalid_unit_price');
  }

  {
    assertNoStocktakeLock(db, input.warehouseId, input.productId);
    const warehouse = db.prepare(
      `SELECT w.branch_id FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(input.warehouseId) as { branch_id: string } | undefined;
    const product = db.prepare('SELECT 1 FROM products WHERE id = ? AND active = 1').get(input.productId);
    if (!warehouse || !product || warehouse.branch_id !== input.branchId) {
      throw new AuthError(400, 'validation.invalid_product_or_warehouse');
    }
    const stock = db.prepare(
      `SELECT COALESCE(SUM(qty), 0) AS qty
       FROM stock_movements WHERE product_id = ? AND warehouse_id = ?`,
    ).get(input.productId, input.warehouseId) as { qty: number };
    const reservedRow = db.prepare(
      `SELECT COALESCE(SUM(qty), 0) AS qty FROM reservations
       WHERE product_id = ? AND warehouse_id = ? AND status = 'active'`,
    ).get(input.productId, input.warehouseId) as { qty: number };
    if (!Number.isSafeInteger(stock.qty) || !Number.isSafeInteger(reservedRow.qty) || stock.qty < 0 || reservedRow.qty < 0) {
      throw new Error('fifo.stock_balance_invalid');
    }
    if (stock.qty - reservedRow.qty < input.qty) {
      throw new AuthError(409, 'stock.insufficient');
    }

    const batches = db.prepare(
      `SELECT b.id, b.qty_in, b.unit_cost,
              COALESCE(SUM(m.qty), 0) AS ledger_qty
       FROM batches b
       LEFT JOIN stock_movements m ON m.batch_id = b.id
       WHERE b.product_id = ? AND b.warehouse_id = ?
       GROUP BY b.id
       ORDER BY b.received_at, b.id`,
    ).all(input.productId, input.warehouseId) as FifoBatchRow[];

    if (batches.some((batch) =>
      !Number.isSafeInteger(batch.qty_in) || !Number.isSafeInteger(batch.unit_cost) ||
      !Number.isSafeInteger(batch.ledger_qty) || batch.qty_in <= 0 ||
      batch.ledger_qty < 0 || batch.ledger_qty > batch.qty_in)) {
      throw new Error('fifo.batch_ledger_invalid');
    }
    const batchQty = safeSum(batches.map((batch) => batch.ledger_qty), 'stock.balance_invalid');
    if (batchQty < input.qty) throw new AuthError(409, 'stock.insufficient');

    let remaining = input.qty;
    const allocations: FifoAllocation[] = [];
    for (const batch of batches) {
      if (remaining === 0) break;
      if (batch.ledger_qty === 0) continue;
      const qty = Math.min(remaining, batch.ledger_qty);
      const movementId = appendStockMovement(db, {
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        batchId: batch.id,
        type: input.movementType,
        qty: -qty,
        unitCost: batch.unit_cost,
        unitPrice: input.unitPrice,
        docType: input.docType,
        docId: input.docId,
        userId: input.userId,
        note: input.note,
      });
      allocations.push({
        batchId: batch.id,
        qty,
        unitCost: batch.unit_cost,
        costTotal: costForQty(qty, batch.unit_cost),
        movementId,
      });
      remaining -= qty;
    }
    if (remaining !== 0) throw new AuthError(409, 'stock.insufficient');
    safeSum(allocations.map((allocation) => allocation.costTotal), 'fifo.cost_out_of_range');
    return allocations;
  }
}
