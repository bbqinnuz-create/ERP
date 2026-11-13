import type { Db } from '../../db/connection';
import { roundDiv } from '../../core/money';
import { hasPermission } from '../auth/permissions';
import { AuthError } from '../auth/service';

export const REPORT_TYPES = [
  'sales_by_day',
  'sales_by_product',
  'sales_by_category',
  'sales_by_cashier',
  'sales_by_payment_method',
  'cashier_summary',
  'profit_by_sale',
  'profit_by_product',
  'profit_by_category',
  'stock',
  'low_stock',
  'stock_valuation',
  'movements',
  'discounts',
  'returns',
  'writeoffs',
  'debt_balances',
  'debt_history',
  'cash',
  'noncash',
  'reservations',
  'audit',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

const MAX_REPORT_ROWS = 10_000;

export interface ReportFilters {
  type: ReportType;
  from?: string;
  to?: string;
  warehouseId?: string;
  productId?: string;
  userId?: string;
}

export const REPORT_FILTERS: Record<ReportType, readonly (keyof Omit<ReportFilters, 'type'>)[]> = {
  sales_by_day: ['from', 'to', 'userId'],
  sales_by_product: ['from', 'to', 'productId', 'userId'],
  sales_by_category: ['from', 'to', 'productId', 'userId'],
  sales_by_cashier: ['from', 'to', 'userId'],
  sales_by_payment_method: ['from', 'to', 'userId'],
  cashier_summary: ['from', 'to', 'productId', 'userId'],
  profit_by_sale: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  profit_by_product: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  profit_by_category: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  stock: ['warehouseId', 'productId'],
  low_stock: ['warehouseId', 'productId'],
  stock_valuation: ['warehouseId', 'productId'],
  movements: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  discounts: ['from', 'to', 'productId', 'userId'],
  returns: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  writeoffs: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  debt_balances: ['userId'],
  debt_history: ['from', 'to', 'userId'],
  cash: ['from', 'to', 'userId'],
  noncash: ['from', 'to', 'userId'],
  reservations: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  audit: ['from', 'to', 'userId'],
};

export interface ReportResult {
  type: ReportType;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
  summary?: Record<string, number>;
}

const REPORT_COLUMNS: Record<ReportType, string[]> = {
  sales_by_day: ['date', 'salesCount', 'subtotal', 'discount', 'total', 'paid', 'debt'],
  sales_by_product: ['sku', 'product', 'category', 'qty', 'sales', 'discount', 'returns', 'netSales'],
  sales_by_category: ['category', 'qty', 'sales', 'discount', 'returns', 'netSales'],
  sales_by_cashier: ['user', 'salesCount', 'subtotal', 'discount', 'total', 'paid', 'debt'],
  sales_by_payment_method: ['method', 'purpose', 'direction', 'payments', 'amount'],
  cashier_summary: ['user', 'salesCount', 'qty', 'salesTotal', 'discount', 'returns', 'returnQty'],
  profit_by_sale: ['number', 'date', 'customer', 'sales', 'returns', 'netSales', 'cost', 'profit'],
  profit_by_product: ['sku', 'product', 'category', 'qty', 'netSales', 'cost', 'profit'],
  profit_by_category: ['category', 'qty', 'netSales', 'cost', 'profit'],
  stock: ['sku', 'product', 'category', 'warehouse', 'qty', 'reserved', 'available', 'minStock'],
  low_stock: ['sku', 'product', 'category', 'warehouse', 'qty', 'reserved', 'available', 'minStock'],
  stock_valuation: ['sku', 'product', 'warehouse', 'batch', 'receivedAt', 'qty', 'unitCost', 'value'],
  movements: ['date', 'sku', 'product', 'warehouse', 'type', 'qty', 'document', 'user', 'unitCost', 'note'],
  discounts: ['date', 'sale', 'product', 'kind', 'amount', 'percentBp', 'user', 'approvedBy'],
  returns: ['date', 'number', 'sale', 'reason', 'user', 'lines', 'qty', 'amount', 'cost'],
  writeoffs: ['date', 'number', 'reason', 'warehouse', 'user', 'lines', 'qty', 'cost'],
  debt_balances: ['customer', 'sale', 'date', 'total', 'balance'],
  debt_history: ['date', 'customer', 'sale', 'type', 'amount', 'payment', 'method', 'allocated', 'user', 'note'],
  cash: ['date', 'document', 'type', 'amount', 'method', 'user'],
  noncash: ['method', 'received', 'returned', 'net', 'payments'],
  reservations: ['date', 'customer', 'cart', 'product', 'warehouse', 'qty', 'status', 'expiresAt'],
  audit: ['date', 'user', 'action', 'entity', 'entityId', 'before', 'after'],
};

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeFilters(input: unknown): ReportFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'report.invalid_filters');
  }
  const row = input as Record<string, unknown>;
  const allowed = new Set(['type', 'from', 'to', 'warehouseId', 'productId', 'userId']);
  if (Object.keys(row).some((key) => !allowed.has(key))) throw new AuthError(400, 'validation.unknown_field');
  if (typeof row.type !== 'string' || !REPORT_TYPES.includes(row.type as ReportType)) {
    throw new AuthError(400, 'report.invalid_type');
  }
  const type = row.type as ReportType;
  const supportedFilters = REPORT_FILTERS[type];
  if (Object.keys(row).some((key) =>
    key !== 'type' && row[key] !== undefined &&
      !supportedFilters.includes(key as keyof Omit<ReportFilters, 'type'>))) {
    throw new AuthError(400, 'report.filter_not_supported');
  }
  for (const key of ['from', 'to'] as const) {
    if (row[key] !== undefined && !isValidDate(row[key])) throw new AuthError(400, 'validation.invalid_date');
  }
  const from = row.from as string | undefined;
  const to = row.to as string | undefined;
  if (from && to && from > to) throw new AuthError(400, 'report.invalid_period');
  const filters: ReportFilters = { type, from, to };
  for (const key of ['warehouseId', 'productId', 'userId'] as const) {
    const value = row[key];
    if (value !== undefined) {
      if (typeof value !== 'string' || value.length < 1 || value.length > 64) {
        throw new AuthError(400, 'report.invalid_filters');
      }
      filters[key] = value;
    }
  }
  return filters;
}

