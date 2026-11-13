import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
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
  const filter = isAdmin ? '' : 'AND s.user_id = ?';
  const rows = db.prepare(
    `SELECT pj.id, pj.doc_type, s.number, pj.kind, pj.status, pj.attempts, pj.error, pj.lang,
            pj.created_at, u.full_name AS cashier
     FROM print_jobs pj
     JOIN sales s ON pj.doc_type = 'sale' AND s.id = pj.doc_id
     JOIN users u ON u.id = s.user_id
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
      `SELECT pj.id, pj.status, pj.doc_type, pj.doc_id, pj.snapshot_json, s.user_id
       FROM print_jobs pj
       JOIN sales s ON pj.doc_type = 'sale' AND s.id = pj.doc_id
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

function isReceiptSnapshot(parsed: unknown): parsed is ReceiptSnapshot {
  const record = (candidate: unknown): candidate is Record<string, unknown> =>
    Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate);
  const integer = (candidate: unknown): candidate is number => Number.isSafeInteger(candidate);
  const nullableString = (candidate: unknown): candidate is string | null =>
    candidate === null || typeof candidate === 'string';
  if (!record(parsed)) return false;
  return typeof parsed.number === 'string' &&
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
  if (job.doc_type !== 'sale') throw new Error(`Unsupported print document type: ${job.doc_type}`);
  const footer = db.prepare('SELECT value FROM settings WHERE key = ?')
    .get(job.lang === 'uz' ? 'receipt_footer_uz' : 'receipt_footer_ru') as { value: string } | undefined;
  const snapshot = parseSnapshot(job.snapshot_json ?? captureSalePrintSnapshot(db, job.doc_id));
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
