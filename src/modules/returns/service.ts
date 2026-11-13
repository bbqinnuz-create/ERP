import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nextDocNumber } from '../../core/counters';
import { mulQty, roundDiv } from '../../core/money';
import { nowIso } from '../../core/time';
import { parseQty } from '../../core/qty';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { hasPermission } from '../auth/permissions';
import { appendStockMovement } from '../stock/ledger';
import { captureReturnPrintSnapshot } from '../print/service';

interface ReturnLineInput {
  saleLineId: string;
  qty: number;
}

interface ReturnPaymentInput {
  methodId: string;
  amount: number;
}

interface ReturnInput {
  saleId: string;
  reason: string;
  idempotencyKey: string;
  receiptLang: 'ru' | 'uz' | null;
  lines: ReturnLineInput[];
  payments: ReturnPaymentInput[];
}

function normalizeInput(input: unknown): ReturnInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) =>
    !['saleId', 'reason', 'idempotencyKey', 'receiptLang', 'lines', 'payments'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.saleId !== 'string' || row.saleId.length < 1 || row.saleId.length > 64) {
    throw new AuthError(400, 'return.invalid_sale');
  }
  if (typeof row.reason !== 'string' || !row.reason.trim() || row.reason.trim().length > 1000) {
    throw new AuthError(400, 'return.invalid_reason');
  }
  if (typeof row.idempotencyKey !== 'string' || !row.idempotencyKey.trim() || row.idempotencyKey.length > 128) {
    throw new AuthError(400, 'validation.invalid_idempotency_key');
  }
  if (row.receiptLang !== undefined && row.receiptLang !== 'ru' && row.receiptLang !== 'uz') {
    throw new AuthError(400, 'validation.invalid_language');
  }
  if (!Array.isArray(row.lines) || row.lines.length < 1 || row.lines.length > 200) {
    throw new AuthError(400, 'return.invalid_lines');
  }
  const seen = new Set<string>();
  const lines = row.lines.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AuthError(400, 'return.invalid_lines');
    }
    const line = value as Record<string, unknown>;
    if (Object.keys(line).some((key) => key !== 'saleLineId' && key !== 'qty') ||
        typeof line.saleLineId !== 'string' || line.saleLineId.length < 1 || line.saleLineId.length > 64 ||
        seen.has(line.saleLineId)) {
      throw new AuthError(400, 'return.invalid_lines');
    }
    let qty: number;
    try {
      qty = parseQty(line.qty as string | number);
    } catch {
      throw new AuthError(400, 'validation.invalid_quantity');
    }
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new AuthError(400, 'validation.invalid_quantity');
    seen.add(line.saleLineId);
    return { saleLineId: line.saleLineId, qty };
  });
  if (!Array.isArray(row.payments) || row.payments.length > 20) {
    throw new AuthError(400, 'return.invalid_payments');
  }
  const paymentMethods = new Set<string>();
  const payments = row.payments.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AuthError(400, 'return.invalid_payments');
    }
    const payment = value as Record<string, unknown>;
    if (Object.keys(payment).some((key) => key !== 'methodId' && key !== 'amount') ||
        typeof payment.methodId !== 'string' || payment.methodId.length < 1 ||
        payment.methodId.length > 64 || paymentMethods.has(payment.methodId) ||
        !Number.isSafeInteger(payment.amount) || (payment.amount as number) <= 0) {
      throw new AuthError(400, 'return.invalid_payments');
    }
    paymentMethods.add(payment.methodId);
    return { methodId: payment.methodId, amount: payment.amount as number };
  });
  return {
    saleId: row.saleId,
    reason: row.reason.trim(),
    idempotencyKey: row.idempotencyKey.trim(),
    receiptLang: row.receiptLang === undefined ? null : row.receiptLang as 'ru' | 'uz',
    lines,
    payments,
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

function safeNumber(value: bigint, errorKey: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new AuthError(409, errorKey);
  return Number(value);
}

export function quoteReturn(db: Db, userId: string, input: unknown): {
  totalRefund: number;
  debtOffset: number;
  payout: number;
} {
  if (!hasPermission(db, userId, 'return')) throw new AuthError(403, 'auth.permission_denied');
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'saleId' && key !== 'lines') ||
      typeof row.saleId !== 'string' || !Array.isArray(row.lines) || row.lines.length < 1) {
    throw new AuthError(400, 'return.invalid_lines');
  }
  const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(row.saleId) as { id: string } | undefined;
  if (!sale) throw new AuthError(404, 'return.sale_not_found');
  let total = 0n;
  const seen = new Set<string>();
  for (const value of row.lines) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AuthError(400, 'return.invalid_lines');
    const lineInput = value as Record<string, unknown>;
    if (Object.keys(lineInput).some((key) => key !== 'saleLineId' && key !== 'qty') ||
        typeof lineInput.saleLineId !== 'string' || seen.has(lineInput.saleLineId)) {
      throw new AuthError(400, 'return.invalid_lines');
    }
    let qty: number;
    try { qty = parseQty(lineInput.qty as string | number); } catch {
      throw new AuthError(400, 'validation.invalid_quantity');
    }
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new AuthError(400, 'validation.invalid_quantity');
    seen.add(lineInput.saleLineId);
    const line = db.prepare(
      'SELECT qty, line_total FROM sale_lines WHERE id = ? AND sale_id = ?',
    ).get(lineInput.saleLineId, sale.id) as { qty: number; line_total: number } | undefined;
    if (!line) throw new AuthError(400, 'return.invalid_lines');
    const prior = db.prepare(
      `SELECT COALESCE(SUM(qty), 0) AS qty, COALESCE(SUM(refund_amount), 0) AS amount
       FROM return_lines WHERE sale_line_id = ?`,
    ).get(lineInput.saleLineId) as { qty: number; amount: number };
    const remainingQty = line.qty - prior.qty;
    const remainingRefund = line.line_total - prior.amount;
    if (qty > remainingQty || remainingQty <= 0 || remainingRefund < 0) {
      throw new AuthError(409, 'return.quantity_exceeded');
    }
    total += qty === remainingQty
      ? BigInt(remainingRefund)
      : roundDiv(BigInt(line.line_total) * BigInt(qty), BigInt(line.qty));
  }
  const totalRefund = safeNumber(total, 'return.amount_out_of_range');
  const debt = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS balance FROM debt_ledger WHERE sale_id = ?',
  ).get(sale.id) as { balance: number };
  if (!Number.isSafeInteger(debt.balance) || debt.balance < 0) throw new Error('return.debt_balance_invalid');
  const debtOffset = Math.min(totalRefund, debt.balance);
  return { totalRefund, debtOffset, payout: totalRefund - debtOffset };
}

