import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { hasPermission } from '../auth/permissions';
import { PrintOutcomeUncertainError, type PrintDriver } from './driver';
import {
  receiptDataFromSnapshot,
  type ReceiptData,
  type ReceiptLanguage,
  type ReceiptSnapshot,
} from './receipt';

export interface PrintJobView {
  id: string;
  documentType: string;
  number: string;
  kind: 'original' | 'copy';
  status: 'pending' | 'printing' | 'printed' | 'error' | 'uncertain';
  attempts: number;
  error: string | null;
  lang: ReceiptLanguage;
  createdAt: string;
  cashier: string;
}

interface PrintJobRow {
  id: string;
  doc_type: string;
  doc_id: string;
  kind: 'original' | 'copy';
  status: PrintJobView['status'];
  attempts: number;
  error: string | null;
  lang: ReceiptLanguage;
  snapshot_json: string | null;
}

const activePrinters = new WeakSet<Db>();

function validLanguage(value: unknown): value is ReceiptLanguage {
  return value === 'ru' || value === 'uz';
}

export function listPrintJobs(db: Db, userId: string, isAdmin: boolean): PrintJobView[] {
  const filter = isAdmin ? '' : 'AND documents.user_id = ?';
  const rows = db.prepare(
    `SELECT pj.id, pj.doc_type, documents.number, pj.kind, pj.status, pj.attempts, pj.error, pj.lang,
            pj.created_at, documents.cashier
     FROM print_jobs pj
     JOIN (
       SELECT s.id, s.number, s.user_id, u.full_name AS cashier, 'sale' AS doc_type
       FROM sales s JOIN users u ON u.id = s.user_id
       UNION ALL
       SELECT r.id, r.number, r.user_id, u.full_name AS cashier, 'return' AS doc_type
       FROM returns r JOIN users u ON u.id = r.user_id
       UNION ALL
       SELECT co.id, co.number, co.user_id, u.full_name AS cashier, 'counter_order' AS doc_type
       FROM counter_orders co JOIN users u ON u.id = co.user_id
     ) documents ON documents.id = pj.doc_id AND documents.doc_type = pj.doc_type
     WHERE 1 = 1 ${filter}
     ORDER BY pj.created_at DESC, pj.id DESC
     LIMIT 100`,
  ).all(...(isAdmin ? [] : [userId])) as Array<{
    id: string;
    doc_type: string;
    number: string;
    kind: PrintJobView['kind'];
    status: PrintJobView['status'];
    attempts: number;
    error: string | null;
    lang: ReceiptLanguage;
    created_at: string;
    cashier: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    documentType: row.doc_type,
    number: row.number,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    error: row.error,
    lang: row.lang,
    createdAt: row.created_at,
    cashier: row.cashier,
  }));
}

