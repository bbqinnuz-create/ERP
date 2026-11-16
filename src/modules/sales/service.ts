import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nextDocNumber } from '../../core/counters';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { canUseSalePaymentMethod, getPermissionValues, hasPermission } from '../auth/permissions';
import { getPagePermissionValues, listUserSalesWarehouses, resolveUserSalesWarehouse } from '../auth/access';
import { AuthError } from '../auth/service';
import { captureCounterOrderPrintSnapshot, captureSalePrintSnapshot } from '../print/service';
import { getActiveCart, type Cart } from '../carts/service';
import {
  consumeHeldCartReservations,
  expireReservations,
  loadHeldCartForSale,
  reserveActiveCartForCounter,
  reserveHeldCartForCounter,
} from '../carts/held';
import { consumeFifo, type FifoAllocation } from '../fifo/service';
import {
  assertNotBelowCost,
  calculateCart,
  PriceCalculationError,
  type CalculatedCart,
  type CalculatedPriceLine,
  type DiscountInput,
  type ManualLineDiscount,
  type PriceCart,
  type PriceRule,
} from '../prices/service';

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  category_id: string | null;
  base_price: number;
}

interface SalesContextProduct extends ProductRow {
  qty: number;
  reserved: number;
  availableQty: number;
}

interface WarehouseRow {
  id: string;
  branch_id: string;
  name: string;
}

interface NormalizedSaleOptions {
  customerId: string | null;
  heldCartId: string | null;
  manualDiscounts: ManualLineDiscount[];
  checkDiscount: DiscountInput | null;
}

interface NormalizedPayment {
  methodId: string;
  amount: number;
  tendered: number | null;
}

interface CheckoutInput extends NormalizedSaleOptions {
  idempotencyKey: string;
  counterOrderId: string | null;
  warehouseId: string | null;
  payments: NormalizedPayment[];
  receiptLang: 'ru' | 'uz';
}

interface LoadedPriceData {
  cart: Cart;
  rules: PriceRule[];
  calculated: CalculatedCart;
}

export interface SaleReceipt {
  sale: {
    id: string;
    number: string;
    customerName: string | null;
    subtotal: number;
    discountTotal: number;
    total: number;
    paidTotal: number;
    debtAmount: number;
    createdAt: string;
  };
  lines: Array<{
    sku: string;
    name: string;
    unit: string;
    qty: number;
    unitPrice: number;
    lineDiscount: number;
    lineTotal: number;
  }>;
  payments: Array<{
    methodName: string;
    amount: number;
    tendered: number | null;
    change: number;
  }>;
}

export interface SaleResult {
  receipt: SaleReceipt;
  replayed: boolean;
}

function assertSafeSum(values: number[], errorKey: string): number {
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new AuthError(400, errorKey);
  }
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new AuthError(400, errorKey);
  return Number(total);
}

function normalizeId(value: unknown, key: string, optional = false): string | null {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || value.length < 1 || value.length > 64) {
    throw new AuthError(400, `validation.invalid_${key}`);
  }
  return value;
}

function normalizeDiscount(value: unknown): DiscountInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthError(400, 'validation.invalid_discount');
  }
  const row = value as Record<string, unknown>;
  if (row.kind === 'percent' && Object.keys(row).every((key) => key === 'kind' || key === 'valueBp') &&
      Number.isSafeInteger(row.valueBp) && (row.valueBp as number) >= 0 && (row.valueBp as number) <= 10_000) {
    return { kind: 'percent', valueBp: row.valueBp as number };
  }
  if (row.kind === 'amount' && Object.keys(row).every((key) => key === 'kind' || key === 'amount') &&
      Number.isSafeInteger(row.amount) && (row.amount as number) >= 0) {
    return { kind: 'amount', amount: row.amount as number };
  }
  throw new AuthError(400, 'validation.invalid_discount');
}

function normalizeOptions(input: unknown, allowedKeys: readonly string[]): NormalizedSaleOptions {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !allowedKeys.includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  const customerId = normalizeId(row.customerId, 'customer', true);
  const heldCartId = normalizeId(row.heldCartId, 'held_cart', true);
  let manualDiscounts: ManualLineDiscount[] = [];
  if (row.manualDiscounts !== undefined) {
    if (!Array.isArray(row.manualDiscounts) || row.manualDiscounts.length > 200) {
      throw new AuthError(400, 'validation.invalid_discount');
    }
    const seen = new Set<string>();
    manualDiscounts = row.manualDiscounts.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new AuthError(400, 'validation.invalid_discount');
      }
      const discountRow = entry as Record<string, unknown>;
      if (Object.keys(discountRow).some((key) => key !== 'productId' && key !== 'discount')) {
        throw new AuthError(400, 'validation.invalid_discount');
      }
      const productId = normalizeId(discountRow.productId, 'product');
      if (!productId || seen.has(productId)) throw new AuthError(400, 'validation.invalid_discount');
      seen.add(productId);
      return { productId, discount: normalizeDiscount(discountRow.discount) };
    });
  }
  return {
    customerId,
    heldCartId,
    manualDiscounts,
    checkDiscount: row.checkDiscount == null ? null : normalizeDiscount(row.checkDiscount),
  };
}

function normalizePayments(value: unknown): NormalizedPayment[] {
  if (!Array.isArray(value) || value.length > 4) {
    throw new AuthError(400, 'validation.invalid_payments');
  }
  const methods = new Set<string>();
  const payments = value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new AuthError(400, 'validation.invalid_payments');
    }
    const row = entry as Record<string, unknown>;
    if (Object.keys(row).some((key) => !['methodId', 'amount', 'tendered'].includes(key))) {
      throw new AuthError(400, 'validation.invalid_payments');
    }
    const methodId = normalizeId(row.methodId, 'payment_method');
    if (!methodId || methods.has(methodId)) throw new AuthError(400, 'validation.invalid_payments');
    methods.add(methodId);
    if (!Number.isSafeInteger(row.amount) || (row.amount as number) <= 0) {
      throw new AuthError(400, 'validation.invalid_payments');
    }
    let tendered: number | null = null;
    if (row.tendered !== undefined && row.tendered !== null) {
      if (!Number.isSafeInteger(row.tendered) || (row.tendered as number) < (row.amount as number)) {
        throw new AuthError(400, 'validation.invalid_payments');
      }
      tendered = row.tendered as number;
    }
    return { methodId, amount: row.amount as number, tendered };
  });
  return payments;
}

