import type { Db } from '../../db/connection';
import { parseMoney } from '../../core/money';
import { AuthError } from '../auth/service';

const PAGE_SIZE = 50;
const MAX_PAGE = 10_000;

export interface CustomerListFilters {
  search?: string;
  includeInactive?: boolean;
  page?: number;
}

export interface ReceiptSearchFilters {
  search?: string;
  from?: string;
  to?: string;
  userId?: string;
  methodId?: string;
  status?: 'paid' | 'debt';
  minTotal?: string;
  maxTotal?: string;
  returned?: boolean;
  page?: number;
}

function normalizeText(value: unknown, key: string, maxLength: number): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AuthError(400, key);
  }
  return value.trim() || undefined;
}

function normalizePage(value: unknown): number {
  if (value === undefined || value === '') return 1;
  const page = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new AuthError(400, 'validation.invalid_data');
  }
  return page;
}

function validDate(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeCustomerFilters(input: unknown): Required<Pick<CustomerListFilters, 'page'>> &
  Omit<CustomerListFilters, 'page'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['search', 'includeInactive', 'page'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (row.includeInactive !== undefined && row.includeInactive !== 'true' && row.includeInactive !== true &&
      row.includeInactive !== 'false' && row.includeInactive !== false) {
    throw new AuthError(400, 'validation.invalid_data');
  }
  return {
    search: normalizeText(row.search, 'customers.invalid_search', 120),
    includeInactive: row.includeInactive === true || row.includeInactive === 'true',
    page: normalizePage(row.page),
  };
}

function normalizeReceiptFilters(input: unknown): Required<Pick<ReceiptSearchFilters, 'page'>> &
  Omit<ReceiptSearchFilters, 'page'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  const allowed = new Set([
    'search', 'from', 'to', 'userId', 'methodId', 'status', 'minTotal', 'maxTotal', 'returned', 'page',
  ]);
  if (Object.keys(row).some((key) => !allowed.has(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  const search = normalizeText(row.search, 'receipts.invalid_search', 120);
  const from = normalizeText(row.from, 'receipts.invalid_date', 10);
  const to = normalizeText(row.to, 'receipts.invalid_date', 10);
  if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
    throw new AuthError(400, 'receipts.invalid_date');
  }
  const userId = normalizeText(row.userId, 'receipts.invalid_filter', 64);
  const methodId = normalizeText(row.methodId, 'receipts.invalid_filter', 64);
  if (row.status !== undefined && row.status !== '' && row.status !== 'paid' && row.status !== 'debt') {
    throw new AuthError(400, 'receipts.invalid_filter');
  }
  let minTotal: string | undefined;
  let maxTotal: string | undefined;
  try {
    minTotal = normalizeText(row.minTotal, 'receipts.invalid_amount', 24);
    maxTotal = normalizeText(row.maxTotal, 'receipts.invalid_amount', 24);
    if (minTotal !== undefined && parseMoney(minTotal) < 0 ||
        maxTotal !== undefined && parseMoney(maxTotal) < 0 ||
        minTotal !== undefined && maxTotal !== undefined && parseMoney(minTotal) > parseMoney(maxTotal)) {
      throw new Error('invalid_amount_range');
    }
  } catch {
    throw new AuthError(400, 'receipts.invalid_amount');
  }
  if (row.returned !== undefined && row.returned !== 'true' && row.returned !== 'false' &&
      row.returned !== true && row.returned !== false) {
    throw new AuthError(400, 'receipts.invalid_filter');
  }
  return {
    search,
    from,
    to,
    userId,
    methodId,
    status: row.status === 'paid' || row.status === 'debt' ? row.status : undefined,
    minTotal,
    maxTotal,
    returned: row.returned === true || row.returned === 'true'
      ? true
      : row.returned === false || row.returned === 'false' ? false : undefined,
    page: normalizePage(row.page),
  };
}

function pageBounds(page: number): { limit: number; offset: number } {
  return { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
}

function likePattern(value: string): string {
  return `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
}

export function listCustomers(db: Db, input: unknown) {
  const filters = normalizeCustomerFilters(input);
  const where: string[] = [];
  const params: unknown[] = [];
  if (!filters.includeInactive) where.push('c.active = 1');
  if (filters.search) {
    const pattern = likePattern(filters.search);
    where.push("(c.name COLLATE NOCASE LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = pageBounds(filters.page);
  const rows = db.prepare(
    `SELECT c.id, c.name, c.phone, c.note, c.discount_bp AS discountBp, c.active,
            COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.customer_id = c.id), 0) AS balance
     FROM customers c ${whereSql}
     ORDER BY c.name COLLATE NOCASE, c.id LIMIT ? OFFSET ?`,
  ).all(...params, limit + 1, offset) as Array<{
    id: string; name: string; phone: string | null; note: string | null;
    discountBp: number; active: number; balance: number;
  }>;
  return {
    rows: rows.slice(0, limit),
    page: filters.page,
    hasMore: rows.length > limit,
  };
}

export function getCustomer(db: Db, customerId: string) {
  const customer = db.prepare(
    `SELECT c.id, c.name, c.phone, c.note, c.discount_bp AS discountBp, c.active,
            COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.customer_id = c.id), 0) AS balance
     FROM customers c WHERE c.id = ?`,
  ).get(customerId);
  if (!customer) throw new AuthError(404, 'customers.not_found');
  return customer;
}

export function listCustomerSales(db: Db, customerId: string, pageInput: unknown) {
  getCustomer(db, customerId);
  const page = normalizePage(pageInput);
  const { limit, offset } = pageBounds(page);
  const rows = db.prepare(
    `SELECT s.id, s.number, s.created_at AS createdAt, u.full_name AS seller,
            s.total,
            s.paid_total + COALESCE((
              SELECT SUM(a.amount) FROM debt_payment_allocations a WHERE a.sale_id = s.id
            ), 0) AS paidTotal,
            COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.sale_id = s.id), 0) AS debtAmount,
            COALESCE((SELECT SUM(r.total_refund) FROM returns r WHERE r.sale_id = s.id), 0) AS refunded
     FROM sales s JOIN users u ON u.id = s.user_id
     WHERE s.customer_id = ?
     ORDER BY s.created_at DESC, s.number DESC
     LIMIT ? OFFSET ?`,
  ).all(customerId, limit + 1, offset) as Array<Record<string, unknown>>;
  return { rows: rows.slice(0, limit), page, hasMore: rows.length > limit };
}

export function getReceiptDetails(db: Db, saleId: string, language: 'ru' | 'uz' = 'ru') {
  const methodName = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  const sale = db.prepare(
    `SELECT s.id, s.number, s.created_at AS createdAt, s.customer_id AS customerId,
            COALESCE(s.customer_name, c.name, '') AS customerName, c.phone AS customerPhone,
            u.full_name AS seller, s.subtotal, s.discount_total AS discountTotal,
            s.total,
            s.paid_total + COALESCE((
              SELECT SUM(a.amount) FROM debt_payment_allocations a WHERE a.sale_id = s.id
            ), 0) AS paidTotal,
            COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.sale_id = s.id), 0) AS debtAmount
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  ).get(saleId) as Record<string, unknown> | undefined;
  if (!sale) throw new AuthError(404, 'receipts.not_found');
  const lines = db.prepare(
    `SELECT p.sku, p.name_ru AS name, p.unit, sl.qty, sl.unit_price AS unitPrice,
            sl.line_discount AS lineDiscount, sl.line_total AS lineTotal
     FROM sale_lines sl JOIN products p ON p.id = sl.product_id
     WHERE sl.sale_id = ? ORDER BY sl.rowid`,
  ).all(saleId);
  const payments = db.prepare(
    `SELECT method, amount, tendered, change FROM (
       SELECT ${methodName} AS method, p.amount, p.tendered,
              CASE WHEN p.tendered IS NULL THEN 0 ELSE p.tendered - p.amount END AS change,
              p.created_at AS createdAt, p.rowid AS rowOrder
       FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
       WHERE p.sale_id = ? AND p.purpose = 'sale'
       UNION ALL
       SELECT ${methodName} AS method, a.amount, NULL AS tendered, 0 AS change,
              p.created_at AS createdAt, p.rowid AS rowOrder
       FROM debt_payment_allocations a
       JOIN payments p ON p.id = a.payment_id
       JOIN payment_methods pm ON pm.id = p.method_id
       WHERE a.sale_id = ? AND p.purpose = 'debt_payment'
     ) ORDER BY createdAt, rowOrder`,
  ).all(saleId, saleId);
  const returns = db.prepare(
    `SELECT r.id, r.number, r.created_at AS createdAt, r.reason, r.total_refund AS totalRefund,
            u.full_name AS seller
     FROM returns r JOIN users u ON u.id = r.user_id
     WHERE r.sale_id = ? ORDER BY r.created_at DESC, r.number`,
  ).all(saleId);
  return { sale, lines, payments, returns };
}