export function createCopyJob(
  db: Db,
  userId: string,
  isAdmin: boolean,
  sourceJobId: string,
  input: unknown,
): { id: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !['lang', 'confirmUncertain'].includes(key)) ||
      !validLanguage(body.lang) || (body.confirmUncertain !== undefined && typeof body.confirmUncertain !== 'boolean')) {
    throw new AuthError(400, 'print.invalid_request');
  }

  return inTransaction(db, () => {
    const source = db.prepare(
      `SELECT pj.id, pj.status, pj.doc_type, pj.doc_id, pj.snapshot_json, documents.user_id
       FROM print_jobs pj
      JOIN (
        SELECT id, user_id, 'sale' AS doc_type FROM sales
        UNION ALL
        SELECT id, user_id, 'return' AS doc_type FROM returns
        UNION ALL
        SELECT id, user_id, 'counter_order' AS doc_type FROM counter_orders
      ) documents ON documents.id = pj.doc_id AND documents.doc_type = pj.doc_type
      WHERE pj.id = ?`,
    ).get(sourceJobId) as {
      id: string;
      status: PrintJobView['status'];
      doc_type: string;
      doc_id: string;
      snapshot_json: string | null;
      user_id: string;
    } | undefined;
    if (!source) throw new AuthError(404, 'print.job_not_found');
    if (!isAdmin && source.user_id !== userId) throw new AuthError(403, 'auth.permission_denied');
    if (!hasPermission(db, userId, source.doc_type === 'return' ? 'return' : 'sell')) {
      throw new AuthError(403, 'auth.permission_denied');
    }
    if (source.status === 'printing') throw new AuthError(409, 'print.job_in_progress');
    if (source.status === 'uncertain' && body.confirmUncertain !== true) {
      throw new AuthError(409, 'print.confirm_uncertain');
    }
    const id = uuidv7();
    const now = nowIso();
    db.prepare(
      `INSERT INTO print_jobs
         (id, doc_type, doc_id, kind, status, attempts, created_at, updated_at, lang, snapshot_json)
       VALUES (?, ?, ?, 'copy', 'pending', 0, ?, ?, ?, ?)`,
    ).run(id, source.doc_type, source.doc_id, now, now, body.lang, source.snapshot_json);
    writeAudit(db, {
      userId,
      action: 'print.copy.create',
      entity: 'print_jobs',
      entityId: id,
      after: { sourceJobId, docId: source.doc_id, lang: body.lang },
    });
    return { id };
  });
}

export function captureSalePrintSnapshot(db: Db, saleId: string): string {
  const sale = db.prepare(
    `SELECT s.number, s.created_at AS createdAt, s.subtotal, s.discount_total AS discountTotal,
            s.total, s.paid_total AS paidTotal, s.debt_amount AS debtAmount,
            COALESCE(s.customer_name, c.name, s.number) AS customer,
            u.full_name AS cashier, b.name AS storeName, b.address, b.phone
     FROM sales s
     JOIN users u ON u.id = s.user_id
     JOIN branches b ON b.id = s.branch_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ?`,
  ).get(saleId) as Omit<ReceiptSnapshot, 'lines' | 'payments'> | undefined;
  if (!sale) throw new Error(`Print source sale was not found: ${saleId}`);
  const lines = db.prepare(
    `SELECT p.name_ru AS nameRu, p.name_uz AS nameUz, sl.qty, p.unit,
            sl.unit_price AS unitPrice, sl.line_discount AS lineDiscount, sl.line_total AS lineTotal
     FROM sale_lines sl JOIN products p ON p.id = sl.product_id
     WHERE sl.sale_id = ? ORDER BY sl.rowid`,
  ).all(saleId) as ReceiptSnapshot['lines'];
  const payments = db.prepare(
    `SELECT pm.name_ru AS methodNameRu, pm.name_uz AS methodNameUz, p.amount, p.tendered,
            CASE WHEN p.tendered IS NULL THEN 0 ELSE p.tendered - p.amount END AS change
     FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
     WHERE p.sale_id = ? ORDER BY p.rowid`,
  ).all(saleId) as ReceiptSnapshot['payments'];
  const snapshot: ReceiptSnapshot = { ...sale, lines, payments };
  return JSON.stringify(snapshot);
}

