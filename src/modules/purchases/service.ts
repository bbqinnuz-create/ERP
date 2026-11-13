import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nextDocNumber } from '../../core/counters';
import { mulQty } from '../../core/money';
import { parseQty } from '../../core/qty';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { appendStockMovement } from '../stock/ledger';

export interface PurchaseLineInput {
  productId: string;
  qty: number | string;
  unitCost: number;
}

export interface PurchaseProductPriceUpdate {
  productId: string;
  basePrice: number;
  expectedBasePrice: number;
}

export interface CreatePurchaseInput {
  warehouseId: string;
  date: string;
  supplier?: string | null;
  note?: string | null;
  lines: PurchaseLineInput[];
  productPriceUpdates?: PurchaseProductPriceUpdate[];
}

interface NormalizedPurchaseLine {
  productId: string;
  qty: number;
  unitCost: number;
}

type NormalizedProductPriceUpdate = PurchaseProductPriceUpdate;

interface PurchaseLineRow extends NormalizedPurchaseLine {
  id: string;
  sku: string;
  name: string;
  unit: string;
  costTotal: number;
}

interface PurchaseRow {
  id: string;
  number: string;
  warehouse_id: string;
  warehouse_name: string;
  supplier: string | null;
  date: string;
  user_id: string;
  user_name: string;
  total_cost: number;
  note: string | null;
  status: 'posted' | 'reversed';
  created_at: string;
}

function text(value: unknown, key: string, maximum: number, optional: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw new AuthError(400, `validation.invalid_${key}`);
  }
  if (typeof value !== 'string') throw new AuthError(400, `validation.invalid_${key}`);
  const normalized = value.trim();
  if ((!optional && normalized.length === 0) || normalized.length > maximum) {
    throw new AuthError(400, `validation.invalid_${key}`);
  }
  return normalized || null;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AuthError(400, 'validation.invalid_date');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AuthError(400, 'validation.invalid_date');
  }
  return value;
}

function normalizeLines(value: unknown): NormalizedPurchaseLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) {
    throw new AuthError(400, 'validation.invalid_purchase_lines');
  }
  const productIds = new Set<string>();
  return value.map((line) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new AuthError(400, 'validation.invalid_purchase_line');
    }
    const row = line as Record<string, unknown>;
    const allowed = new Set(['productId', 'qty', 'unitCost']);
    if (Object.keys(row).some((key) => !allowed.has(key))) {
      throw new AuthError(400, 'validation.unknown_field');
    }
    if (typeof row.productId !== 'string' || row.productId.length < 1 || row.productId.length > 64) {
      throw new AuthError(400, 'validation.invalid_product');
    }
    if (productIds.has(row.productId)) throw new AuthError(400, 'purchase.duplicate_product');
    productIds.add(row.productId);
    let qty: number;
    try {
      qty = parseQty(row.qty as string | number);
    } catch {
      throw new AuthError(400, 'validation.invalid_quantity');
    }
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new AuthError(400, 'validation.invalid_quantity');
    if (!Number.isSafeInteger(row.unitCost) || (row.unitCost as number) < 0) {
      throw new AuthError(400, 'validation.invalid_unit_cost');
    }
    return { productId: row.productId, qty, unitCost: row.unitCost as number };
  });
}