function periodWhere(column: string, filters: ReportFilters): { sql: string; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filters.from) {
    conditions.push(`date(${column}, '+05:00') >= ?`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`date(${column}, '+05:00') <= ?`);
    params.push(filters.to);
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function addCondition(where: { sql: string; params: unknown[] }, condition: string, value: unknown): void {
  where.sql = where.sql ? `${where.sql} AND ${condition}` : `WHERE ${condition}`;
  where.params.push(value);
}

function boundedRows(db: Db, sql: string, params: unknown[] = []): { rows: Array<Record<string, unknown>>; truncated: boolean } {
  const rows = db.prepare(`${sql} LIMIT ?`).all(...params, MAX_REPORT_ROWS + 1) as Array<Record<string, unknown>>;
  return { rows: rows.slice(0, MAX_REPORT_ROWS), truncated: rows.length > MAX_REPORT_ROWS };
}

function localizedName(language: 'ru' | 'uz', alias: string): string {
  return language === 'uz' ? `COALESCE(${alias}.name_uz, ${alias}.name_ru)` : `${alias}.name_ru`;
}

function safeInteger(value: bigint, errorKey: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new AuthError(409, errorKey);
  }
  return Number(value);
}

function reportSalesByDay(db: Db, filters: ReportFilters) {
  const where = periodWhere('s.created_at', filters);
  if (filters.userId) addCondition(where, 's.user_id = ?', filters.userId);
  return boundedRows(db,
    `SELECT date(s.created_at, '+05:00') AS date, COUNT(*) AS salesCount,
            SUM(s.subtotal) AS subtotal, SUM(s.discount_total) AS discount,
            SUM(s.total) AS total, SUM(s.paid_total) AS paid, SUM(s.debt_amount) AS debt
     FROM sales s ${where.sql}
     GROUP BY date(s.created_at, '+05:00') ORDER BY date DESC`,
    where.params);
}

function reportSalesByProduct(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('s.created_at', filters);
  if (filters.productId) addCondition(where, 'sl.product_id = ?', filters.productId);
  if (filters.userId) addCondition(where, 's.user_id = ?', filters.userId);
  const returnWhere = periodWhere('r.created_at', filters);
  if (filters.productId) addCondition(returnWhere, 'sl.product_id = ?', filters.productId);
  if (filters.userId) addCondition(returnWhere, 'r.user_id = ?', filters.userId);
  const name = localizedName(language, 'p');
  return boundedRows(db,
    `WITH sold AS (
       SELECT sl.product_id, SUM(sl.qty) AS qty, SUM(sl.line_total) AS sales,
              SUM(sl.line_discount) AS discount
       FROM sale_lines sl JOIN sales s ON s.id = sl.sale_id ${where.sql}
       GROUP BY sl.product_id
     ), returned AS (
       SELECT sl.product_id, SUM(rl.qty) AS qty, SUM(rl.refund_amount) AS amount
       FROM return_lines rl JOIN returns r ON r.id = rl.return_id
       JOIN sale_lines sl ON sl.id = rl.sale_line_id
       ${returnWhere.sql}
       GROUP BY sl.product_id
     )
     SELECT p.sku, ${name} AS product, ${localizedName(language, 'c')} AS category,
            COALESCE(sold.qty, 0) AS qty, COALESCE(sold.sales, 0) AS sales,
            COALESCE(sold.discount, 0) AS discount, COALESCE(returned.amount, 0) AS returns,
            COALESCE(sold.sales, 0) - COALESCE(returned.amount, 0) AS netSales
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN sold ON sold.product_id = p.id LEFT JOIN returned ON returned.product_id = p.id
     WHERE sold.product_id IS NOT NULL OR returned.product_id IS NOT NULL
     ORDER BY product, p.sku`,
    [...where.params, ...returnWhere.params]);
}