export function captureCounterOrderPrintSnapshot(db: Db, orderId: string): string {
  const order = db.prepare(
    `SELECT co.id, co.number, co.created_at AS createdAt, co.expires_at AS expiresAt,
            co.subtotal, co.discount_total AS discountTotal, co.total, co.quote_json AS quoteJson,
            COALESCE(co.customer_name, c.name, co.number) AS customer,
            u.full_name AS cashier, b.name AS storeName, b.address, b.phone
     FROM counter_orders co
     JOIN users u ON u.id = co.user_id
     JOIN branches b ON b.id = co.branch_id
     LEFT JOIN customers c ON c.id = co.customer_id
     WHERE co.id = ?`,
  ).get(orderId) as {
    id: string; number: string; createdAt: string; expiresAt: string;
    subtotal: number; discountTotal: number; total: number; quoteJson: string;
    customer: string; cashier: string; storeName: string; address: string | null; phone: string | null;
  } | undefined;
  if (!order) throw new Error(`Print source counter order was not found: ${orderId}`);
  let quote: unknown;
  try {
    quote = JSON.parse(order.quoteJson);
  } catch (error) {
    throw new Error('Stored counter order quote is invalid.', { cause: error });
  }
  if (!quote || typeof quote !== 'object' || Array.isArray(quote) ||
      !('calculated' in quote) || !quote.calculated || typeof quote.calculated !== 'object' ||
      !('lines' in quote.calculated) || !Array.isArray(quote.calculated.lines)) {
    throw new Error('Stored counter order quote is invalid.');
  }
  const quoteLines = quote.calculated.lines as Array<Record<string, unknown>>;
  const products = db.prepare(
    `SELECT hcl.product_id AS productId, p.name_ru AS nameRu, p.name_uz AS nameUz, p.unit, hcl.qty
     FROM held_cart_lines hcl
     JOIN counter_orders co ON co.held_cart_id = hcl.cart_id
     JOIN products p ON p.id = hcl.product_id
     WHERE co.id = ? ORDER BY hcl.rowid`,
  ).all(orderId) as Array<{
    productId: string; nameRu: string; nameUz: string | null; unit: string; qty: number;
  }>;
  const quoteByProduct = new Map(quoteLines.map((line) => [line.productId, line]));
  const lines = products.map((product) => {
    const line = quoteByProduct.get(product.productId);
    if (!line || line.qty !== product.qty || !Number.isSafeInteger(line.unitPrice) ||
        !Number.isSafeInteger(line.lineDiscount) || !Number.isSafeInteger(line.lineTotal)) {
      throw new Error('Stored counter order lines are invalid.');
    }
    return {
      nameRu: product.nameRu,
      nameUz: product.nameUz,
      qty: product.qty,
      unit: product.unit,
      unitPrice: line.unitPrice as number,
      lineDiscount: line.lineDiscount as number,
      lineTotal: line.lineTotal as number,
    };
  });
  if (lines.length !== quoteLines.length) throw new Error('Stored counter order lines do not balance.');
  const durationMs = Date.parse(order.expiresAt) - Date.parse(order.createdAt);
  const snapshot: ReceiptSnapshot = {
    number: order.number,
    documentLabel: 'counter_order',
    reservationHours: Math.round(durationMs / 3_600_000),
    reservationExpiresAt: order.expiresAt,
    createdAt: order.createdAt,
    cashier: order.cashier,
    customer: order.customer,
    storeName: order.storeName,
    address: order.address,
    phone: order.phone,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    total: order.total,
    paidTotal: 0,
    debtAmount: 0,
    lines,
    payments: [],
  };
  return JSON.stringify(snapshot);
}