function normalizeCheckoutInput(input: unknown, defaultLanguage: 'ru' | 'uz'): CheckoutInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  const allowed = [
    'idempotencyKey', 'customerId', 'heldCartId', 'manualDiscounts', 'checkDiscount', 'payments', 'receiptLang',
    'warehouseId', 'counterOrderId',
  ];
  const options = normalizeOptions(row, allowed);
  if (typeof row.idempotencyKey !== 'string' || row.idempotencyKey.trim().length === 0 ||
      row.idempotencyKey.length > 128) {
    throw new AuthError(400, 'validation.invalid_idempotency_key');
  }
  const receiptLang = row.receiptLang === undefined ? defaultLanguage : row.receiptLang;
  if (receiptLang !== 'ru' && receiptLang !== 'uz') throw new AuthError(400, 'validation.invalid_language');
  const warehouseId = row.warehouseId === undefined || row.warehouseId === null
    ? null
    : normalizeId(row.warehouseId, 'warehouse');
  const counterOrderId = normalizeId(row.counterOrderId, 'counter_order', true);
  if (counterOrderId && Object.keys(row).some((key) =>
    !['idempotencyKey', 'counterOrderId', 'payments', 'receiptLang'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  return {
    ...options,
    idempotencyKey: row.idempotencyKey.trim(),
    counterOrderId,
    warehouseId,
    payments: normalizePayments(row.payments),
    receiptLang,
  };
}

function getCustomer(db: Db, customerId: string | null): { id: string; name: string } | null {
  if (!customerId) return null;
  const customer = db.prepare(
    'SELECT id, name FROM customers WHERE id = ? AND active = 1',
  ).get(customerId) as { id: string; name: string } | undefined;
  if (!customer) throw new AuthError(400, 'validation.invalid_customer');
  return customer;
}

function loadProducts(db: Db, cart: Cart): ProductRow[] {
  if (cart.lines.length === 0) throw new AuthError(409, 'cart.empty');
  const ids = cart.lines.map((line) => line.productId);
  const placeholders = ids.map(() => '?').join(', ');
  const products = db.prepare(
    `SELECT id, sku, barcode, name_ru AS name, unit, category_id, base_price
     FROM products WHERE active = 1 AND id IN (${placeholders})`,
  ).all(...ids) as ProductRow[];
  if (products.length !== ids.length) throw new AuthError(409, 'sale.cart_product_inactive');
  return products;
}

function loadPriceRules(db: Db): PriceRule[] {
  const rows = db.prepare(
    `SELECT id, type, product_id, category_id, customer_id, min_qty, min_inclusive,
            max_qty, price, percent_bp, date_from, date_to, priority, active
     FROM price_rules WHERE active = 1`,
  ).all() as Array<{
    id: string;
    type: PriceRule['type'];
    product_id: string | null;
    category_id: string | null;
    customer_id: string | null;
    min_qty: number | null;
    min_inclusive: number;
    max_qty: number | null;
    price: number | null;
    percent_bp: number | null;
    date_from: string | null;
    date_to: string | null;
    priority: number;
    active: number;
  }>;
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    productId: row.product_id,
    categoryId: row.category_id,
    customerId: row.customer_id,
    minQty: row.min_qty,
    minInclusive: row.min_inclusive === 1,
    maxQty: row.max_qty,
    price: row.price,
    percentBp: row.percent_bp,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    priority: row.priority,
    active: row.active === 1,
  }));
}

function calculateForCart(db: Db, userId: string, options: NormalizedSaleOptions): LoadedPriceData {
  let cart: Cart;
  if (options.heldCartId) {
    const held = loadHeldCartForSale(db, userId, options.heldCartId);
    if (held.customerId && options.customerId && options.customerId !== held.customerId) {
      throw new AuthError(400, 'cart.held_customer_mismatch');
    }
    options.customerId = held.customerId ?? options.customerId;
    cart = {
      id: held.cart.id,
      updatedAt: held.cart.createdAt,
      lines: held.cart.lines.map((line) => ({
        id: line.productId,
        productId: line.productId,
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        basePrice: line.basePrice,
        qty: line.qty,
        active: true,
      })),
    };
  } else {
    cart = getActiveCart(db, userId);
  }
  const products = loadProducts(db, cart);
  const byId = new Map(products.map((product) => [product.id, product]));
  const rules = loadPriceRules(db);
  const permissions = getPermissionValues(db, userId);
  const roundingRow = db.prepare("SELECT value FROM settings WHERE key = 'rounding'").get() as
    | { value: string }
    | undefined;
  if (!roundingRow || (roundingRow.value !== 'sum' && roundingRow.value !== 'tiyin')) {
    throw new Error('Invalid rounding setting.');
  }
  const priceCart: PriceCart = {
    lines: cart.lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw new Error(`Missing active product ${line.productId}`);
      return {
        productId: line.productId,
        categoryId: product.category_id,
        qty: line.qty,
        basePrice: product.base_price,
      };
    }),
    customerId: options.customerId,
    manualDiscounts: options.manualDiscounts,
    checkDiscount: options.checkDiscount,
  };
  try {
    const calculated = calculateCart(priceCart, rules, {
      rounding: roundingRow.value,
      permissions: {
        discountManual: permissions.discount_manual === 1,
        discountManualLimitBp: permissions.discount_manual_limit_bp,
        discountCheck: permissions.discount_check === 1,
        discountCheckLimitBp: permissions.discount_check_limit_bp,
      },
    }, new Date());
    return { cart, rules, calculated };
  } catch (error) {
    if (!(error instanceof PriceCalculationError)) throw error;
    const errorKey = error.code === 'NEEDS_ADMIN'
      ? 'sale.discount_limit_exceeded'
      : error.code === 'DISCOUNT_NOT_ALLOWED'
        ? 'sale.discount_not_allowed'
        : error.code === 'BELOW_COST'
          ? 'sale.below_cost'
          : 'validation.invalid_discount';
    throw new AuthError(400, errorKey);
  }
}