function reportSalesByCategory(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const salesPeriod = periodWhere('s.created_at', filters);
  const returnPeriod = periodWhere('r.created_at', filters);
  if (filters.userId) addCondition(salesPeriod, 's.user_id = ?', filters.userId);
  if (filters.productId) addCondition(salesPeriod, 'sl.product_id = ?', filters.productId);
  if (filters.userId) addCondition(returnPeriod, 'r.user_id = ?', filters.userId);
  if (filters.productId) addCondition(returnPeriod, 'sl.product_id = ?', filters.productId);
  const category = localizedName(language, 'c');
  return boundedRows(db,
    `WITH sold AS (
       SELECT p.category_id, SUM(sl.qty) AS qty, SUM(sl.line_total) AS sales,
              SUM(sl.line_discount) AS discount
       FROM sale_lines sl JOIN sales s ON s.id = sl.sale_id
       JOIN products p ON p.id = sl.product_id ${salesPeriod.sql}
       GROUP BY p.category_id
     ), returned AS (
       SELECT p.category_id, SUM(rl.refund_amount) AS amount
       FROM return_lines rl JOIN returns r ON r.id = rl.return_id
       JOIN sale_lines sl ON sl.id = rl.sale_line_id
       JOIN products p ON p.id = sl.product_id ${returnPeriod.sql}
       GROUP BY p.category_id
     )
     SELECT COALESCE(${category}, '') AS category, COALESCE(sold.qty, 0) AS qty,
            COALESCE(sold.sales, 0) AS sales, COALESCE(sold.discount, 0) AS discount,
            COALESCE(returned.amount, 0) AS returns,
            COALESCE(sold.sales, 0) - COALESCE(returned.amount, 0) AS netSales
     FROM sold LEFT JOIN categories c ON c.id = sold.category_id
     LEFT JOIN returned ON returned.category_id IS sold.category_id
     UNION ALL
     SELECT COALESCE(${category}, '') AS category, 0 AS qty, 0 AS sales, 0 AS discount,
            returned.amount AS returns, -returned.amount AS netSales
     FROM returned LEFT JOIN categories c ON c.id = returned.category_id
     WHERE NOT EXISTS (SELECT 1 FROM sold WHERE sold.category_id IS returned.category_id)
     ORDER BY category`,
    [...salesPeriod.params, ...returnPeriod.params]);
}

function reportSalesByCashier(db: Db, filters: ReportFilters) {
  const where = periodWhere('s.created_at', filters);
  if (filters.userId) addCondition(where, 's.user_id = ?', filters.userId);
  return boundedRows(db,
    `SELECT u.full_name AS user, COUNT(*) AS salesCount, SUM(s.subtotal) AS subtotal,
            SUM(s.discount_total) AS discount, SUM(s.total) AS total,
            SUM(s.paid_total) AS paid, SUM(s.debt_amount) AS debt
     FROM sales s JOIN users u ON u.id = s.user_id ${where.sql}
     GROUP BY s.user_id ORDER BY user`,
    where.params);
}

function reportSalesByPaymentMethod(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('p.created_at', filters);
  if (filters.userId) addCondition(where, 'p.user_id = ?', filters.userId);
  const method = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  return boundedRows(db,
    `SELECT ${method} AS method, p.purpose, p.direction,
            COUNT(*) AS payments, SUM(p.amount) AS amount
     FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
     ${where.sql} GROUP BY pm.id, p.purpose, p.direction ORDER BY method, p.purpose, p.direction`,
    where.params);
}

