import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nextDocNumber } from '../../core/counters';
import { nowIso } from '../../core/time';
import { parseQty } from '../../core/qty';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { hasPermission } from '../auth/permissions';
import { appendStockMovement } from '../stock/ledger';
import { expireReservations } from '../carts/held';

type StocktakeMode = 'selected' | 'all';

function assertStocktakePermission(db: Db, userId: string): void {
  if (!hasPermission(db, userId, 'stocktake')) throw new AuthError(403, 'auth.permission_denied');
}

function addOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

function normalizeStart(input: unknown): { warehouseId: string; mode: StocktakeMode; productIds: string[]; note: string | null } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['warehouseId', 'mode', 'productIds', 'note'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.warehouseId !== 'string' || row.warehouseId.length < 1 || row.warehouseId.length > 64 ||
      (row.mode !== 'selected' && row.mode !== 'all')) {
    throw new AuthError(400, 'stocktake.invalid_start');
  }
  const note = row.note === undefined || row.note === null ? null : row.note;
  if (note !== null && (typeof note !== 'string' || note.trim().length > 1000)) {
    throw new AuthError(400, 'stocktake.invalid_note');
  }
  if (!Array.isArray(row.productIds) || row.productIds.length > 1000 ||
      row.productIds.some((id) => typeof id !== 'string' || !id || id.length > 64)) {
    throw new AuthError(400, 'stocktake.invalid_products');
  }
  const productIds = [...new Set(row.productIds as string[])];
  if (row.mode === 'selected' && productIds.length === 0) throw new AuthError(400, 'stocktake.invalid_products');
  if (row.mode === 'all' && productIds.length > 0) throw new AuthError(400, 'stocktake.invalid_products');
  return { warehouseId: row.warehouseId, mode: row.mode, productIds, note: typeof note === 'string' ? note.trim() || null : null };
}