function resolveDefaultWarehouse(db: Db): WarehouseRow {
  const configured = db.prepare(
    "SELECT value FROM settings WHERE key = 'default_warehouse_id'",
  ).get() as { value: string } | undefined;
  if (configured) {
    const warehouse = db.prepare(
      `SELECT w.id, w.branch_id, w.name FROM warehouses w
       JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(configured.value) as WarehouseRow | undefined;
    if (!warehouse) throw new AuthError(409, 'settings.default_warehouse_unavailable');
    return warehouse;
  }
  const active = db.prepare(
    `SELECT w.id, w.branch_id, w.name FROM warehouses w
     JOIN branches b ON b.id = w.branch_id
     WHERE w.active = 1 AND b.active = 1 ORDER BY w.created_at, w.id`,
  ).all() as WarehouseRow[];
  if (active.length === 1) return active[0]!;
  if (active.length === 0) throw new AuthError(409, 'sales.no_active_warehouse');
  throw new AuthError(409, 'settings.default_warehouse_required');
}

function addSyncOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

function addSaleOutbox(
  db: Db,
  saleId: string,
  lineIds: string[],
  discountIds: string[],
  allocationIds: string[],
  movementIds: string[],
  paymentIds: string[],
  debtIds: string[],
  cashIds: string[],
  createdAt: string,
): void {
  addSyncOutbox(db, 'sales', saleId, createdAt);
  for (const id of lineIds) addSyncOutbox(db, 'sale_lines', id, createdAt);
  for (const id of discountIds) addSyncOutbox(db, 'sale_discounts', id, createdAt);
  for (const id of allocationIds) addSyncOutbox(db, 'sale_line_batch_allocations', id, createdAt);
  for (const id of movementIds) addSyncOutbox(db, 'stock_movements', id, createdAt);
  for (const id of paymentIds) addSyncOutbox(db, 'payments', id, createdAt);
  for (const id of debtIds) addSyncOutbox(db, 'debt_ledger', id, createdAt);
  for (const id of cashIds) addSyncOutbox(db, 'cash_ledger', id, createdAt);
}

function saleReceipt(db: Db, saleId: string): SaleReceipt {
  const sale = db.prepare(
    `SELECT id, number, customer_name, subtotal, discount_total, total,
            paid_total, debt_amount, created_at
     FROM sales WHERE id = ?`,
  ).get(saleId) as {
    id: string;
    number: string;
    customer_name: string | null;
    subtotal: number;
    discount_total: number;
    total: number;
    paid_total: number;
    debt_amount: number;
    created_at: string;
  } | undefined;
  if (!sale) throw new Error(`Missing sale: ${saleId}`);
  const lines = db.prepare(
    `SELECT p.sku, p.name_ru AS name, p.unit, sl.qty, sl.unit_price AS unitPrice,
            sl.line_discount AS lineDiscount, sl.line_total AS lineTotal
     FROM sale_lines sl JOIN products p ON p.id = sl.product_id
     WHERE sl.sale_id = ? ORDER BY sl.rowid`,
  ).all(saleId) as SaleReceipt['lines'];
  const payments = db.prepare(
    `SELECT pm.name_ru AS methodName, p.amount, p.tendered,
            CASE WHEN p.tendered IS NULL THEN 0 ELSE p.tendered - p.amount END AS change
     FROM payments p JOIN payment_methods pm ON pm.id = p.method_id
     WHERE p.sale_id = ? ORDER BY p.rowid`,
  ).all(saleId) as SaleReceipt['payments'];
  return {
    sale: {
      id: sale.id,
      number: sale.number,
      customerName: sale.customer_name,
      subtotal: sale.subtotal,
      discountTotal: sale.discount_total,
      total: sale.total,
      paidTotal: sale.paid_total,
      debtAmount: sale.debt_amount,
      createdAt: sale.created_at,
    },
    lines,
    payments,
  };
}

function loadSalesContext(db: Db, userId?: string, requestedWarehouseId?: string | null): {
  warehouse: WarehouseRow | null;
  defaultWarehouseId: string | null;
  warehouses: Array<Pick<WarehouseRow, 'id' | 'name'>>;
  salesWarehouses: Array<Pick<WarehouseRow, 'id' | 'name'>>;
  products: SalesContextProduct[];
  customers: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string; kind: string }>;
  counterReservationHours: number;
  rounding: 'sum' | 'tiyin';
} {
  const warehouses = db.prepare(
    `SELECT w.id, w.name FROM warehouses w
     JOIN branches b ON b.id = w.branch_id
     WHERE w.active = 1 AND b.active = 1 ORDER BY w.created_at, w.id`,
  ).all() as Array<Pick<WarehouseRow, 'id' | 'name'>>;
  const salesWarehouses = userId ? listUserSalesWarehouses(db, userId) : warehouses;
  const configuredDefault = db.prepare(
    "SELECT value FROM settings WHERE key = 'default_warehouse_id'",
  ).get() as { value: string } | undefined;
  const defaultWarehouseId = configuredDefault?.value ??
    (warehouses.length === 1 ? warehouses[0]!.id : null);
  let warehouse: WarehouseRow | null = null;
  if (salesWarehouses.length > 0) {
    try {
      warehouse = userId
        ? resolveUserSalesWarehouse(db, userId, requestedWarehouseId)
        : resolveDefaultWarehouse(db);
    } catch (error) {
      if (!(error instanceof AuthError) ||
          !['settings.default_warehouse_required', 'settings.default_warehouse_unavailable'].includes(error.errorKey)) {
        throw error;
      }
    }
  }
  const products = db.prepare(
    `SELECT p.id, p.sku, p.barcode, p.name_ru AS name, p.unit, p.category_id, p.base_price,
            COALESCE(sc.qty, 0) AS qty, COALESCE(sc.reserved, 0) AS reserved
     FROM products p
     LEFT JOIN stock_cache sc ON sc.product_id = p.id AND sc.warehouse_id = ?
     WHERE p.active = 1 ORDER BY p.name_ru, p.sku`,
  ).all(warehouse?.id ?? null) as Array<ProductRow & { qty: number; reserved: number }>;
  const customers = db.prepare(
    'SELECT id, name FROM customers WHERE active = 1 ORDER BY name',
  ).all() as Array<{ id: string; name: string }>;
  const paymentMethods = db.prepare(
    `SELECT id, name_ru AS name, kind FROM payment_methods WHERE active = 1 ORDER BY rowid`,
  ).all() as Array<{ id: string; name: string; kind: string }>;
  const rounding = db.prepare("SELECT value FROM settings WHERE key = 'rounding'").get() as
    | { value: string }
    | undefined;
  if (!rounding || (rounding.value !== 'sum' && rounding.value !== 'tiyin')) {
    throw new Error('Invalid rounding setting.');
  }
  const reservationSetting = db.prepare(
    "SELECT value FROM settings WHERE key = 'counter_reservation_hours'",
  ).get() as { value: string } | undefined;
  const counterReservationHours = Number(reservationSetting?.value ?? '2');
  if (!Number.isSafeInteger(counterReservationHours) ||
      counterReservationHours < 1 || counterReservationHours > 5) {
    throw new Error('Invalid counter_reservation_hours setting.');
  }
  const allowedPaymentMethods = userId
    ? paymentMethods.filter((method) => canUseSalePaymentMethod(db, userId, method.kind))
    : paymentMethods;
  if (userId && hasPermission(db, userId, 'pay_at_counter') &&
      getPagePermissionValues(db, userId).heldCarts === 1) {
    allowedPaymentMethods.push({ id: 'counter', name: 'counter', kind: 'counter' });
  }
  return {
    warehouse,
    defaultWarehouseId,
    warehouses,
    salesWarehouses,
    products: products.map((product) => ({
      ...product,
      availableQty: product.qty - product.reserved,
    })),
    customers,
    paymentMethods: allowedPaymentMethods,
    counterReservationHours,
    rounding: rounding.value,
  };
}

export function getSalesContext(
  db: Db,
  userId?: string,
  requestedWarehouseId?: string | null,
): ReturnType<typeof loadSalesContext> {
  return inTransaction(db, () => {
    expireReservations(db);
    return loadSalesContext(db, userId, requestedWarehouseId);
  });
}

interface CounterOrderRow {
  id: string;
  number: string;
  branch_id: string;
  warehouse_id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string | null;
  held_cart_id: string;
  subtotal: number;
  discount_total: number;
  total: number;
  quote_json: string;
  lang: 'ru' | 'uz';
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  sale_id: string | null;
  paid_by: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readCounterQuote(value: string): {
  calculated: CalculatedCart;
  rules: PriceRule[];
  checkDiscount: DiscountInput | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error('Stored counter order quote is invalid.', { cause: error });
  }
  if (!isRecord(parsed) || !isRecord(parsed.calculated) || !Array.isArray(parsed.calculated.lines) ||
      !Array.isArray(parsed.rules)) {
    throw new Error('Stored counter order quote is invalid.');
  }
  const calculated = parsed.calculated;
  const rawLines = calculated.lines as unknown[];
  const rawRules = parsed.rules as unknown[];
  const integer = (entry: unknown): entry is number => Number.isSafeInteger(entry) && (entry as number) >= 0;
  if (!integer(calculated.subtotal) || !integer(calculated.discountTotal) || !integer(calculated.total)) {
    throw new Error('Stored counter order totals are invalid.');
  }
  const seen = new Set<string>();
  const lines: CalculatedCart['lines'] = rawLines.map((value) => {
    if (!isRecord(value) || typeof value.productId !== 'string' || seen.has(value.productId) ||
        typeof value.categoryId !== 'string' && value.categoryId !== null ||
        !integer(value.qty) || value.qty === 0 || !integer(value.basePrice) || !integer(value.unitPrice) ||
        !integer(value.baseTotal) || !integer(value.subtotal) || !integer(value.ruleDiscount) ||
        !integer(value.manualDiscount) || !integer(value.checkDiscount) || !integer(value.lineDiscount) ||
        !integer(value.lineTotal) || !Array.isArray(value.appliedDiscounts)) {
      throw new Error('Stored counter order line is invalid.');
    }
    seen.add(value.productId);
    const appliedDiscounts: CalculatedPriceLine['appliedDiscounts'] = value.appliedDiscounts.map((entry) => {
      if (!isRecord(entry) || !['qty', 'promo', 'customer', 'manual', 'check'].includes(String(entry.kind)) ||
          !integer(entry.amount) ||
          (entry.ruleId !== undefined && typeof entry.ruleId !== 'string') ||
          (entry.percentBp !== undefined && (!integer(entry.percentBp) || entry.percentBp > 10_000))) {
        throw new Error('Stored counter order discount is invalid.');
      }
      return {
        kind: entry.kind as CalculatedPriceLine['appliedDiscounts'][number]['kind'],
        amount: entry.amount,
        ...(typeof entry.ruleId === 'string' ? { ruleId: entry.ruleId } : {}),
        ...(typeof entry.percentBp === 'number' ? { percentBp: entry.percentBp } : {}),
      };
    });
    return {
      productId: value.productId,
      categoryId: value.categoryId,
      qty: value.qty,
      basePrice: value.basePrice,
      unitPrice: value.unitPrice,
      baseTotal: value.baseTotal,
      subtotal: value.subtotal,
      ruleDiscount: value.ruleDiscount,
      manualDiscount: value.manualDiscount,
      checkDiscount: value.checkDiscount,
      lineDiscount: value.lineDiscount,
      lineTotal: value.lineTotal,
      appliedDiscounts,
    };
  });
  const lineTotal = assertSafeSum(lines.map((line) => line.lineTotal), 'validation.invalid_total');
  if (lines.length === 0 || lineTotal !== calculated.total) {
    throw new Error('Stored counter order quote does not balance.');
  }
  const rules = rawRules.filter((rule): rule is PriceRule =>
    isRecord(rule) && typeof rule.id === 'string');
  let checkDiscount: DiscountInput | null = null;
  if (parsed.checkDiscount !== null && parsed.checkDiscount !== undefined) {
    try {
      checkDiscount = normalizeDiscount(parsed.checkDiscount);
    } catch (error) {
      throw new Error('Stored counter order discount input is invalid.', { cause: error });
    }
  }
  return {
    calculated: {
      lines,
      subtotal: calculated.subtotal,
      discountTotal: calculated.discountTotal,
      total: calculated.total,
    },
    rules,
    checkDiscount,
  };
}

function counterOrderResult(db: Db, order: CounterOrderRow) {
  const lines = db.prepare(
    `SELECT hcl.product_id AS productId, p.sku, p.name_ru AS name, p.unit, hcl.qty
     FROM held_cart_lines hcl
     JOIN products p ON p.id = hcl.product_id
     WHERE hcl.cart_id = ? ORDER BY hcl.rowid`,
  ).all(order.held_cart_id) as Array<{
    productId: string; sku: string; name: string; unit: string; qty: number;
  }>;
  return {
    id: order.id,
    number: order.number,
    customerId: order.customer_id,
    customerName: order.customer_name,
    total: order.total,
    createdAt: order.created_at,
    expiresAt: order.expires_at,
    status: order.status,
    lines,
  };
}

export function listCounterOrders(db: Db, userId: string): Array<ReturnType<typeof counterOrderResult>> {
  return inTransaction(db, () => {
    expireReservations(db);
    const rows = db.prepare(
      `SELECT * FROM counter_orders
       WHERE status = 'pending' AND expires_at > ?
       ORDER BY created_at, number`,
    ).all(nowIso()) as CounterOrderRow[];
    return rows.filter((order) => {
      try {
        resolveUserSalesWarehouse(db, userId, order.warehouse_id);
        return true;
      } catch (error) {
        if (error instanceof AuthError && error.status === 403) return false;
        throw error;
      }
    }).map((order) => counterOrderResult(db, order));
  });
}

export function listCounterPaymentMethods(
  db: Db,
  userId: string,
  lang: 'ru' | 'uz',
): Array<{ id: string; name: string; kind: string }> {
  const nameColumn = lang === 'uz' ? 'COALESCE(name_uz, name_ru)' : 'name_ru';
  return (db.prepare(
    `SELECT id, ${nameColumn} AS name, kind FROM payment_methods
     WHERE active = 1 ORDER BY rowid`,
  ).all() as Array<{ id: string; name: string; kind: string }>)
    .filter((method) => canUseSalePaymentMethod(db, userId, method.kind));
}

export function createCounterOrder(
  db: Db,
  userId: string,
  lang: 'ru' | 'uz',
  input: unknown,
): { order: ReturnType<typeof counterOrderResult>; replayed: boolean } {
  if (!isRecord(input) || Object.keys(input).some((key) =>
    !['idempotencyKey', 'customerId', 'heldCartId', 'manualDiscounts', 'checkDiscount',
      'receiptLang', 'warehouseId'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  const normalized = normalizeCheckoutInput({ ...input, payments: [] }, lang);

  return inTransaction(db, () => {
    if (!hasPermission(db, userId, 'pay_at_counter') || !hasPermission(db, userId, 'sell')) {
      throw new AuthError(403, 'auth.permission_denied');
    }
    const replay = db.prepare('SELECT * FROM counter_orders WHERE idempotency_key = ?')
      .get(normalized.idempotencyKey) as CounterOrderRow | undefined;
    if (replay) {
      if (replay.user_id !== userId) throw new AuthError(409, 'sale.idempotency_conflict');
      return { order: counterOrderResult(db, replay), replayed: true };
    }

    const options: NormalizedSaleOptions = {
      customerId: normalized.customerId,
      heldCartId: normalized.heldCartId,
      manualDiscounts: normalized.manualDiscounts,
      checkDiscount: normalized.checkDiscount,
    };
    const warehouse = resolveUserSalesWarehouse(db, userId, normalized.warehouseId);
    const loaded = calculateForCart(db, userId, options);
    const customer = getCustomer(db, options.customerId);
    const held = normalized.heldCartId
      ? reserveHeldCartForCounter(db, userId, normalized.heldCartId, warehouse.id, customer?.id)
      : reserveActiveCartForCounter(db, userId, customer?.id ?? null, warehouse.id);
    const expiresAt = held.reservations[0]?.expiresAt;
    if (!expiresAt || held.reservations.some((reservation) => reservation.expiresAt !== expiresAt)) {
      throw new Error('Counter order reservation has no consistent expiration time.');
    }
    const branch = db.prepare('SELECT code FROM branches WHERE id = ? AND active = 1')
      .get(warehouse.branch_id) as { code: string } | undefined;
    if (!branch) throw new AuthError(409, 'sales.no_active_warehouse');

    const orderId = uuidv7();
    const createdAt = nowIso();
    const number = nextDocNumber(db, warehouse.branch_id, 'sale');
    db.prepare(
      `INSERT INTO counter_orders
       (id, number, branch_id, warehouse_id, user_id, customer_id, customer_name, held_cart_id,
        subtotal, discount_total, total, quote_json, lang, idempotency_key, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      orderId,
      number,
      warehouse.branch_id,
      warehouse.id,
      userId,
      customer?.id ?? null,
      customer?.name ?? null,
      held.id,
      loaded.calculated.subtotal,
      loaded.calculated.discountTotal,
      loaded.calculated.total,
      JSON.stringify({
        calculated: loaded.calculated,
        rules: loaded.rules,
        checkDiscount: options.checkDiscount,
      }),
      normalized.receiptLang,
      normalized.idempotencyKey,
      createdAt,
      expiresAt,
    );
    addSyncOutbox(db, 'counter_orders', orderId, createdAt);
    writeAudit(db, {
      userId,
      action: 'counter_order.create',
      entity: 'counter_orders',
      entityId: orderId,
      after: {
        number,
        heldCartId: held.id,
        customerId: customer?.id ?? null,
        total: loaded.calculated.total,
        expiresAt,
      },
    });
    const snapshot = captureCounterOrderPrintSnapshot(db, orderId);
    db.prepare(
      `INSERT INTO print_jobs
       (id, doc_type, doc_id, kind, status, attempts, created_at, updated_at, lang, snapshot_json)
       VALUES (?, 'counter_order', ?, 'original', 'pending', 0, ?, ?, ?, ?)`,
    ).run(uuidv7(), orderId, createdAt, createdAt, normalized.receiptLang, snapshot);
    const order = db.prepare('SELECT * FROM counter_orders WHERE id = ?').get(orderId) as CounterOrderRow;
    return { order: counterOrderResult(db, order), replayed: false };
  });
}