function reportCashierSummary(db: Db, filters: ReportFilters) {
  const salesWhere = periodWhere('s.created_at', filters);
  if (filters.userId) addCondition(salesWhere, 's.user_id = ?', filters.userId);
  if (filters.productId) addCondition(salesWhere, 'sl.product_id = ?', filters.productId);
  const returnsWhere = periodWhere('r.created_at', filters);
  if (filters.userId) addCondition(returnsWhere, 'r.user_id = ?', filters.userId);
  if (filters.productId) addCondition(returnsWhere, 'sl.product_id = ?', filters.productId);
  return boundedRows(db,
    `WITH sale_lines_by_sale AS (
       SELECT s.id AS sale_id, s.user_id, SUM(sl.qty) AS qty,
              SUM(sl.line_total) AS salesTotal, SUM(sl.line_discount) AS discount
       FROM sales s JOIN sale_lines sl ON sl.sale_id = s.id ${salesWhere.sql}
       GROUP BY s.id
     ), sold AS (
       SELECT user_id, COUNT(*) AS salesCount, SUM(qty) AS qty,
              SUM(salesTotal) AS salesTotal, SUM(discount) AS discount
       FROM sale_lines_by_sale GROUP BY user_id
     ), returned AS (
       SELECT r.user_id, COUNT(DISTINCT r.id) AS returns, SUM(rl.qty) AS returnQty
       FROM returns r JOIN return_lines rl ON rl.return_id = r.id
       JOIN sale_lines sl ON sl.id = rl.sale_line_id ${returnsWhere.sql}
       GROUP BY r.user_id
     )
     SELECT u.full_name AS user, COALESCE(sold.salesCount, 0) AS salesCount,
            COALESCE(sold.qty, 0) AS qty, COALESCE(sold.salesTotal, 0) AS salesTotal,
            COALESCE(sold.discount, 0) AS discount, COALESCE(returned.returns, 0) AS returns,
            COALESCE(returned.returnQty, 0) AS returnQty
     FROM users u LEFT JOIN sold ON sold.user_id = u.id LEFT JOIN returned ON returned.user_id = u.id
     WHERE sold.user_id IS NOT NULL OR returned.user_id IS NOT NULL ORDER BY user`,
    [...salesWhere.params, ...returnsWhere.params]);
}

function reportProfit(
  db: Db,
  filters: ReportFilters,
  language: 'ru' | 'uz',
  type: 'profit_by_sale' | 'profit_by_product' | 'profit_by_category',
) {
  const salesPeriod = periodWhere('s.created_at', filters);
  const returnPeriod = periodWhere('r.created_at', filters);
  if (filters.userId) addCondition(salesPeriod, 's.user_id = ?', filters.userId);
  if (filters.productId) addCondition(salesPeriod, 'sl.product_id = ?', filters.productId);
  if (filters.userId) addCondition(returnPeriod, 'r.user_id = ?', filters.userId);
  if (filters.productId) addCondition(returnPeriod, 'sl.product_id = ?', filters.productId);
  if (filters.warehouseId) addCondition(salesPeriod, `EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.doc_type = 'sale' AND sm.doc_id = s.id
      AND sm.product_id = sl.product_id AND sm.warehouse_id = ?)`, filters.warehouseId);
  if (filters.warehouseId) addCondition(returnPeriod, `EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.doc_type = 'return' AND sm.doc_id = r.id
      AND sm.product_id = sl.product_id AND sm.warehouse_id = ?)`, filters.warehouseId);
  const saleGroup = type === 'profit_by_sale' ? 's.id' :
    type === 'profit_by_product' ? 'sl.product_id' : 'p.category_id';
  const saleIdentity = type === 'profit_by_sale'
    ? `s.number AS number, s.created_at AS date, s.customer_name AS customer`
    : type === 'profit_by_product'
      ? `p.sku, ${localizedName(language, 'p')} AS product, ${localizedName(language, 'c')} AS category`
      : `${localizedName(language, 'c')} AS category`;
  const returnEntity = type === 'profit_by_sale' ? 'r.sale_id' :
    type === 'profit_by_product' ? 'sl.product_id' : 'p.category_id';
  const returnSelect = type === 'profit_by_sale'
    ? 'r.sale_id AS entityId'
    : type === 'profit_by_product'
      ? 'sl.product_id AS entityId'
      : 'p.category_id AS entityId';
  const costSelect = type === 'profit_by_sale'
    ? 'SUM(sl.cost_total)'
    : 'SUM(sl.cost_total)';
  const salesId = type === 'profit_by_sale' ? 's.id' :
    type === 'profit_by_product' ? 'sl.product_id' : 'p.category_id';
  const salesSql = `SELECT ${salesId} AS entityId, ${saleIdentity},
       SUM(sl.qty) AS qty, SUM(sl.line_total) AS sales, 0 AS returns,
       SUM(sl.line_total) AS netSales, ${costSelect} AS cost,
       SUM(sl.line_total) - ${costSelect} AS profit
     FROM sales s JOIN sale_lines sl ON sl.sale_id = s.id
     JOIN products p ON p.id = sl.product_id LEFT JOIN categories c ON c.id = p.category_id
     ${salesPeriod.sql} GROUP BY ${saleGroup}`;
  const returnIdentity = type === 'profit_by_sale'
    ? 's.number AS number, s.created_at AS date, s.customer_name AS customer'
    : type === 'profit_by_product'
      ? `p.sku, ${localizedName(language, 'p')} AS product, ${localizedName(language, 'c')} AS category`
      : `${localizedName(language, 'c')} AS category`;
  const returnSql = `SELECT ${returnSelect}, ${returnIdentity},
       SUM(rl.qty) AS qty, 0 AS sales, SUM(rl.refund_amount) AS returns,
       -SUM(rl.refund_amount) AS netSales, -SUM(rl.cost_total) AS cost,
       SUM(rl.cost_total) - SUM(rl.refund_amount) AS profit
     FROM returns r JOIN return_lines rl ON rl.return_id = r.id
     JOIN sale_lines sl ON sl.id = rl.sale_line_id
     JOIN sales s ON s.id = r.sale_id
     JOIN products p ON p.id = sl.product_id LEFT JOIN categories c ON c.id = p.category_id
     ${returnPeriod.sql} GROUP BY ${returnEntity}`;
  const sql = `WITH sales_rows AS (${salesSql}), return_rows AS (${returnSql}),
    combined AS (
      SELECT * FROM sales_rows UNION ALL SELECT * FROM return_rows
    )
    SELECT ${type === 'profit_by_sale' ? 'number, MAX(date) AS date, MAX(customer) AS customer' :
      type === 'profit_by_product' ? 'sku, product, category' : 'category'},
      SUM(qty) AS qty, SUM(sales) AS sales, SUM(returns) AS returns,
      SUM(netSales) AS netSales, SUM(cost) AS cost, SUM(profit) AS profit
    FROM combined GROUP BY ${type === 'profit_by_sale' ? 'entityId' :
      type === 'profit_by_product' ? 'entityId' : 'entityId'}
    ORDER BY ${type === 'profit_by_sale' ? 'date DESC, number' : '1'}`;
  return boundedRows(db, sql, [...salesPeriod.params, ...returnPeriod.params]);
}