export function createReturn(db: Db, userId: string, input: unknown): {
  id: string;
  number: string;
  saleId: string;
  totalRefund: number;
  debtOffset: number;
  payout: number;
  createdAt: string;
  replayed: boolean;
} {
  const normalized = normalizeInput(input);
  return inTransaction(db, () => {
    if (!hasPermission(db, userId, 'return')) throw new AuthError(403, 'auth.permission_denied');
    const replay = db.prepare(
      'SELECT user_id, operation, result_id FROM idempotency_keys WHERE key = ?',
    ).get(normalized.idempotencyKey) as {
      user_id: string; operation: string; result_id: string | null;
    } | undefined;
    if (replay) {
      if (replay.user_id !== userId || replay.operation !== 'return' || !replay.result_id) {
        throw new AuthError(409, 'return.idempotency_conflict');
      }
      const existing = db.prepare(
        'SELECT id, number, sale_id AS saleId, total_refund AS totalRefund, created_at AS createdAt FROM returns WHERE id = ?',
      ).get(replay.result_id) as {
        id: string; number: string; saleId: string; totalRefund: number; createdAt: string;
      } | undefined;
      if (!existing) throw new Error('return.idempotency_integrity_error');
      const offset = db.prepare(
        'SELECT COALESCE(-SUM(amount), 0) AS amount FROM debt_ledger WHERE return_id = ? AND type = \'DEBT_PAY\'',
      ).get(existing.id) as { amount: number };
      return {
        ...existing,
        debtOffset: offset.amount,
        payout: existing.totalRefund - offset.amount,
        replayed: true,
      };
    }
    const sale = db.prepare(
      'SELECT id, number, branch_id, customer_id FROM sales WHERE id = ?',
    ).get(normalized.saleId) as {
      id: string; number: string; branch_id: string; customer_id: string | null;
    } | undefined;
    if (!sale) throw new AuthError(404, 'return.sale_not_found');
    const userLanguage = db.prepare('SELECT lang FROM users WHERE id = ?').get(userId) as { lang: 'ru' | 'uz' };
    const receiptLang = normalized.receiptLang ?? userLanguage.lang;
    if (normalized.lines.some((line) => !db.prepare(
      'SELECT 1 FROM sale_lines WHERE id = ? AND sale_id = ?',
    ).get(line.saleLineId, sale.id))) {
      throw new AuthError(400, 'return.invalid_lines');
    }

    const now = nowIso();
    const id = uuidv7();
    const number = nextDocNumber(db, sale.branch_id, 'return');
    const preparedLines: Array<{
      input: ReturnLineInput;
      productId: string;
      lineQty: number;
      lineTotal: number;
      unitPrice: number;
      remainingQty: number;
      remainingRefund: number;
      qtyToReturn: number;
      refundAmount: number;
      allocations: Array<{
        id: string;
        batchId: string;
        warehouseId: string;
        qty: number;
        unitCost: number;
        remainingQty: number;
      }>;
    }> = [];
    let totalRefundBig = 0n;

    for (const requested of normalized.lines) {
      const line = db.prepare(
        `SELECT id, product_id AS productId, qty, line_total AS lineTotal, unit_price AS unitPrice
         FROM sale_lines WHERE id = ? AND sale_id = ?`,
      ).get(requested.saleLineId, sale.id) as {
        id: string; productId: string; qty: number; lineTotal: number; unitPrice: number;
      };
      const prior = db.prepare(
        `SELECT COALESCE(SUM(rl.qty), 0) AS qty, COALESCE(SUM(rl.refund_amount), 0) AS amount
         FROM return_lines rl WHERE rl.sale_line_id = ?`,
      ).get(line.id) as { qty: number; amount: number };
      const remainingQty = line.qty - prior.qty;
      const remainingRefund = line.lineTotal - prior.amount;
      if (requested.qty > remainingQty || remainingQty <= 0 || remainingRefund < 0) {
        throw new AuthError(409, 'return.quantity_exceeded');
      }
      const refundAmount = requested.qty === remainingQty
        ? remainingRefund
        : Math.min(remainingRefund, Number(roundDiv(
          BigInt(line.lineTotal) * BigInt(requested.qty),
          BigInt(line.qty),
        )));
      const allocations = db.prepare(
        `SELECT a.id, a.batch_id AS batchId, b.warehouse_id AS warehouseId,
                a.qty, a.unit_cost AS unitCost,
                a.qty - COALESCE(SUM(ra.qty), 0) AS remainingQty
         FROM sale_line_batch_allocations a
         JOIN batches b ON b.id = a.batch_id
         LEFT JOIN return_line_batch_allocations ra ON ra.sale_line_allocation_id = a.id
         WHERE a.sale_line_id = ?
         GROUP BY a.id
         ORDER BY a.rowid`,
      ).all(line.id) as Array<{
        id: string; batchId: string; warehouseId: string; qty: number; unitCost: number; remainingQty: number;
      }>;
      if (allocations.reduce((sum, allocation) => sum + allocation.remainingQty, 0) < requested.qty) {
        throw new AuthError(409, 'return.allocation_integrity_error');
      }
      preparedLines.push({
        input: requested,
        productId: line.productId,
        lineQty: line.qty,
        lineTotal: line.lineTotal,
        unitPrice: line.unitPrice,
        remainingQty,
        remainingRefund,
        qtyToReturn: requested.qty,
        refundAmount,
        allocations,
      });
      totalRefundBig += BigInt(refundAmount);
    }
    const totalRefund = safeNumber(totalRefundBig, 'return.amount_out_of_range');
    const debtRow = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS balance FROM debt_ledger
       WHERE sale_id = ?`,
    ).get(sale.id) as { balance: number };
    if (!Number.isSafeInteger(debtRow.balance) || debtRow.balance < 0) {
      throw new Error('return.debt_balance_invalid');
    }
    const debtOffset = Math.min(totalRefund, debtRow.balance);
    const payout = totalRefund - debtOffset;
    const requestedPayout = normalized.payments.reduce((sum, payment) => sum + BigInt(payment.amount), 0n);
    if (requestedPayout !== BigInt(payout)) throw new AuthError(400, 'return.payment_total_mismatch');
    const methodById = new Map<string, { kind: string }>();
    for (const payment of normalized.payments) {
      const method = db.prepare('SELECT kind FROM payment_methods WHERE id = ? AND active = 1')
        .get(payment.methodId) as { kind: string } | undefined;
      if (!method) throw new AuthError(400, 'validation.invalid_payment_method');
      methodById.set(payment.methodId, method);
    }

    db.prepare(
      `INSERT INTO returns (id, number, sale_id, user_id, reason, total_refund, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, number, sale.id, userId, normalized.reason, totalRefund, now);
    const movementIds: string[] = [];
    const cashIds: string[] = [];
    for (const line of preparedLines) {
      const lineId = uuidv7();
      let remaining = line.qtyToReturn;
      let costTotal = 0n;
      const allocationsToRestore: Array<{ allocation: typeof line.allocations[number]; qty: number }> = [];
      for (const allocation of line.allocations) {
        if (remaining === 0) break;
        const qty = Math.min(remaining, allocation.remainingQty);
        if (qty <= 0) continue;
        allocationsToRestore.push({ allocation, qty });
        costTotal += BigInt(mulQty(qty, allocation.unitCost));
        remaining -= qty;
      }
      if (remaining !== 0) throw new AuthError(409, 'return.allocation_integrity_error');
      const safeCost = safeNumber(costTotal, 'return.cost_out_of_range');
      db.prepare(
        `INSERT INTO return_lines (id, return_id, sale_line_id, qty, refund_amount, cost_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(lineId, id, line.input.saleLineId, line.qtyToReturn, line.refundAmount, safeCost);

      for (const { allocation, qty } of allocationsToRestore) {
        const movementId = appendStockMovement(db, {
          branchId: sale.branch_id,
          warehouseId: allocation.warehouseId,
          productId: line.productId,
          batchId: allocation.batchId,
          type: 'RETURN',
          qty,
          unitCost: allocation.unitCost,
          unitPrice: line.unitPrice,
          docType: 'return',
          docId: id,
          userId,
          createdAt: now,
        });
        const allocationId = uuidv7();
        db.prepare(
          `INSERT INTO return_line_batch_allocations
           (id, return_line_id, sale_line_allocation_id, batch_id, qty, unit_cost, stock_movement_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(allocationId, lineId, allocation.id, allocation.batchId, qty, allocation.unitCost, movementId);
        movementIds.push(movementId);
        addOutbox(db, 'return_line_batch_allocations', allocationId, now);
      }
      addOutbox(db, 'return_lines', lineId, now);
    }

    if (debtOffset > 0) {
      const debtId = uuidv7();
      db.prepare(
        `INSERT INTO debt_ledger
         (id, customer_id, sale_id, type, amount, return_id, user_id, created_at)
         VALUES (?, ?, ?, 'DEBT_PAY', ?, ?, ?, ?)`,
      ).run(debtId, sale.customer_id, sale.id, -debtOffset, id, userId, now);
      addOutbox(db, 'debt_ledger', debtId, now);
    }
    const paymentIds: string[] = [];
    for (const [index, payment] of normalized.payments.entries()) {
      const paymentId = uuidv7();
      paymentIds.push(paymentId);
      db.prepare(
        `INSERT INTO payments
         (id, purpose, sale_id, return_id, customer_id, method_id, amount, direction,
          user_id, idempotency_key, created_at)
         VALUES (?, 'return', ?, ?, ?, ?, ?, 'out', ?, ?, ?)`,
      ).run(
        paymentId,
        sale.id,
        id,
        sale.customer_id,
        payment.methodId,
        payment.amount,
        userId,
        `${normalized.idempotencyKey}:${index}`,
        now,
      );
      if (methodById.get(payment.methodId)?.kind === 'cash') {
        const cashId = uuidv7();
        db.prepare(
          `INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at)
           VALUES (?, ?, ?, 'return', ?, ?, ?)`,
        ).run(cashId, payment.methodId, -payment.amount, id, userId, now);
        cashIds.push(cashId);
      }
      addOutbox(db, 'payments', paymentId, now);
    }
    db.prepare(
      `INSERT INTO idempotency_keys (key, user_id, operation, result_type, result_id, created_at)
       VALUES (?, ?, 'return', 'returns', ?, ?)`,
    ).run(normalized.idempotencyKey, userId, id, now);
    addOutbox(db, 'returns', id, now);
    for (const movementId of movementIds) addOutbox(db, 'stock_movements', movementId, now);
    for (const cashId of cashIds) addOutbox(db, 'cash_ledger', cashId, now);
    writeAudit(db, {
      userId,
      action: 'return.create',
      entity: 'returns',
      entityId: id,
      after: { number, saleId: sale.id, reason: normalized.reason, totalRefund, debtOffset, payout },
    });
    const snapshot = captureReturnPrintSnapshot(db, id);
    db.prepare(
      `INSERT INTO print_jobs
       (id, doc_type, doc_id, kind, status, attempts, created_at, updated_at, lang, snapshot_json)
       VALUES (?, 'return', ?, 'original', 'pending', 0, ?, ?, ?, ?)`,
    ).run(uuidv7(), id, now, now, receiptLang, snapshot);
    return { id, number, saleId: sale.id, totalRefund, debtOffset, payout, createdAt: now, replayed: false };
  });
}

export function findSalesForReturn(db: Db, query: unknown): Array<{
  id: string;
  number: string;
  createdAt: string;
  customer: string;
  total: number;
  lines: Array<{ id: string; productId: string; sku: string; name: string; qty: number; returnedQty: number; lineTotal: number }>;
}> {
  if (typeof query !== 'string' || query.trim().length < 1 || query.trim().length > 100) {
    throw new AuthError(400, 'return.invalid_search');
  }
  const term = query.trim();
  const sales = db.prepare(
    `SELECT s.id, s.number, s.created_at AS createdAt,
            COALESCE(s.customer_name, c.name, '') AS customer, s.total
     FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.number = ? OR s.id = ?
     ORDER BY s.created_at DESC LIMIT 20`,
  ).all(term, term) as Array<{
    id: string; number: string; createdAt: string; customer: string; total: number;
  }>;
  return sales.map((sale) => ({
    ...sale,
    lines: db.prepare(
      `SELECT sl.id, sl.product_id AS productId, p.sku, p.name_ru AS name, sl.qty,
              COALESCE((SELECT SUM(rl.qty) FROM return_lines rl WHERE rl.sale_line_id = sl.id), 0) AS returnedQty,
              sl.line_total AS lineTotal
       FROM sale_lines sl JOIN products p ON p.id = sl.product_id
       WHERE sl.sale_id = ? ORDER BY sl.rowid`,
    ).all(sale.id) as Array<{
      id: string; productId: string; sku: string; name: string; qty: number; returnedQty: number; lineTotal: number;
    }>,
  }));
}