function normalizeInput(input: unknown): {
  warehouseId: string;
  date: string;
  supplier: string | null;
  note: string | null;
  lines: NormalizedPurchaseLine[];
  productPriceUpdates: NormalizedProductPriceUpdate[];
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  const allowed = new Set(['warehouseId', 'date', 'supplier', 'note', 'lines', 'productPriceUpdates']);
  if (Object.keys(row).some((key) => !allowed.has(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.warehouseId !== 'string' || row.warehouseId.length < 1 || row.warehouseId.length > 64) {
    throw new AuthError(400, 'validation.invalid_warehouse');
  }
  const lines = normalizeLines(row.lines);
  const productPriceUpdates = row.productPriceUpdates === undefined
    ? []
    : normalizeProductPriceUpdates(row.productPriceUpdates, lines);
  return {
    warehouseId: row.warehouseId,
    date: normalizeDate(row.date),
    supplier: text(row.supplier, 'supplier', 200, true),
    note: text(row.note, 'note', 1000, true),
    lines,
    productPriceUpdates,
  };
}

function normalizeProductPriceUpdates(value: unknown, lines: NormalizedPurchaseLine[]): NormalizedProductPriceUpdate[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new AuthError(400, 'purchase.invalid_product_price_updates');
  }
  const lineProductIds = new Set(lines.map((line) => line.productId));
  const updatedProductIds = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AuthError(400, 'purchase.invalid_product_price_update');
    }
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => !['productId', 'basePrice', 'expectedBasePrice'].includes(key)) ||
        typeof row.productId !== 'string' || row.productId.length < 1 || row.productId.length > 64 ||
        !Number.isSafeInteger(row.basePrice) || (row.basePrice as number) < 0 ||
        !Number.isSafeInteger(row.expectedBasePrice) || (row.expectedBasePrice as number) < 0) {
      throw new AuthError(400, 'purchase.invalid_product_price_update');
    }
    if (!lineProductIds.has(row.productId) || updatedProductIds.has(row.productId)) {
      throw new AuthError(400, 'purchase.invalid_product_price_update');
    }
    updatedProductIds.add(row.productId);
    return {
      productId: row.productId,
      basePrice: row.basePrice as number,
      expectedBasePrice: row.expectedBasePrice as number,
    };
  });
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

function assertSafeTotal(total: bigint): number {
  if (total < 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AuthError(400, 'validation.invalid_total');
  }
  return Number(total);
}

function purchaseLineCost(qty: number, unitCost: number): number {
  try {
    return mulQty(qty, unitCost);
  } catch {
    throw new AuthError(400, 'validation.invalid_total');
  }
}

function addSyncOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

function addPurchaseOutbox(db: Db, id: string, lineIds: string[], batchIds: string[], movementIds: string[], at: string): void {
  addSyncOutbox(db, 'purchases', id, at);
  for (const lineId of lineIds) addSyncOutbox(db, 'purchase_lines', lineId, at);
  for (const batchId of batchIds) addSyncOutbox(db, 'batches', batchId, at);
  for (const movementId of movementIds) addSyncOutbox(db, 'stock_movements', movementId, at);
}