function reportStock(db: Db, filters: ReportFilters, language: 'ru' | 'uz', lowOnly: boolean) {
  const where = { sql: '', params: [] as unknown[] };
  if (filters.productId) addCondition(where, 'p.id = ?', filters.productId);
  if (filters.warehouseId) addCondition(where, 'w.id = ?', filters.warehouseId);
  if (lowOnly) {
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'min_stock_alerts'").get() as
      { value: string } | undefined;
    if (enabled?.value !== '1') return { rows: [], truncated: false };
    addCondition(where, 'p.min_stock IS NOT NULL AND COALESCE(sc.qty, 0) <= p.min_stock', null);
    where.params.pop();
  }
  const name = localizedName(language, 'p');
  const category = localizedName(language, 'c');
  return boundedRows(db,
    `SELECT p.sku, ${name} AS product, COALESCE(${category}, '') AS category,
            w.name AS warehouse, COALESCE(sc.qty, 0) AS qty,
            COALESCE(sc.reserved, 0) AS reserved,
            COALESCE(sc.qty, 0) - COALESCE(sc.reserved, 0) AS available,
            p.min_stock AS minStock
     FROM products p CROSS JOIN warehouses w
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN stock_cache sc ON sc.product_id = p.id AND sc.warehouse_id = w.id
     ${where.sql} ${where.sql ? 'AND' : 'WHERE'} p.active = 1 AND w.active = 1
     ORDER BY product, warehouse`,
    where.params);
}

function reportStockValuation(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = { sql: '', params: [] as unknown[] };
  if (filters.productId) addCondition(where, 'p.id = ?', filters.productId);
  if (filters.warehouseId) addCondition(where, 'w.id = ?', filters.warehouseId);
  const name = localizedName(language, 'p');
  const rows = db.prepare(
    `SELECT p.sku, ${name} AS product, w.name AS warehouse, b.id AS batch,
            b.received_at AS receivedAt, b.qty_left AS qty, b.unit_cost AS unitCost
     FROM batches b JOIN products p ON p.id = b.product_id
     JOIN warehouses w ON w.id = b.warehouse_id
     ${where.sql} ${where.sql ? 'AND' : 'WHERE'} p.active = 1 AND w.active = 1 AND b.qty_left > 0
     ORDER BY p.name_ru, w.name, b.received_at, b.id LIMIT ?`,
  ).all(...where.params, MAX_REPORT_ROWS + 1) as Array<Record<string, unknown> & {
    qty: number; unitCost: number;
  }>;
  const truncated = rows.length > MAX_REPORT_ROWS;
  const limitedRows = rows.slice(0, MAX_REPORT_ROWS).map((row) => {
    const value = roundDiv(BigInt(row.qty) * BigInt(row.unitCost), 1000n);
    return { ...row, value: safeInteger(value, 'report.amount_out_of_range') };
  });
  const total = limitedRows.reduce((sum, row) => sum + BigInt(row.value as number), 0n);
  return {
    rows: limitedRows,
    truncated,
    summary: { value: safeInteger(total, 'report.amount_out_of_range') },
  };
}