export function payCounterOrder(
  db: Db,
  userId: string,
  lang: 'ru' | 'uz',
  orderId: string,
  input: unknown,
): SaleResult {
  if (!isRecord(input) || Object.keys(input).some((key) =>
    !['methodId', 'idempotencyKey', 'tendered'].includes(key)) ||
    typeof input.methodId !== 'string' || typeof input.idempotencyKey !== 'string') {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const order = db.prepare('SELECT total FROM counter_orders WHERE id = ?').get(orderId) as
    { total: number } | undefined;
  if (!order) throw new AuthError(404, 'counter_order.not_found');
  return createSale(db, userId, lang, {
    counterOrderId: orderId,
    idempotencyKey: input.idempotencyKey,
    receiptLang: lang,
    payments: [{
      methodId: input.methodId,
      amount: order.total,
      ...(input.tendered === undefined ? {} : { tendered: input.tendered }),
    }],
  });
}

export function quoteSale(db: Db, userId: string, input: unknown): {
  lines: CalculatedCart['lines'];
  subtotal: number;
  discountTotal: number;
  total: number;
} {
  return inTransaction(db, () => {
    const options = normalizeOptions(input, ['customerId', 'heldCartId', 'manualDiscounts', 'checkDiscount']);
    const { calculated } = calculateForCart(db, userId, options);
    return {
      lines: calculated.lines,
      subtotal: calculated.subtotal,
      discountTotal: calculated.discountTotal,
      total: calculated.total,
    };
  });
}

export function createSale(
  db: Db,
  userId: string,
  lang: 'ru' | 'uz',
  input: unknown,
): SaleResult {
  const normalized = normalizeCheckoutInput(input, lang);
  return inTransaction(db, () => {
    const existing = db.prepare(
      'SELECT user_id, operation, result_id FROM idempotency_keys WHERE key = ?',
    ).get(normalized.idempotencyKey) as
      | { user_id: string; operation: string; result_id: string | null }
      | undefined;
    if (existing) {
      if (existing.user_id !== userId || existing.operation !== 'sale' || !existing.result_id) {
        throw new AuthError(409, 'sale.idempotency_conflict');
      }
      return { receipt: saleReceipt(db, existing.result_id), replayed: true };
    }

    let counterOrder: CounterOrderRow | null = null;
    let frozenQuote: ReturnType<typeof readCounterQuote> | null = null;
    if (normalized.counterOrderId) {
      if (!hasPermission(db, userId, 'sell')) throw new AuthError(403, 'auth.permission_denied');
      expireReservations(db);
      counterOrder = db.prepare('SELECT * FROM counter_orders WHERE id = ?')
        .get(normalized.counterOrderId) as CounterOrderRow | undefined ?? null;
      if (!counterOrder) throw new AuthError(404, 'counter_order.not_found');
      if (counterOrder.status !== 'pending' || counterOrder.expires_at <= nowIso()) {
        throw new AuthError(409, 'counter_order.not_pending');
      }
      frozenQuote = readCounterQuote(counterOrder.quote_json);
    }

    let options: NormalizedSaleOptions;
    let warehouse: WarehouseRow;
    let loaded: LoadedPriceData;
    let customer: { id: string; name: string } | null;
    let cartId: string;
    if (counterOrder && frozenQuote) {
      options = {
        customerId: counterOrder.customer_id,
        heldCartId: counterOrder.held_cart_id,
        manualDiscounts: [],
        checkDiscount: frozenQuote.checkDiscount,
      };
      warehouse = resolveUserSalesWarehouse(db, userId, counterOrder.warehouse_id);
      const cartRow = db.prepare(
        'SELECT id, created_at FROM held_carts WHERE id = ? AND status = ?',
      ).get(counterOrder.held_cart_id, 'open') as { id: string; created_at: string } | undefined;
      if (!cartRow) throw new AuthError(409, 'counter_order.not_pending');
      const cartLines = db.prepare(
        `SELECT hcl.id, hcl.product_id AS productId, p.sku, p.name_ru AS name, p.unit,
                p.base_price AS basePrice, hcl.qty, p.active
         FROM held_cart_lines hcl JOIN products p ON p.id = hcl.product_id
         WHERE hcl.cart_id = ? ORDER BY hcl.rowid`,
      ).all(counterOrder.held_cart_id) as Array<{
        id: string; productId: string; sku: string; name: string; unit: string;
        basePrice: number; qty: number; active: number;
      }>;
      if (cartLines.length !== frozenQuote.calculated.lines.length ||
          cartLines.some((line) => line.active !== 1)) {
        throw new AuthError(409, 'counter_order.cart_changed');
      }
      const quoteByProduct = new Map(frozenQuote.calculated.lines.map((line) => [line.productId, line]));
      if (cartLines.some((line) => quoteByProduct.get(line.productId)?.qty !== line.qty)) {
        throw new AuthError(409, 'counter_order.cart_changed');
      }
      const reservations = db.prepare(
        `SELECT product_id AS productId, warehouse_id AS warehouseId, qty
         FROM reservations WHERE cart_id = ? AND status = 'active'`,
      ).all(counterOrder.held_cart_id) as Array<{ productId: string; warehouseId: string; qty: number }>;
      const reservedByProduct = new Map(reservations.map((reservation) => [reservation.productId, reservation]));
      if (reservations.length !== cartLines.length || cartLines.some((line) => {
        const reservation = reservedByProduct.get(line.productId);
        return !reservation || reservation.qty !== line.qty || reservation.warehouseId !== warehouse.id;
      })) {
        throw new AuthError(409, 'counter_order.reservation_inactive');
      }
      loaded = {
        cart: {
          id: cartRow.id,
          updatedAt: cartRow.created_at,
          lines: cartLines.map(({ active: _active, ...line }) => ({ ...line, active: true })),
        },
        rules: frozenQuote.rules,
        calculated: frozenQuote.calculated,
      };
      customer = counterOrder.customer_id
        ? { id: counterOrder.customer_id, name: counterOrder.customer_name ?? '' }
        : null;
      cartId = counterOrder.held_cart_id;
      consumeHeldCartReservations(db, userId, counterOrder.held_cart_id, warehouse.id, true);
    } else {
      options = {
        customerId: normalized.customerId,
        heldCartId: normalized.heldCartId,
        manualDiscounts: normalized.manualDiscounts,
        checkDiscount: normalized.checkDiscount,
      };
      warehouse = resolveUserSalesWarehouse(db, userId, normalized.warehouseId);
      loaded = calculateForCart(db, userId, options);
      customer = getCustomer(db, options.customerId);
      cartId = loaded.cart.id;
      if (normalized.heldCartId) {
        consumeHeldCartReservations(db, userId, normalized.heldCartId, warehouse.id);
      }
    }
    const branch = db.prepare(
      'SELECT code FROM branches WHERE id = ? AND active = 1',
    ).get(warehouse.branch_id) as { code: string } | undefined;
    if (!branch) throw new AuthError(409, 'sales.no_active_warehouse');

    const methods = normalized.payments.length > 0
      ? db.prepare(
        `SELECT id, name_ru, kind FROM payment_methods
         WHERE active = 1 AND id IN (${normalized.payments.map(() => '?').join(', ')})`,
      ).all(...normalized.payments.map((payment) => payment.methodId)) as
        Array<{ id: string; name_ru: string; kind: 'cash' | 'card' | 'transfer' | 'online' }>
      : [];
    if (counterOrder && normalized.payments.length !== 1) {
      throw new AuthError(400, 'counter_order.single_payment_required');
    }
    if (methods.length !== normalized.payments.length) {
      throw new AuthError(400, 'validation.invalid_payment_method');
    }
    const methodById = new Map(methods.map((method) => [method.id, method]));
    for (const payment of normalized.payments) {
      const method = methodById.get(payment.methodId);
      if (!method) throw new AuthError(400, 'validation.invalid_payment_method');
      if (!canUseSalePaymentMethod(db, userId, method.kind)) {
        throw new AuthError(403, 'auth.payment_method_permission_denied');
      }
      if (payment.tendered !== null && method.kind !== 'cash') {
        throw new AuthError(400, 'validation.invalid_payments');
      }
    }
    const paidTotal = assertSafeSum(normalized.payments.map((payment) => payment.amount), 'validation.invalid_total');
    if (paidTotal > loaded.calculated.total) throw new AuthError(400, 'sale.overpayment');
    const debtAmount = loaded.calculated.total - paidTotal;
    if (counterOrder && debtAmount !== 0) throw new AuthError(400, 'counter_order.full_payment_required');
    if (debtAmount > 0) {
      if (!customer) throw new AuthError(400, 'sale.customer_required_for_debt');
      if (!hasPermission(db, userId, 'debt_sale')) throw new AuthError(403, 'auth.permission_denied');
    }

    const saleId = uuidv7();
    const createdAt = nowIso();
    const number = counterOrder?.number ?? nextDocNumber(db, warehouse.branch_id, 'sale');
    const saleLang = counterOrder?.lang ?? normalized.receiptLang;
    const allocationsByProduct = new Map<string, FifoAllocation[]>();
    for (const line of loaded.calculated.lines) {
      const allocations = consumeFifo(db, {
        branchId: warehouse.branch_id,
        warehouseId: warehouse.id,
        productId: line.productId,
        qty: line.qty,
        movementType: 'SALE',
        docType: 'sale',
        docId: saleId,
        userId,
        unitPrice: line.unitPrice,
      });
      allocationsByProduct.set(line.productId, allocations);
    }

    const fifoCosts = loaded.calculated.lines.map((line) => ({
      productId: line.productId,
      costTotal: assertSafeSum(
        (allocationsByProduct.get(line.productId) ?? []).map((allocation) => allocation.costTotal),
        'fifo.cost_out_of_range',
      ),
    }));
    try {
      assertNotBelowCost(loaded.calculated, fifoCosts);
    } catch (error) {
      if (error instanceof PriceCalculationError && error.code === 'BELOW_COST') {
        throw new AuthError(409, 'sale.below_cost');
      }
      throw error;
    }
    const costTotal = assertSafeSum(fifoCosts.map((cost) => cost.costTotal), 'fifo.cost_out_of_range');
    const profit = loaded.calculated.total - costTotal;

    db.prepare(
      `INSERT INTO sales
         (id, number, branch_id, user_id, customer_id, customer_name, subtotal, discount_total,
          total, paid_total, debt_amount, cost_total, profit, lang, cart_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      saleId,
      number,
      warehouse.branch_id,
      userId,
      customer?.id ?? null,
      customer?.name ?? null,
      loaded.calculated.subtotal,
      loaded.calculated.discountTotal,
      loaded.calculated.total,
      paidTotal,
      debtAmount,
      costTotal,
      profit,
      saleLang,
      cartId,
      createdAt,
    );

    const lineIds = new Map<string, string>();
    const insertedLineIds: string[] = [];
    const allocationIds: string[] = [];
    const movementIds: string[] = [];
    const insertLine = db.prepare(
      `INSERT INTO sale_lines
         (id, sale_id, product_id, qty, base_price, unit_price, price_rule_id,
          line_discount, line_total, cost_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertAllocation = db.prepare(
      `INSERT INTO sale_line_batch_allocations
         (id, sale_line_id, batch_id, qty, unit_cost, stock_movement_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const line of loaded.calculated.lines) {
      const lineId = uuidv7();
      const allocations = allocationsByProduct.get(line.productId) ?? [];
      const lineCost = assertSafeSum(allocations.map((allocation) => allocation.costTotal), 'fifo.cost_out_of_range');
      const ruleId = line.appliedDiscounts.find((discount) => discount.ruleId)?.ruleId ?? null;
      lineIds.set(line.productId, lineId);
      insertedLineIds.push(lineId);
      insertLine.run(
        lineId,
        saleId,
        line.productId,
        line.qty,
        line.basePrice,
        line.unitPrice,
        ruleId,
        line.lineDiscount,
        line.lineTotal,
        lineCost,
      );
      for (const allocation of allocations) {
        const allocationId = uuidv7();
        allocationIds.push(allocationId);
        movementIds.push(allocation.movementId);
        insertAllocation.run(
          allocationId,
          lineId,
          allocation.batchId,
          allocation.qty,
          allocation.unitCost,
          allocation.movementId,
        );
      }
    }

    const discountIds: string[] = [];
    const insertDiscount = db.prepare(
      `INSERT INTO sale_discounts
         (id, sale_id, sale_line_id, kind, rule_id, amount, percent_bp, user_id, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    );
    const ruleById = new Map(loaded.rules.map((rule) => [rule.id, rule]));
    for (const line of loaded.calculated.lines) {
      for (const discount of line.appliedDiscounts) {
        if (discount.kind === 'check') continue;
        const discountId = uuidv7();
        discountIds.push(discountId);
        const rule = discount.ruleId ? ruleById.get(discount.ruleId) : undefined;
        insertDiscount.run(
          discountId,
          saleId,
          lineIds.get(line.productId)!,
          discount.kind,
          discount.ruleId ?? null,
          discount.amount,
          discount.percentBp ?? rule?.percentBp ?? null,
          userId,
        );
      }
    }
    const checkDiscountTotal = loaded.calculated.lines.reduce((sum, line) => sum + BigInt(line.checkDiscount), 0n);
    if (checkDiscountTotal > 0n) {
      const checkDiscountId = uuidv7();
      discountIds.push(checkDiscountId);
      insertDiscount.run(
        checkDiscountId,
        saleId,
        null,
        'check',
        null,
        Number(checkDiscountTotal),
        options.checkDiscount?.kind === 'percent' ? options.checkDiscount.valueBp : null,
        userId,
      );
    }

    const paymentIds: string[] = [];
    const cashIds: string[] = [];
    for (const [index, payment] of normalized.payments.entries()) {
      const paymentId = uuidv7();
      paymentIds.push(paymentId);
      const method = methodById.get(payment.methodId)!;
      db.prepare(
        `INSERT INTO payments
           (id, purpose, sale_id, customer_id, method_id, amount, tendered, direction,
            user_id, idempotency_key, created_at)
         VALUES (?, 'sale', ?, ?, ?, ?, ?, 'in', ?, ?, ?)`,
      ).run(
        paymentId,
        saleId,
        customer?.id ?? null,
        payment.methodId,
        payment.amount,
        payment.tendered,
        userId,
        `${normalized.idempotencyKey}:${index}`,
        createdAt,
      );
      if (method.kind === 'cash') {
        const cashId = uuidv7();
        cashIds.push(cashId);
        db.prepare(
          `INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at)
           VALUES (?, ?, ?, 'sale', ?, ?, ?)`,
        ).run(cashId, payment.methodId, payment.amount, saleId, userId, createdAt);
      }
    }

    const debtIds: string[] = [];
    if (debtAmount > 0 && customer) {
      const debtId = uuidv7();
      debtIds.push(debtId);
      db.prepare(
        `INSERT INTO debt_ledger
           (id, customer_id, sale_id, type, amount, user_id, created_at)
         VALUES (?, ?, ?, 'DEBT_ADD', ?, ?, ?)`,
      ).run(debtId, customer.id, saleId, debtAmount, userId, createdAt);
    }

    if (counterOrder) {
      const heldUpdate = db.prepare(
        `UPDATE held_carts SET status = 'closed', sale_id = ?, closed_at = ?
         WHERE id = ? AND status = 'open'`,
      ).run(saleId, createdAt, counterOrder.held_cart_id);
      if (heldUpdate.changes !== 1) throw new AuthError(409, 'cart.held_not_open');
      const orderUpdate = db.prepare(
        `UPDATE counter_orders
         SET status = 'paid', sale_id = ?, paid_by = ?, paid_at = ?
         WHERE id = ? AND status = 'pending' AND expires_at > ?`,
      ).run(saleId, userId, createdAt, counterOrder.id, createdAt);
      if (orderUpdate.changes !== 1) throw new AuthError(409, 'counter_order.not_pending');
      addSyncOutbox(db, 'counter_orders', counterOrder.id, createdAt);
      writeAudit(db, {
        userId,
        action: 'counter_order.pay',
        entity: 'counter_orders',
        entityId: counterOrder.id,
        before: { status: 'pending' },
        after: { status: 'paid', saleId, methodId: normalized.payments[0]!.methodId, paidBy: userId },
      });
    } else if (normalized.heldCartId) {
      const heldUpdate = db.prepare(
        `UPDATE held_carts SET status = 'closed', sale_id = ?, closed_at = ?
         WHERE id = ? AND status = 'open'`,
      ).run(saleId, createdAt, normalized.heldCartId);
      if (heldUpdate.changes !== 1) throw new AuthError(409, 'cart.held_not_open');
    } else {
      const cartUpdate = db.prepare(
        `UPDATE carts SET status = 'closed', sale_id = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'active'`,
      ).run(saleId, createdAt, loaded.cart.id, userId);
      if (cartUpdate.changes !== 1) throw new AuthError(409, 'cart.not_active');
      db.prepare(
        `INSERT INTO carts (id, user_id, status, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?)`,
      ).run(uuidv7(), userId, createdAt, createdAt);
    }
    db.prepare(
      `INSERT INTO idempotency_keys (key, user_id, operation, result_type, result_id, created_at)
       VALUES (?, ?, 'sale', 'sales', ?, ?)`,
    ).run(normalized.idempotencyKey, userId, saleId, createdAt);

    addSaleOutbox(
      db,
      saleId,
      insertedLineIds,
      discountIds,
      allocationIds,
      movementIds,
      paymentIds,
      debtIds,
      cashIds,
      createdAt,
    );
    writeAudit(db, {
      userId,
      action: 'sale.create',
      entity: 'sales',
      entityId: saleId,
      after: {
        number,
        warehouseId: warehouse.id,
        total: loaded.calculated.total,
        paidTotal,
        debtAmount,
        lineCount: loaded.calculated.lines.length,
      },
    });
    const printSnapshot = captureSalePrintSnapshot(db, saleId);
    db.prepare(
      `INSERT INTO print_jobs
         (id, doc_type, doc_id, kind, status, attempts, created_at, updated_at, lang, snapshot_json)
       VALUES (?, 'sale', ?, 'original', 'pending', 0, ?, ?, ?, ?)`,
    ).run(uuidv7(), saleId, createdAt, createdAt, saleLang, printSnapshot);
    return { receipt: saleReceipt(db, saleId), replayed: false };
  });
}