export function captureReturnPrintSnapshot(db: Db, returnId: string): string {
  const result = db.prepare(
    `SELECT r.number, r.created_at AS createdAt, r.total_refund AS subtotal,
            r.total_refund AS total, r.user_id, s.customer_id,
            COALESCE(s.customer_name, c.name, s.number) AS customer,
            u.full_name AS cashier, b.name AS storeName, b.address, b.phone,
            s.branch_id
     FROM returns r
     JOIN sales s ON s.id = r.sale_id
     JOIN users u ON u.id = r.user_id
     JOIN branches b ON b.id = s.branch_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE r.id = ?`,
  ).get(returnId) as {
    number: string; createdAt: string; subtotal: number; total: number; user_id: string;
    customer_id: string | null; customer: string; cashier: string; storeName: string;
    address: string | null; phone: string | null; branch_id: string;
  } | undefined;
  if (!result) throw new Error(`Print source return was not found: ${returnId}`);
  const debtOffset = db.prepare(
    `SELECT COALESCE(-SUM(amount), 0) AS amount FROM debt_ledger
     WHERE return_id = ? AND type = 'DEBT_PAY'`,
  ).get(returnId) as { amount: number };
  const paidTotal = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS amount FROM payments
     WHERE return_id = ? AND direction = 'out'`,
  ).get(returnId) as { amount: number };
  const lines = db.prepare(
    `SELECT p.name_ru AS nameRu, p.name_uz AS nameUz, rl.qty, p.unit,
            sl.unit_price AS unitPrice, 0 AS lineDiscount, rl.refund_amount AS lineTotal
     FROM return_lines rl
     JOIN sale_lines sl ON sl.id = rl.sale_line_id
     JOIN products p ON p.id = sl.product_id
     WHERE rl.return_id = ? ORDER BY rl.rowid`,
  ).all(returnId) as ReceiptSnapshot['lines'];
  const payments = db.prepare(
    `SELECT pm.name_ru AS methodNameRu, pm.name_uz AS methodNameUz, p.amount,
            NULL AS tendered, 0 AS change
     FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
     WHERE p.return_id = ? ORDER BY p.rowid`,
  ).all(returnId) as ReceiptSnapshot['payments'];
  const snapshot: ReceiptSnapshot = {
    number: result.number,
    documentLabel: 'return',
    createdAt: result.createdAt,
    cashier: result.cashier,
    customer: result.customer,
    storeName: result.storeName,
    address: result.address,
    phone: result.phone,
    subtotal: result.subtotal,
    discountTotal: 0,
    total: result.total,
    paidTotal: paidTotal.amount,
    debtAmount: debtOffset.amount,
    lines,
    payments,
  };
  return JSON.stringify(snapshot);
}

function isReceiptSnapshot(parsed: unknown): parsed is ReceiptSnapshot {
  const record = (candidate: unknown): candidate is Record<string, unknown> =>
    Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate);
  const integer = (candidate: unknown): candidate is number => Number.isSafeInteger(candidate);
  const nullableString = (candidate: unknown): candidate is string | null =>
    candidate === null || typeof candidate === 'string';
  if (!record(parsed)) return false;
  return typeof parsed.number === 'string' &&
      (parsed.documentLabel === undefined || parsed.documentLabel === null ||
        parsed.documentLabel === 'return' || parsed.documentLabel === 'counter_order') &&
      (parsed.reservationHours === undefined || parsed.reservationHours === null || integer(parsed.reservationHours)) &&
      (parsed.reservationExpiresAt === undefined || parsed.reservationExpiresAt === null ||
        typeof parsed.reservationExpiresAt === 'string') &&
      typeof parsed.createdAt === 'string' &&
      typeof parsed.cashier === 'string' &&
      typeof parsed.customer === 'string' &&
      typeof parsed.storeName === 'string' &&
      nullableString(parsed.address) &&
      nullableString(parsed.phone) &&
      [parsed.subtotal, parsed.discountTotal, parsed.total, parsed.paidTotal, parsed.debtAmount].every(integer) &&
      Array.isArray(parsed.lines) && parsed.lines.every((line: unknown) =>
        record(line) && typeof line.nameRu === 'string' && nullableString(line.nameUz) &&
        typeof line.unit === 'string' && integer(line.qty) && integer(line.unitPrice) &&
        integer(line.lineDiscount) && integer(line.lineTotal)) &&
      Array.isArray(parsed.payments) && parsed.payments.every((payment: unknown) =>
        record(payment) && typeof payment.methodNameRu === 'string' && nullableString(payment.methodNameUz) &&
        integer(payment.amount) && (payment.tendered === null || integer(payment.tendered)) &&
        integer(payment.change));
}

function parseSnapshot(value: string): ReceiptSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error('Stored print receipt snapshot is invalid.', { cause: error });
  }
  if (!isReceiptSnapshot(parsed)) {
    throw new Error('Stored print receipt snapshot is invalid.');
  }
  return parsed;
}

function getReceiptData(db: Db, job: PrintJobRow): ReceiptData {
  if (job.doc_type !== 'sale' && job.doc_type !== 'return' && job.doc_type !== 'counter_order') {
    throw new Error(`Unsupported print document type: ${job.doc_type}`);
  }
  const footer = db.prepare('SELECT value FROM settings WHERE key = ?')
    .get(job.lang === 'uz' ? 'receipt_footer_uz' : 'receipt_footer_ru') as { value: string } | undefined;
  const snapshot = parseSnapshot(job.snapshot_json ?? (job.doc_type === 'sale'
    ? captureSalePrintSnapshot(db, job.doc_id)
    : job.doc_type === 'return'
      ? captureReturnPrintSnapshot(db, job.doc_id)
      : captureCounterOrderPrintSnapshot(db, job.doc_id)));
  return receiptDataFromSnapshot(snapshot, job.lang, footer?.value ?? '', job.kind === 'copy');
}

function claimNextJob(db: Db): PrintJobRow | null {
  return inTransaction(db, () => {
    const job = db.prepare(
      `SELECT id, doc_type, doc_id, kind, status, attempts, error, lang, snapshot_json
       FROM print_jobs WHERE status = 'pending'
       ORDER BY created_at, id LIMIT 1`,
    ).get() as PrintJobRow | undefined;
    if (!job) return null;
    const updated = db.prepare(
      `UPDATE print_jobs SET status = 'printing', attempts = attempts + 1, updated_at = ?
       WHERE id = ? AND status = 'pending'`,
    ).run(nowIso(), job.id);
    if (updated.changes !== 1) return null;
    return { ...job, status: 'printing', attempts: job.attempts + 1 };
  });
}

export function recoverInterruptedPrintJobs(db: Db): number {
  return inTransaction(db, () => {
    const now = nowIso();
    const result = db.prepare(
      `UPDATE print_jobs
       SET status = 'uncertain', error = 'Interrupted while sending to printer; verify paper before retry.',
           updated_at = ?
       WHERE status = 'printing'`,
    ).run(now);
    return result.changes;
  });
}

export async function processNextPrintJob(db: Db, driver: PrintDriver): Promise<boolean> {
  if (activePrinters.has(db)) return false;
  activePrinters.add(db);
  try {
    const job = claimNextJob(db);
    if (!job) return false;
    try {
      await driver.print(getReceiptData(db, job));
      db.prepare(
        `UPDATE print_jobs SET status = 'printed', error = NULL, updated_at = ?
         WHERE id = ? AND status = 'printing'`,
      ).run(nowIso(), job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextStatus = error instanceof PrintOutcomeUncertainError
        ? 'uncertain'
        : job.attempts >= 3 ? 'error' : 'pending';
      db.prepare(
        `UPDATE print_jobs SET status = ?, error = ?, updated_at = ?
         WHERE id = ? AND status = 'printing'`,
      ).run(nextStatus, message.slice(0, 1000), nowIso(), job.id);
      console.error(`Print job ${job.id} attempt ${job.attempts} failed: ${message}`);
    }
    return true;
  } finally {
    activePrinters.delete(db);
  }
}

export async function startPrintWorker(
  db: Db,
  driver: PrintDriver,
  pollIntervalMs = 1000,
): Promise<() => Promise<void>> {
  const recovered = recoverInterruptedPrintJobs(db);
  if (recovered > 0) console.warn(`Marked ${recovered} interrupted print job(s) as uncertain.`);
  let stopped = false;
  const workerPromise = (async (): Promise<void> => {
    while (!stopped) {
      const processed = await processNextPrintJob(db, driver);
      if (!processed) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  })();
  workerPromise.catch((error: unknown) => console.error('Print queue worker stopped unexpectedly:', error));
  return async () => {
    stopped = true;
    await workerPromise;
  };
}