function reportMovements(db: Db, filters: ReportFilters, language: 'ru' | 'uz', viewCost: boolean) {
  const where = periodWhere('sm.created_at', filters) as { sql: string; params: unknown[] };
  if (filters.productId) addCondition(where, 'sm.product_id = ?', filters.productId);
  if (filters.warehouseId) addCondition(where, 'sm.warehouse_id = ?', filters.warehouseId);
  if (filters.userId) addCondition(where, 'sm.user_id = ?', filters.userId);
  return boundedRows(db,
    `SELECT sm.created_at AS date, p.sku, ${localizedName(language, 'p')} AS product,
            w.name AS warehouse, sm.type, sm.qty, sm.doc_type || ':' || sm.doc_id AS document,
            u.full_name AS user, ${viewCost ? 'sm.unit_cost AS unitCost' : 'NULL AS unitCost'},
            sm.note
     FROM stock_movements sm JOIN products p ON p.id = sm.product_id
     JOIN warehouses w ON w.id = sm.warehouse_id
     LEFT JOIN users u ON u.id = sm.user_id
     ${where.sql} ORDER BY sm.created_at DESC, sm.seq DESC`,
    where.params);
}

function reportDiscounts(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('s.created_at', filters);
  if (filters.userId) addCondition(where, 'COALESCE(sd.user_id, s.user_id) = ?', filters.userId);
  if (filters.productId) addCondition(where, 'sl.product_id = ?', filters.productId);
  return boundedRows(db,
    `SELECT s.created_at AS date, s.number AS sale,
            COALESCE(${localizedName(language, 'p')}, '') AS product, sd.kind,
            sd.amount, sd.percent_bp AS percentBp, u.full_name AS user,
            approver.full_name AS approvedBy
     FROM sale_discounts sd JOIN sales s ON s.id = sd.sale_id
     LEFT JOIN sale_lines sl ON sl.id = sd.sale_line_id
     LEFT JOIN products p ON p.id = sl.product_id
     LEFT JOIN users u ON u.id = COALESCE(sd.user_id, s.user_id)
     LEFT JOIN users approver ON approver.id = sd.approved_by
     ${where.sql} ORDER BY s.created_at DESC, s.number`,
    where.params);
}

function reportReturns(db: Db, filters: ReportFilters) {
  const where = periodWhere('r.created_at', filters);
  if (filters.userId) addCondition(where, 'r.user_id = ?', filters.userId);
  if (filters.productId) addCondition(where, `EXISTS (
    SELECT 1 FROM return_lines filtered_line
    JOIN sale_lines filtered_sale_line ON filtered_sale_line.id = filtered_line.sale_line_id
    WHERE filtered_line.return_id = r.id AND filtered_sale_line.product_id = ?)`, filters.productId);
  if (filters.warehouseId) addCondition(where, `EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.doc_type = 'return' AND sm.doc_id = r.id
      AND sm.warehouse_id = ?)`, filters.warehouseId);
  return boundedRows(db,
    `SELECT r.created_at AS date, r.number, s.number AS sale, r.reason,
            u.full_name AS user, COUNT(rl.id) AS lines, COALESCE(SUM(rl.qty), 0) AS qty,
            COALESCE(SUM(rl.refund_amount), 0) AS amount,
            COALESCE(SUM(rl.cost_total), 0) AS cost
     FROM returns r JOIN sales s ON s.id = r.sale_id JOIN users u ON u.id = r.user_id
     LEFT JOIN return_lines rl ON rl.return_id = r.id
     ${where.sql}
     GROUP BY r.id ORDER BY r.created_at DESC, r.number`,
    where.params);
}

function reportWriteoffs(db: Db, filters: ReportFilters) {
  const where = periodWhere('wo.created_at', filters);
  if (filters.userId) addCondition(where, 'wo.user_id = ?', filters.userId);
  if (filters.warehouseId) addCondition(where, 'wo.warehouse_id = ?', filters.warehouseId);
  if (filters.productId) addCondition(where, 'wol.product_id = ?', filters.productId);
  return boundedRows(db,
    `SELECT wo.created_at AS date, wo.number, wo.reason, w.name AS warehouse,
            u.full_name AS user, COUNT(wol.id) AS lines, SUM(wol.qty) AS qty,
            SUM(wol.cost_total) AS cost
     FROM write_offs wo JOIN warehouses w ON w.id = wo.warehouse_id
     JOIN users u ON u.id = wo.user_id JOIN write_off_lines wol ON wol.write_off_id = wo.id
     ${where.sql} GROUP BY wo.id ORDER BY wo.created_at DESC, wo.number`,
    where.params);
}