export function getReceiptSearchOptions(db: Db, language: 'ru' | 'uz' = 'ru') {
  const methodName = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  return {
    users: db.prepare(
      `SELECT DISTINCT u.id, u.full_name AS fullName
       FROM users u JOIN sales s ON s.user_id = u.id
       WHERE u.active = 1 ORDER BY u.full_name, u.id`,
    ).all(),
    methods: db.prepare(
      `SELECT pm.id, ${methodName} AS name
       FROM payment_methods pm
       WHERE EXISTS (
         SELECT 1 FROM payments p WHERE p.method_id = pm.id AND p.purpose = 'sale'
       ) OR EXISTS (
         SELECT 1 FROM payments p
         JOIN debt_payment_allocations a ON a.payment_id = p.id
         WHERE p.method_id = pm.id AND p.purpose = 'debt_payment'
       )
       ORDER BY name, pm.id`,
    ).all(),
  };
}

export function searchReceipts(db: Db, input: unknown) {
  const filters = normalizeReceiptFilters(input);
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    const pattern = likePattern(filters.search);
    where.push(`(
      s.number COLLATE NOCASE LIKE ? ESCAPE '\\' OR c.name COLLATE NOCASE LIKE ? ESCAPE '\\'
      OR c.phone LIKE ? ESCAPE '\\' OR s.customer_name COLLATE NOCASE LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM sale_lines sl JOIN products p ON p.id = sl.product_id
        WHERE sl.sale_id = s.id AND (p.sku COLLATE NOCASE LIKE ? ESCAPE '\\'
          OR p.name_ru COLLATE NOCASE LIKE ? ESCAPE '\\' OR p.name_uz COLLATE NOCASE LIKE ? ESCAPE '\\')
      )
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (filters.from) {
    where.push('s.created_at >= ?');
    params.push(new Date(`${filters.from}T00:00:00+05:00`).toISOString());
  }
  if (filters.to) {
    const upperBound = new Date(`${filters.to}T00:00:00+05:00`);
    upperBound.setUTCDate(upperBound.getUTCDate() + 1);
    where.push('s.created_at < ?');
    params.push(upperBound.toISOString());
  }
  if (filters.userId) {
    where.push('s.user_id = ?');
    params.push(filters.userId);
  }
  if (filters.methodId) {
    where.push(`EXISTS (
      SELECT 1 FROM payments p
      WHERE p.sale_id = s.id AND p.purpose = 'sale' AND p.method_id = ?
      UNION ALL
      SELECT 1 FROM debt_payment_allocations a
      JOIN payments p ON p.id = a.payment_id
      WHERE a.sale_id = s.id AND p.purpose = 'debt_payment' AND p.method_id = ?
    )`);
    params.push(filters.methodId, filters.methodId);
  }
  if (filters.status === 'paid') {
    where.push('COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.sale_id = s.id), 0) = 0');
  }
  if (filters.status === 'debt') {
    where.push('COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.sale_id = s.id), 0) > 0');
  }
  if (filters.minTotal !== undefined) {
    where.push('s.total >= ?');
    params.push(parseMoney(filters.minTotal));
  }
  if (filters.maxTotal !== undefined) {
    where.push('s.total <= ?');
    params.push(parseMoney(filters.maxTotal));
  }
  if (filters.returned !== undefined) {
    where.push(filters.returned
      ? 'EXISTS (SELECT 1 FROM returns r WHERE r.sale_id = s.id)'
      : 'NOT EXISTS (SELECT 1 FROM returns r WHERE r.sale_id = s.id)');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { limit, offset } = pageBounds(filters.page);
  const rows = db.prepare(
    `SELECT s.id, s.number, s.created_at AS createdAt, s.total,
            s.paid_total + COALESCE((
              SELECT SUM(a.amount) FROM debt_payment_allocations a WHERE a.sale_id = s.id
            ), 0) AS paidTotal,
            COALESCE((SELECT SUM(dl.amount) FROM debt_ledger dl WHERE dl.sale_id = s.id), 0) AS debtAmount,
            COALESCE(c.name, s.customer_name, '') AS customerName,
            u.full_name AS seller,
            COALESCE((SELECT SUM(r.total_refund) FROM returns r WHERE r.sale_id = s.id), 0) AS refunded
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.user_id
     ${whereSql}
     ORDER BY s.created_at DESC, s.number DESC
     LIMIT ? OFFSET ?`,
  ).all(...params, limit + 1, offset) as Array<Record<string, unknown>>;
  return { rows: rows.slice(0, limit), page: filters.page, hasMore: rows.length > limit };
}