export function startStocktake(db: Db, userId: string, input: unknown): {
  id: string; number: string; warehouseId: string; mode: StocktakeMode; startedAt: string; lines: number;
} {
  const normalized = normalizeStart(input);
  return inTransaction(db, () => {
    assertStocktakePermission(db, userId);
    expireReservations(db);
    const warehouse = db.prepare(
      `SELECT w.branch_id FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(normalized.warehouseId) as { branch_id: string } | undefined;
    if (!warehouse) throw new AuthError(400, 'validation.invalid_warehouse');
    if (db.prepare("SELECT 1 FROM stocktakes WHERE warehouse_id = ? AND status = 'active'")
      .get(normalized.warehouseId)) {
      throw new AuthError(409, 'stocktake.already_active');
    }

    const products = normalized.mode === 'all'
      ? db.prepare('SELECT id FROM products WHERE active = 1 ORDER BY id').all() as Array<{ id: string }>
      : normalized.productIds.map((id) => ({ id }));
    if (normalized.mode === 'selected') {
      const placeholders = normalized.productIds.map(() => '?').join(',');
      const active = db.prepare(
        `SELECT id FROM products WHERE active = 1 AND id IN (${placeholders})`,
      ).all(...normalized.productIds) as Array<{ id: string }>;
      if (active.length !== normalized.productIds.length) throw new AuthError(400, 'stocktake.invalid_products');
    }
    const id = uuidv7();
    const startedAt = nowIso();
    const number = nextDocNumber(db, warehouse.branch_id, 'stocktake');
    db.prepare(
      `INSERT INTO stocktakes (id, number, warehouse_id, mode, user_id, started_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, number, normalized.warehouseId, normalized.mode, userId, startedAt, normalized.note);
    const insertLine = db.prepare(
      `INSERT INTO stocktake_lines (id, stocktake_id, product_id, qty_system)
       SELECT ?, ?, ?, COALESCE(SUM(qty), 0)
       FROM stock_movements WHERE product_id = ? AND warehouse_id = ?`,
    );
    for (const product of products) {
      const lineId = uuidv7();
      insertLine.run(lineId, id, product.id, product.id, normalized.warehouseId);
      addOutbox(db, 'stocktake_lines', lineId, startedAt);
      if (normalized.mode === 'selected') {
        db.prepare(
          `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(uuidv7(), id, normalized.warehouseId, product.id, startedAt);
      }
    }
    if (normalized.mode === 'all') {
      db.prepare(
        `INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at)
         VALUES (?, ?, ?, NULL, ?)`,
      ).run(uuidv7(), id, normalized.warehouseId, startedAt);
    }
    addOutbox(db, 'stocktakes', id, startedAt);
    writeAudit(db, {
      userId,
      action: 'stocktake.start',
      entity: 'stocktakes',
      entityId: id,
      after: { number, warehouseId: normalized.warehouseId, mode: normalized.mode, products: products.length },
    });
    return { id, number, warehouseId: normalized.warehouseId, mode: normalized.mode, startedAt, lines: products.length };
  });
}

export function getStocktake(db: Db, stocktakeId: string): {
  stocktake: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
} {
  if (db.inTransaction) expireReservations(db);
  const stocktake = db.prepare(
    `SELECT st.id, st.number, st.warehouse_id AS warehouseId, w.name AS warehouseName,
            st.mode, st.status, st.started_at AS startedAt, st.finished_at AS finishedAt,
            st.cancel_reason AS cancelReason, st.note, st.user_id AS userId
     FROM stocktakes st JOIN warehouses w ON w.id = st.warehouse_id
     WHERE st.id = ?`,
  ).get(stocktakeId) as Record<string, unknown> | undefined;
  if (!stocktake) throw new AuthError(404, 'stocktake.not_found');
  const lines = db.prepare(
    `SELECT sl.id, sl.product_id AS productId, p.sku, p.name_ru AS name, p.unit,
            sl.qty_system AS qtySystem, sl.qty_counted AS qtyCounted, sl.diff,
            sl.manual_unit_cost AS manualUnitCost,
            COALESCE(r.qty, 0) AS reserved,
            CASE WHEN sl.qty_counted IS NULL THEN 0
                 ELSE MAX(COALESCE(r.qty, 0) - sl.qty_counted, 0) END AS reserveDeficit
     FROM stocktake_lines sl JOIN products p ON p.id = sl.product_id
     LEFT JOIN (
       SELECT product_id, warehouse_id, SUM(qty) AS qty
       FROM reservations WHERE status = 'active' GROUP BY product_id, warehouse_id
     ) r ON r.product_id = sl.product_id AND r.warehouse_id = ?
     WHERE sl.stocktake_id = ? ORDER BY p.name_ru, p.id`,
  ).all(stocktake.warehouseId, stocktakeId) as Array<Record<string, unknown>>;
  return { stocktake, lines };
}

export function listStocktakes(db: Db): Array<Record<string, unknown>> {
  return db.prepare(
    `SELECT st.id, st.number, st.warehouse_id AS warehouseId, w.name AS warehouseName,
            st.mode, st.status, st.started_at AS startedAt, st.finished_at AS finishedAt,
            u.full_name AS userName
     FROM stocktakes st
     JOIN warehouses w ON w.id = st.warehouse_id
     JOIN users u ON u.id = st.user_id
     ORDER BY CASE st.status WHEN 'active' THEN 0 ELSE 1 END, st.started_at DESC, st.id DESC
     LIMIT 100`,
  ).all() as Array<Record<string, unknown>>;
}

export function listStocktakeReservations(db: Db, userId: string, stocktakeId: string): Array<Record<string, unknown>> {
  if (!hasPermission(db, userId, 'reserve_cart')) throw new AuthError(403, 'auth.permission_denied');
  if (db.inTransaction) expireReservations(db);
  const stocktake = db.prepare('SELECT warehouse_id FROM stocktakes WHERE id = ?').get(stocktakeId) as
    { warehouse_id: string } | undefined;
  if (!stocktake) throw new AuthError(404, 'stocktake.not_found');
  return db.prepare(
    `SELECT r.id, r.product_id AS productId, p.sku, p.name_ru AS productName,
            r.cart_id AS cartId, r.qty, r.expires_at AS expiresAt
     FROM reservations r
     JOIN products p ON p.id = r.product_id
     JOIN stocktake_lines sl ON sl.stocktake_id = ? AND sl.product_id = r.product_id
     WHERE r.warehouse_id = ? AND r.status = 'active'
     ORDER BY p.name_ru, r.created_at`,
  ).all(stocktakeId, stocktake.warehouse_id) as Array<Record<string, unknown>>;
}

export function saveStocktakeCounts(db: Db, userId: string, stocktakeId: string, input: unknown): {
  stocktake: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
} {
  if (!Array.isArray(input) || input.length < 1 || input.length > 1000) {
    throw new AuthError(400, 'stocktake.invalid_counts');
  }
  return inTransaction(db, () => {
    assertStocktakePermission(db, userId);
    const actor = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
    const counts = input.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new AuthError(400, 'stocktake.invalid_counts');
      }
      const row = value as Record<string, unknown>;
      if (Object.keys(row).some((key) => !['productId', 'qtyCounted', 'manualUnitCost'].includes(key)) ||
          typeof row.productId !== 'string' || !row.productId) {
        throw new AuthError(400, 'stocktake.invalid_counts');
      }
      let qtyCounted: number;
      try { qtyCounted = parseQty(row.qtyCounted as string | number); } catch {
        throw new AuthError(400, 'validation.invalid_quantity');
      }
      if (!Number.isSafeInteger(qtyCounted) || qtyCounted < 0) {
        throw new AuthError(400, 'validation.invalid_quantity');
      }
      const cost = row.manualUnitCost;
      if (cost !== undefined && cost !== null &&
          (actor?.role !== 'admin' || !Number.isSafeInteger(cost) || (cost as number) < 0)) {
        throw new AuthError(403, 'stocktake.manual_cost_admin_only');
      }
      return { productId: row.productId, qtyCounted, manualUnitCost: cost as number | null | undefined };
    });
    if (new Set(counts.map((line) => line.productId)).size !== counts.length) {
      throw new AuthError(400, 'stocktake.invalid_counts');
    }
    const status = db.prepare('SELECT status FROM stocktakes WHERE id = ?').get(stocktakeId) as
      { status: string } | undefined;
    if (!status) throw new AuthError(404, 'stocktake.not_found');
    if (status.status !== 'active') throw new AuthError(409, 'stocktake.not_active');
    for (const count of counts) {
      const update = db.prepare(
        `UPDATE stocktake_lines SET qty_counted = ?, diff = ? - qty_system,
           manual_unit_cost = COALESCE(?, manual_unit_cost)
         WHERE stocktake_id = ? AND product_id = ?`,
      ).run(count.qtyCounted, count.qtyCounted, count.manualUnitCost ?? null, stocktakeId, count.productId);
      if (update.changes !== 1) throw new AuthError(400, 'stocktake.invalid_counts');
    }
    writeAudit(db, {
      userId,
      action: 'stocktake.count.save',
      entity: 'stocktakes',
      entityId: stocktakeId,
      after: { products: counts.length },
    });
    return getStocktake(db, stocktakeId);
  });
}

export function completeStocktake(db: Db, userId: string, stocktakeId: string): {
  id: string; status: 'completed'; movements: number; reserveDeficits: number;
} {
  return inTransaction(db, () => {
    assertStocktakePermission(db, userId);
    expireReservations(db);
    const stocktake = db.prepare(
      `SELECT st.warehouse_id, st.status, w.branch_id
       FROM stocktakes st JOIN warehouses w ON w.id = st.warehouse_id WHERE st.id = ?`,
    ).get(stocktakeId) as { warehouse_id: string; status: string; branch_id: string } | undefined;
    if (!stocktake) throw new AuthError(404, 'stocktake.not_found');
    if (stocktake.status !== 'active') throw new AuthError(409, 'stocktake.not_active');
    const lines = db.prepare(
      `SELECT id, product_id, qty_system, qty_counted, manual_unit_cost
       FROM stocktake_lines WHERE stocktake_id = ? ORDER BY product_id`,
    ).all(stocktakeId) as Array<{
      id: string; product_id: string; qty_system: number; qty_counted: number | null; manual_unit_cost: number | null;
    }>;
    if (lines.some((line) => line.qty_counted === null)) {
      throw new AuthError(409, 'stocktake.counts_incomplete');
    }
    let movementCount = 0;
    const movementIds: string[] = [];
    const batchIds: string[] = [];
    const now = nowIso();
    for (const line of lines) {
      const diff = line.qty_counted! - line.qty_system;
      db.prepare('UPDATE stocktake_lines SET diff = ? WHERE id = ?').run(diff, line.id);
      if (diff === 0) continue;
      if (diff < 0) {
        let remaining = -diff;
        const batches = db.prepare(
          `SELECT b.id, b.unit_cost, COALESCE(SUM(m.qty), 0) AS qty
           FROM batches b LEFT JOIN stock_movements m ON m.batch_id = b.id
           WHERE b.product_id = ? AND b.warehouse_id = ?
           GROUP BY b.id HAVING SUM(m.qty) > 0 ORDER BY b.received_at, b.id`,
        ).all(line.product_id, stocktake.warehouse_id) as Array<{ id: string; unit_cost: number; qty: number }>;
        for (const batch of batches) {
          if (remaining === 0) break;
          const qty = Math.min(remaining, batch.qty);
          const movementId = appendStockMovement(db, {
            branchId: stocktake.branch_id,
            warehouseId: stocktake.warehouse_id,
            productId: line.product_id,
            batchId: batch.id,
            type: 'ADJUST_MINUS',
            qty: -qty,
            unitCost: batch.unit_cost,
            docType: 'stocktake',
            docId: stocktakeId,
            userId,
            note: 'stocktake',
            createdAt: now,
          });
          movementIds.push(movementId);
          movementCount += 1;
          remaining -= qty;
        }
        if (remaining !== 0) throw new AuthError(409, 'stocktake.stock_integrity_error');
      } else {
        const latestPurchase = db.prepare(
          `SELECT unit_cost FROM batches WHERE product_id = ? AND warehouse_id = ?
           AND source_type = 'purchase' ORDER BY received_at DESC, id DESC LIMIT 1`,
        ).get(line.product_id, stocktake.warehouse_id) as { unit_cost: number } | undefined;
        const unitCost = latestPurchase?.unit_cost ?? line.manual_unit_cost;
        if (unitCost === null || unitCost === undefined) {
          throw new AuthError(409, 'stocktake.manual_cost_required');
        }
        const batchId = uuidv7();
        db.prepare(
          `INSERT INTO batches
           (id, product_id, warehouse_id, source_type, source_id, received_at, qty_in, qty_left, unit_cost, created_at)
           VALUES (?, ?, ?, 'stocktake', ?, ?, ?, ?, ?, ?)`,
        ).run(batchId, line.product_id, stocktake.warehouse_id, stocktakeId, now, diff, diff, unitCost, now);
        batchIds.push(batchId);
        const movementId = appendStockMovement(db, {
          branchId: stocktake.branch_id,
          warehouseId: stocktake.warehouse_id,
          productId: line.product_id,
          batchId,
          type: 'ADJUST_PLUS',
          qty: diff,
          unitCost,
          docType: 'stocktake',
          docId: stocktakeId,
          userId,
          note: 'stocktake',
          createdAt: now,
        });
        movementIds.push(movementId);
        movementCount += 1;
      }
    }
    db.prepare(
      `UPDATE stocktakes SET status = 'completed', finished_at = ? WHERE id = ? AND status = 'active'`,
    ).run(now, stocktakeId);
    db.prepare('UPDATE stocktake_locks SET released_at = ? WHERE stocktake_id = ? AND released_at IS NULL')
      .run(now, stocktakeId);
    addOutbox(db, 'stocktakes', stocktakeId, now);
    for (const batchId of batchIds) addOutbox(db, 'batches', batchId, now);
    for (const movementId of movementIds) addOutbox(db, 'stock_movements', movementId, now);
    const reserveDeficits = db.prepare(
      `SELECT COUNT(*) AS count FROM stocktake_lines sl
       JOIN (SELECT product_id, warehouse_id, SUM(qty) AS qty FROM reservations
             WHERE status = 'active' GROUP BY product_id, warehouse_id) r
         ON r.product_id = sl.product_id AND r.warehouse_id = ?
       WHERE sl.stocktake_id = ? AND r.qty > sl.qty_counted`,
    ).get(stocktake.warehouse_id, stocktakeId) as { count: number };
    writeAudit(db, {
      userId,
      action: 'stocktake.complete',
      entity: 'stocktakes',
      entityId: stocktakeId,
      after: { movements: movementCount, reserveDeficits: reserveDeficits.count },
    });
    return { id: stocktakeId, status: 'completed', movements: movementCount, reserveDeficits: reserveDeficits.count };
  });
}

export function cancelStocktake(db: Db, userId: string, stocktakeId: string, reasonInput: unknown): void {
  if (typeof reasonInput !== 'string' || !reasonInput.trim() || reasonInput.trim().length > 1000) {
    throw new AuthError(400, 'stocktake.invalid_cancel_reason');
  }
  inTransaction(db, () => {
    assertStocktakePermission(db, userId);
    const now = nowIso();
    const result = db.prepare(
      `UPDATE stocktakes SET status = 'cancelled', finished_at = ?, cancel_reason = ?
       WHERE id = ? AND status = 'active'`,
    ).run(now, reasonInput.trim(), stocktakeId);
    if (result.changes !== 1) throw new AuthError(409, 'stocktake.not_active');
    db.prepare('UPDATE stocktake_locks SET released_at = ? WHERE stocktake_id = ? AND released_at IS NULL')
      .run(now, stocktakeId);
    addOutbox(db, 'stocktakes', stocktakeId, now);
    writeAudit(db, {
      userId,
      action: 'stocktake.cancel',
      entity: 'stocktakes',
      entityId: stocktakeId,
      after: { reason: reasonInput.trim() },
    });
  });
}