function reportDebtBalances(db: Db, filters: ReportFilters) {
  const where = { sql: '', params: [] as unknown[] };
  if (filters.userId) addCondition(where, 's.user_id = ?', filters.userId);
  const customerName = 'COALESCE(c.name, s.customer_name, \'\')';
  return boundedRows(db,
    `SELECT ${customerName} AS customer, s.number AS sale, s.created_at AS date, s.total AS total,
            SUM(dl.amount) AS balance
     FROM debt_ledger dl JOIN sales s ON s.id = dl.sale_id
     JOIN customers c ON c.id = dl.customer_id ${where.sql}
     GROUP BY dl.sale_id, dl.customer_id HAVING SUM(dl.amount) > 0
     ORDER BY customer, date, sale`,
    where.params);
}

function reportDebtHistory(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('dl.created_at', filters);
  if (filters.userId) addCondition(where, 'dl.user_id = ?', filters.userId);
  const method = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  return boundedRows(db,
    `SELECT dl.created_at AS date, c.name AS customer, s.number AS sale, dl.type,
            dl.amount, p.id AS payment, ${method} AS method,
            COALESCE(dpa.amount, 0) AS allocated, u.full_name AS user, dl.note
     FROM debt_ledger dl JOIN customers c ON c.id = dl.customer_id
     JOIN sales s ON s.id = dl.sale_id JOIN users u ON u.id = dl.user_id
     LEFT JOIN payments p ON p.id = dl.payment_id
     LEFT JOIN debt_payment_allocations dpa ON dpa.debt_ledger_id = dl.id
     LEFT JOIN payment_methods pm ON pm.id = p.method_id
     ${where.sql} ORDER BY dl.created_at DESC, dl.id`,
    where.params);
}