function purchaseHeader(db: Db, id: string): PurchaseRow | undefined {
  return db.prepare(
    `SELECT p.id, p.number, p.warehouse_id, w.name AS warehouse_name,
            p.supplier, p.date, p.user_id, u.full_name AS user_name,
            p.total_cost, p.note, p.status, p.created_at
     FROM purchases p
     JOIN warehouses w ON w.id = p.warehouse_id
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
  ).get(id) as PurchaseRow | undefined;
}

function purchaseLines(db: Db, id: string): PurchaseLineRow[] {
  const rows = db.prepare(
    `SELECT pl.id, pl.product_id AS productId, pl.qty, pl.unit_cost AS unitCost,
            p.sku, p.name_ru AS name, p.unit
     FROM purchase_lines pl JOIN products p ON p.id = pl.product_id
     WHERE pl.purchase_id = ? ORDER BY pl.rowid`,
  ).all(id) as Omit<PurchaseLineRow, 'costTotal'>[];
  return rows.map((row) => ({ ...row, costTotal: purchaseLineCost(row.qty, row.unitCost) }));
}

export function getPurchase(db: Db, id: string): { purchase: PurchaseRow; lines: PurchaseLineRow[] } {
  const purchase = purchaseHeader(db, id);
  if (!purchase) throw new AuthError(404, 'purchase.not_found');
  return { purchase, lines: purchaseLines(db, id) };
}

export function listPurchases(db: Db): PurchaseRow[] {
  return db.prepare(
    `SELECT p.id, p.number, p.warehouse_id, w.name AS warehouse_name,
            p.supplier, p.date, p.user_id, u.full_name AS user_name,
            p.total_cost, p.note, p.status, p.created_at
     FROM purchases p
     JOIN warehouses w ON w.id = p.warehouse_id
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC, p.id DESC`,
  ).all() as PurchaseRow[];
}

export function createPurchase(db: Db, userId: string, input: unknown): { purchase: PurchaseRow; lines: PurchaseLineRow[] } {
  const normalized = normalizeInput(input);
  return inTransaction(db, () => {
    const warehouse = db.prepare(
      `SELECT w.branch_id FROM warehouses w
       JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(normalized.warehouseId) as { branch_id: string } | undefined;
    if (!warehouse) throw new AuthError(400, 'validation.invalid_warehouse');

    let total = 0n;
    for (const line of normalized.lines) {
      const product = db.prepare('SELECT base_price FROM products WHERE id = ? AND active = 1').get(line.productId) as
        { base_price: number } | undefined;
      if (!product) throw new AuthError(400, 'validation.invalid_product');
      assertNoStocktakeLock(db, normalized.warehouseId, line.productId);
      total += BigInt(purchaseLineCost(line.qty, line.unitCost));
    }
    for (const update of normalized.productPriceUpdates) {
      const product = db.prepare('SELECT base_price FROM products WHERE id = ? AND active = 1')
        .get(update.productId) as { base_price: number } | undefined;
      if (!product) throw new AuthError(400, 'validation.invalid_product');
      if (product.base_price !== update.expectedBasePrice) {
        throw new AuthError(409, 'purchase.product_price_changed');
      }
    }
    const totalCost = assertSafeTotal(total);
    const id = uuidv7();
    const now = nowIso();
    const number = nextDocNumber(db, warehouse.branch_id, 'purchase');
    db.prepare(
      `INSERT INTO purchases
         (id, number, warehouse_id, supplier, date, user_id, total_cost, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
    ).run(id, number, normalized.warehouseId, normalized.supplier, normalized.date, userId, totalCost, normalized.note, now);

    const lineIds: string[] = [];
    const batchIds: string[] = [];
    const movementIds: string[] = [];
    const insertLine = db.prepare(
      'INSERT INTO purchase_lines (id, purchase_id, product_id, qty, unit_cost) VALUES (?, ?, ?, ?, ?)',
    );
    const insertBatch = db.prepare(
      `INSERT INTO batches
         (id, product_id, warehouse_id, source_type, source_id, received_at, qty_in, qty_left, unit_cost, supplier, created_at)
       VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const line of normalized.lines) {
      const lineId = uuidv7();
      const batchId = uuidv7();
      lineIds.push(lineId);
      batchIds.push(batchId);
      insertLine.run(lineId, id, line.productId, line.qty, line.unitCost);
      insertBatch.run(
        batchId,
        line.productId,
        normalized.warehouseId,
        id,
        now,
        line.qty,
        line.qty,
        line.unitCost,
        normalized.supplier,
        now,
      );
      movementIds.push(appendStockMovement(db, {
        branchId: warehouse.branch_id,
        warehouseId: normalized.warehouseId,
        productId: line.productId,
        batchId,
        type: 'PURCHASE',
        qty: line.qty,
        unitCost: line.unitCost,
        docType: 'purchase',
        docId: id,
        userId,
        createdAt: now,
      }));
    }
    addPurchaseOutbox(db, id, lineIds, batchIds, movementIds, now);
    const updateProductPrice = db.prepare('UPDATE products SET base_price = ?, updated_at = ? WHERE id = ?');
    for (const update of normalized.productPriceUpdates) {
      if (update.basePrice === update.expectedBasePrice) continue;
      updateProductPrice.run(update.basePrice, now, update.productId);
      writeAudit(db, {
        userId,
        action: 'products.update',
        entity: 'products',
        entityId: update.productId,
        before: { base_price: update.expectedBasePrice },
        after: { base_price: update.basePrice },
      });
    }
    writeAudit(db, {
      userId,
      action: 'purchase.create',
      entity: 'purchases',
      entityId: id,
      after: { number, warehouseId: normalized.warehouseId, totalCost, lines: normalized.lines },
    });
    return getPurchase(db, id);
  });
}

