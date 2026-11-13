import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nextDocNumber } from '../../core/counters';
import { nowIso } from '../../core/time';
import { parseQty } from '../../core/qty';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { hasPermission } from '../auth/permissions';
import { consumeFifo, type FifoAllocation } from '../fifo/service';

type WriteOffReason = 'damaged' | 'lost' | 'expired' | 'other';

interface WriteOffLineInput {
  productId: string;
  qty: number;
}

interface WriteOffInput {
  warehouseId: string;
  reason: WriteOffReason;
  note: string | null;
  lines: WriteOffLineInput[];
}

function normalizeInput(input: unknown): WriteOffInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['warehouseId', 'reason', 'note', 'lines'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.warehouseId !== 'string' || row.warehouseId.length < 1 || row.warehouseId.length > 64) {
    throw new AuthError(400, 'validation.invalid_warehouse');
  }
  if (!['damaged', 'lost', 'expired', 'other'].includes(row.reason as string)) {
    throw new AuthError(400, 'writeoff.invalid_reason');
  }
  const note = row.note === undefined || row.note === null ? null : row.note;
  if (note !== null && (typeof note !== 'string' || note.trim().length > 1000)) {
    throw new AuthError(400, 'writeoff.invalid_note');
  }
  if (!Array.isArray(row.lines) || row.lines.length < 1 || row.lines.length > 200) {
    throw new AuthError(400, 'writeoff.invalid_lines');
  }
  const seen = new Set<string>();
  const lines = row.lines.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AuthError(400, 'writeoff.invalid_lines');
    }
    const line = value as Record<string, unknown>;
    if (Object.keys(line).some((key) => !['productId', 'qty'].includes(key)) ||
        typeof line.productId !== 'string' || line.productId.length < 1 || line.productId.length > 64 ||
        seen.has(line.productId)) {
      throw new AuthError(400, 'writeoff.invalid_lines');
    }
    let qty: number;
    try {
      qty = parseQty(line.qty as string | number);
    } catch {
      throw new AuthError(400, 'validation.invalid_quantity');
    }
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new AuthError(400, 'validation.invalid_quantity');
    seen.add(line.productId);
    return { productId: line.productId, qty };
  });
  return {
    warehouseId: row.warehouseId,
    reason: row.reason as WriteOffReason,
    note: typeof note === 'string' ? note.trim() || null : null,
    lines,
  };
}

function addOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

export function createWriteOff(db: Db, userId: string, input: unknown): {
  id: string;
  number: string;
  warehouseId: string;
  reason: WriteOffReason;
  note: string | null;
  createdAt: string;
  lines: Array<{ productId: string; qty: number; costTotal: number }>;
} {
  const normalized = normalizeInput(input);
  return inTransaction(db, () => {
    if (!hasPermission(db, userId, 'write_off')) throw new AuthError(403, 'auth.permission_denied');
    const warehouse = db.prepare(
      `SELECT w.branch_id FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(normalized.warehouseId) as { branch_id: string } | undefined;
    if (!warehouse) throw new AuthError(400, 'validation.invalid_warehouse');

    for (const line of normalized.lines) {
      if (!db.prepare('SELECT 1 FROM products WHERE id = ? AND active = 1').get(line.productId)) {
        throw new AuthError(400, 'validation.invalid_product');
      }
    }

    const id = uuidv7();
    const createdAt = nowIso();
    const number = nextDocNumber(db, warehouse.branch_id, 'writeoff');
    db.prepare(
      `INSERT INTO write_offs (id, number, warehouse_id, reason, user_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, number, normalized.warehouseId, normalized.reason, userId, normalized.note, createdAt);

    const resultLines: Array<{ id: string; productId: string; qty: number; costTotal: number }> = [];
    for (const line of normalized.lines) {
      const allocations: FifoAllocation[] = consumeFifo(db, {
        branchId: warehouse.branch_id,
        warehouseId: normalized.warehouseId,
        productId: line.productId,
        qty: line.qty,
        movementType: 'WRITE_OFF',
        docType: 'write_off',
        docId: id,
        userId,
      });
      const cost = allocations.reduce((sum, allocation) => sum + BigInt(allocation.costTotal), 0n);
      if (cost > BigInt(Number.MAX_SAFE_INTEGER)) throw new AuthError(409, 'fifo.cost_out_of_range');
      const lineId = uuidv7();
      db.prepare(
        'INSERT INTO write_off_lines (id, write_off_id, product_id, qty, cost_total) VALUES (?, ?, ?, ?, ?)',
      ).run(lineId, id, line.productId, line.qty, Number(cost));
      resultLines.push({ id: lineId, productId: line.productId, qty: line.qty, costTotal: Number(cost) });
    }

    const movementIds = db.prepare(
      "SELECT id FROM stock_movements WHERE doc_type = 'write_off' AND doc_id = ?",
    ).all(id) as Array<{ id: string }>;
    addOutbox(db, 'write_offs', id, createdAt);
    for (const line of resultLines) addOutbox(db, 'write_off_lines', line.id, createdAt);
    for (const movement of movementIds) addOutbox(db, 'stock_movements', movement.id, createdAt);
    writeAudit(db, {
      userId,
      action: 'write_off.create',
      entity: 'write_offs',
      entityId: id,
      after: {
        number,
        warehouseId: normalized.warehouseId,
        reason: normalized.reason,
        lines: resultLines.map(({ productId, qty, costTotal }) => ({ productId, qty, costTotal })),
      },
    });
    return {
      id,
      number,
      warehouseId: normalized.warehouseId,
      reason: normalized.reason,
      note: normalized.note,
      createdAt,
      lines: resultLines.map(({ productId, qty, costTotal }) => ({ productId, qty, costTotal })),
    };
  });
}

export function listWriteOffs(db: Db): Array<Record<string, unknown>> {
  return db.prepare(
    `SELECT wo.id, wo.number, wo.warehouse_id AS warehouseId, w.name AS warehouseName,
            wo.reason, wo.note, wo.created_at AS createdAt, u.full_name AS userName,
            wol.product_id AS productId, p.sku, p.name_ru AS productName, wol.qty, wol.cost_total AS costTotal
     FROM write_offs wo
     JOIN warehouses w ON w.id = wo.warehouse_id
     JOIN users u ON u.id = wo.user_id
     JOIN write_off_lines wol ON wol.write_off_id = wo.id
     JOIN products p ON p.id = wol.product_id
     ORDER BY wo.created_at DESC, wo.id DESC, wol.rowid`,
  ).all() as Array<Record<string, unknown>>;
}