function reportCash(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('cl.created_at', filters);
  if (filters.userId) addCondition(where, 'cl.user_id = ?', filters.userId);
  const method = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  const result = boundedRows(db,
    `SELECT cl.created_at AS date,
            COALESCE(co.number, s.number, r.number, p.id, cl.doc_id) AS document,
            COALESCE(co.type, cl.doc_type) AS type, cl.amount, ${method} AS method,
            u.full_name AS user
     FROM cash_ledger cl JOIN payment_methods pm ON pm.id = cl.method_id
     JOIN users u ON u.id = cl.user_id
     LEFT JOIN cash_operations co ON cl.doc_type = 'cash_operation' AND co.id = cl.doc_id
     LEFT JOIN sales s ON cl.doc_type = 'sale' AND s.id = cl.doc_id
     LEFT JOIN returns r ON cl.doc_type = 'return' AND r.id = cl.doc_id
     LEFT JOIN payments p ON cl.doc_type = 'debt_payment' AND p.id = cl.doc_id
     ${where.sql} ORDER BY cl.created_at DESC, cl.id`,
    where.params);
  const balance = db.prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM cash_ledger').get() as
    { balance: number };
  const periodWhereForSummary = periodWhere('created_at', filters);
  if (filters.userId) addCondition(periodWhereForSummary, 'user_id = ?', filters.userId);
  const periodAmount = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS amount FROM cash_ledger ${periodWhereForSummary.sql}`,
  ).get(...periodWhereForSummary.params) as { amount: number };
  return {
    ...result,
    summary: { balance: balance.balance, periodAmount: periodAmount.amount },
  };
}

function reportNoncash(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('p.created_at', filters);
  if (filters.userId) addCondition(where, 'p.user_id = ?', filters.userId);
  const method = language === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  return boundedRows(db,
    `SELECT ${method} AS method,
            SUM(CASE WHEN p.direction = 'in' THEN p.amount ELSE 0 END) AS received,
            SUM(CASE WHEN p.direction = 'out' THEN p.amount ELSE 0 END) AS returned,
            SUM(CASE WHEN p.direction = 'in' THEN p.amount ELSE -p.amount END) AS net,
            COUNT(*) AS payments
     FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
     ${where.sql} ${where.sql ? 'AND' : 'WHERE'} pm.kind <> 'cash'
     GROUP BY pm.id, ${method} ORDER BY method`,
    where.params);
}

function reportReservations(db: Db, filters: ReportFilters, language: 'ru' | 'uz') {
  const where = periodWhere('r.created_at', filters);
  if (filters.productId) addCondition(where, 'r.product_id = ?', filters.productId);
  if (filters.warehouseId) addCondition(where, 'r.warehouse_id = ?', filters.warehouseId);
  if (filters.userId) addCondition(where, 'r.user_id = ?', filters.userId);
  const name = localizedName(language, 'p');
  return boundedRows(db,
    `SELECT r.created_at AS date, c.name AS customer, r.cart_id AS cart,
            ${name} AS product, w.name AS warehouse, r.qty, r.status, r.expires_at AS expiresAt
     FROM reservations r JOIN held_carts hc ON hc.id = r.cart_id
     JOIN customers c ON c.id = hc.customer_id JOIN products p ON p.id = r.product_id
     JOIN warehouses w ON w.id = r.warehouse_id
     ${where.sql} ORDER BY r.created_at DESC, r.id`,
    where.params);
}

function redactSensitiveJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !/(cost|profit)/i.test(key)).map(([key, child]) => [key, redactSensitiveJson(child)]));
}

function reportAudit(db: Db, filters: ReportFilters, viewCost: boolean) {
  const where = { sql: '', params: [] as unknown[] };
  if (filters.from) addCondition(where, "date(a.at, '+05:00') >= ?", filters.from);
  if (filters.to) addCondition(where, "date(a.at, '+05:00') <= ?", filters.to);
  if (filters.userId) addCondition(where, 'a.user_id = ?', filters.userId);
  const result = boundedRows(db,
    `SELECT a.at AS date, u.full_name AS user, a.action, a.entity, a.entity_id AS entityId,
            a.before_json AS before, a.after_json AS after
     FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
     ${where.sql} ORDER BY a.at DESC, a.id`,
    where.params);
  if (!viewCost) {
    result.rows = result.rows.map((row) => {
      const redact = (json: unknown) => {
        if (typeof json !== 'string') return json;
        try {
          return JSON.stringify(redactSensitiveJson(JSON.parse(json)));
        } catch {
          return '[redacted]';
        }
      };
      return { ...row, before: redact(row.before), after: redact(row.after) };
    });
  }
  return result;
}

function canViewCosts(db: Db, userId: string): boolean {
  return hasPermission(db, userId, 'view_cost');
}

export function getReport(
  db: Db,
  userId: string,
  input: unknown,
  language: 'ru' | 'uz',
): ReportResult {
  if (!hasPermission(db, userId, 'reports')) throw new AuthError(403, 'auth.permission_denied');
  const filters = normalizeFilters(input);
  const viewCost = canViewCosts(db, userId);
  const costReports: ReportType[] = ['profit_by_sale', 'profit_by_product', 'profit_by_category'];
  if (costReports.includes(filters.type) && !viewCost) throw new AuthError(403, 'auth.permission_denied');

  let result: { rows: Array<Record<string, unknown>>; truncated: boolean; summary?: Record<string, number> };
  switch (filters.type) {
    case 'sales_by_day':
      result = reportSalesByDay(db, filters);
      break;
    case 'sales_by_product':
      result = reportSalesByProduct(db, filters, language);
      break;
    case 'sales_by_category':
      result = reportSalesByCategory(db, filters, language);
      break;
    case 'sales_by_cashier':
      result = reportSalesByCashier(db, filters);
      break;
    case 'sales_by_payment_method':
      result = reportSalesByPaymentMethod(db, filters, language);
      break;
    case 'cashier_summary':
      result = reportCashierSummary(db, filters);
      break;
    case 'profit_by_sale':
    case 'profit_by_product':
    case 'profit_by_category':
      result = reportProfit(db, filters, language, filters.type);
      break;
    case 'stock':
      result = reportStock(db, filters, language, false);
      break;
    case 'low_stock':
      result = reportStock(db, filters, language, true);
      break;
    case 'stock_valuation':
      result = reportStockValuation(db, filters, language);
      break;
    case 'movements':
      result = reportMovements(db, filters, language, viewCost);
      break;
    case 'discounts':
      result = reportDiscounts(db, filters, language);
      break;
    case 'returns':
      result = reportReturns(db, filters);
      break;
    case 'writeoffs':
      result = reportWriteoffs(db, filters);
      break;
    case 'debt_balances':
      result = reportDebtBalances(db, filters);
      break;
    case 'debt_history':
      result = reportDebtHistory(db, filters, language);
      break;
    case 'cash':
      result = reportCash(db, filters, language);
      break;
    case 'noncash':
      result = reportNoncash(db, filters, language);
      break;
    case 'reservations':
      result = reportReservations(db, filters, language);
      break;
    case 'audit':
      result = reportAudit(db, filters, viewCost);
      break;
  }
  const columns = [...REPORT_COLUMNS[filters.type]];
  if (!viewCost) {
    columns.splice(0, columns.length, ...columns.filter((column) =>
      !['cost', 'unitCost', 'profit', 'value'].includes(column)));
    if (filters.type === 'stock_valuation') {
      result.rows = result.rows.map(({ unitCost: _unitCost, value: _value, ...row }) => row);
      delete result.summary;
    }
    if (filters.type === 'writeoffs') {
      result.rows = result.rows.map(({ cost: _cost, ...row }) => row);
    }
    if (filters.type === 'returns') {
      result.rows = result.rows.map(({ cost: _cost, ...row }) => row);
    }
    if (filters.type === 'movements') {
      result.rows = result.rows.map(({ unitCost: _unitCost, ...row }) => row);
    }
  }
  return { type: filters.type, columns, ...result };
}