export function reversePurchase(db: Db, userId: string, purchaseId: string): { purchase: PurchaseRow; lines: PurchaseLineRow[] } {
  return inTransaction(db, () => {
    const purchase = purchaseHeader(db, purchaseId);
    if (!purchase) throw new AuthError(404, 'purchase.not_found');
    if (purchase.status !== 'posted') throw new AuthError(409, 'purchase.already_reversed');
    const warehouse = db.prepare('SELECT branch_id FROM warehouses WHERE id = ?').get(purchase.warehouse_id) as
      | { branch_id: string }
      | undefined;
    if (!warehouse) throw new AuthError(409, 'validation.invalid_warehouse');

    const lines = db.prepare(
      `SELECT pl.id AS line_id, pl.product_id, pl.qty, pl.unit_cost,
              b.id AS batch_id, b.qty_in, b.qty_left
       FROM purchase_lines pl
       LEFT JOIN batches b
         ON b.source_type = 'purchase' AND b.source_id = pl.purchase_id AND b.product_id = pl.product_id
       WHERE pl.purchase_id = ?`,
    ).all(purchaseId) as {
      line_id: string;
      product_id: string;
      qty: number;
      unit_cost: number;
      batch_id: string | null;
      qty_in: number | null;
      qty_left: number | null;
    }[];
    if (lines.length === 0 || lines.some((line) => !line.batch_id || line.qty_in !== line.qty)) {
      throw new Error('purchase.batch_line_integrity_error');
    }

    const movements: { id: string; batch_id: string; qty: number; unit_cost: number | null }[] = [];
    for (const line of lines) {
      assertNoStocktakeLock(db, purchase.warehouse_id, line.product_id);
      const originals = db.prepare(
        `SELECT id, batch_id, qty, unit_cost FROM stock_movements
         WHERE doc_type = 'purchase' AND doc_id = ? AND type = 'PURCHASE' AND batch_id = ?`,
      ).all(purchaseId, line.batch_id) as { id: string; batch_id: string; qty: number; unit_cost: number | null }[];
      if (originals.length !== 1 || originals[0]!.qty !== line.qty || originals[0]!.unit_cost !== line.unit_cost) {
        throw new Error('purchase.movement_integrity_error');
      }
      const original = originals[0]!;
      if (db.prepare('SELECT 1 FROM stock_movements WHERE reverses_id = ?').get(original.id)) {
        throw new AuthError(409, 'purchase.already_reversed');
      }
      const balance = db.prepare(
        'SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements WHERE batch_id = ?',
      ).get(line.batch_id) as { qty: number };
      if (balance.qty !== line.qty) {
        throw new AuthError(409, 'purchase.reversal_stock_not_restored');
      }
      movements.push(original);
    }

    const reversalIds: string[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const original = movements[index]!;
      reversalIds.push(appendStockMovement(db, {
        branchId: warehouse.branch_id,
        warehouseId: purchase.warehouse_id,
        productId: line.product_id,
        batchId: line.batch_id,
        type: 'REVERSAL',
        qty: -original.qty,
        unitCost: original.unit_cost,
        docType: 'purchase',
        docId: purchaseId,
        userId,
        reversesId: original.id,
      }));
    }
    const now = nowIso();
    const update = db.prepare("UPDATE purchases SET status = 'reversed' WHERE id = ? AND status = 'posted'").run(purchaseId);
    if (update.changes !== 1) throw new AuthError(409, 'purchase.already_reversed');
    addPurchaseOutbox(db, purchaseId, [], lines.map((line) => line.batch_id!), reversalIds, now);
    writeAudit(db, {
      userId,
      action: 'purchase.reverse',
      entity: 'purchases',
      entityId: purchaseId,
      before: { status: purchase.status },
      after: { status: 'reversed', reversalMovementIds: reversalIds },
    });
    return getPurchase(db, purchaseId);
  });
}
