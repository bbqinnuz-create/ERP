import { mulQty, roundDiv, roundToSum } from '../../core/money';

export type PriceRuleType = 'qty' | 'promo' | 'customer';
export type DiscountKind = 'percent' | 'amount';

export type PriceErrorCode =
  | 'INVALID_INPUT'
  | 'DISCOUNT_NOT_ALLOWED'
  | 'NEEDS_ADMIN'
  | 'BELOW_COST';

export class PriceCalculationError extends Error {
  constructor(readonly code: PriceErrorCode) {
    super(code);
    this.name = 'PriceCalculationError';
  }
}

export interface PriceRule {
  id: string;
  type: PriceRuleType;
  productId?: string | null;
  categoryId?: string | null;
  customerId?: string | null;
  minQty?: number | null;
  minInclusive?: boolean;
  maxQty?: number | null;
  price?: number | null;
  percentBp?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  priority?: number;
  active?: boolean;
}

export type DiscountInput =
  | { kind: 'percent'; valueBp: number }
  | { kind: 'amount'; amount: number };

export interface PriceCartLine {
  productId: string;
  categoryId?: string | null;
  qty: number;
  basePrice: number;
  fifoCostTotal?: number;
}

export interface ManualLineDiscount {
  productId: string;
  discount: DiscountInput;
}

export interface PriceCart {
  lines: PriceCartLine[];
  customerId?: string | null;
  manualDiscounts?: ManualLineDiscount[];
  checkDiscount?: DiscountInput | null;
}

export interface PricePermissions {
  discountManual: boolean;
  discountManualLimitBp: number;
  discountCheck: boolean;
  discountCheckLimitBp: number;
}

export interface PriceSettings {
  rounding: 'sum' | 'tiyin';
  permissions: PricePermissions;
}

export interface AppliedDiscount {
  kind: PriceRuleType | 'manual' | 'check';
  amount: number;
  ruleId?: string;
  percentBp?: number;
}

export interface CalculatedPriceLine {
  productId: string;
  categoryId: string | null;
  qty: number;
  basePrice: number;
  unitPrice: number;
  baseTotal: number;
  subtotal: number;
  ruleDiscount: number;
  manualDiscount: number;
  checkDiscount: number;
  lineDiscount: number;
  lineTotal: number;
  appliedDiscounts: AppliedDiscount[];
}

export interface CalculatedCart {
  lines: CalculatedPriceLine[];
  subtotal: number;
  discountTotal: number;
  total: number;
}

interface MergedLine extends PriceCartLine {
  categoryId: string | null;
}

interface PriceCandidate {
  price: number;
  rule: PriceRule | null;
}

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function invalidInput(): never {
  throw new PriceCalculationError('INVALID_INPUT');
}

function assertNonNegativeInteger(value: number, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) invalidInput();
}

function toSafeNumber(value: bigint): number {
  if (value < 0n || value > MAX_SAFE_BIGINT) invalidInput();
  return Number(value);
}

function safeSum(values: number[]): number {
  return toSafeNumber(values.reduce((sum, value) => sum + BigInt(value), 0n));
}

function checkedMulQty(qty: number, unitPrice: number): number {
  const rounded = roundDiv(BigInt(qty) * BigInt(unitPrice), 1000n);
  if (rounded < 0n || rounded > MAX_SAFE_BIGINT) invalidInput();
  return mulQty(qty, unitPrice);
}

function roundAmount(amount: number, rounding: PriceSettings['rounding']): number {
  if (rounding === 'tiyin') return amount;
  if (rounding !== 'sum') invalidInput();
  const rounded = roundDiv(BigInt(amount), 100n) * 100n;
  return toSafeNumber(rounded);
}

function percentageAmount(amount: number, percentBp: number): number {
  assertNonNegativeInteger(percentBp, 10_000);
  return toSafeNumber(roundDiv(BigInt(amount) * BigInt(percentBp), 10_000n));
}

function validateDiscount(discount: DiscountInput): void {
  if (!discount || typeof discount !== 'object') invalidInput();
  if (discount.kind === 'percent') {
    assertNonNegativeInteger(discount.valueBp, 10_000);
  } else if (discount.kind === 'amount') {
    assertNonNegativeInteger(discount.amount);
  } else {
    invalidInput();
  }
}

function discountAmount(discount: DiscountInput, subtotal: number): number {
  validateDiscount(discount);
  const amount = discount.kind === 'percent'
    ? percentageAmount(subtotal, discount.valueBp)
    : discount.amount;
  if (amount > subtotal) invalidInput();
  return amount;
}

function authorizeDiscount(
  amount: number,
  subtotal: number,
  permitted: boolean,
  limitBp: number,
): void {
  assertNonNegativeInteger(limitBp, 10_000);
  if (amount === 0) return;
  if (!permitted) throw new PriceCalculationError('DISCOUNT_NOT_ALLOWED');
  if (BigInt(amount) * 10_000n > BigInt(subtotal) * BigInt(limitBp)) {
    throw new PriceCalculationError('NEEDS_ADMIN');
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function tashkentDate(now: Date): string {
  if (!Number.isFinite(now.getTime())) invalidInput();
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validateRule(rule: PriceRule): void {
  if (
    !rule ||
    !rule.id ||
    !['qty', 'promo', 'customer'].includes(rule.type) ||
    (rule.productId == null && rule.categoryId == null) ||
    (rule.price == null && rule.percentBp == null) ||
    (rule.price != null && rule.percentBp != null)
  ) {
    invalidInput();
  }
  if (rule.productId != null && (typeof rule.productId !== 'string' || rule.productId.length === 0)) invalidInput();
  if (rule.categoryId != null && (typeof rule.categoryId !== 'string' || rule.categoryId.length === 0)) invalidInput();
  if (rule.customerId != null && (typeof rule.customerId !== 'string' || rule.customerId.length === 0)) invalidInput();
  if (rule.price != null) assertNonNegativeInteger(rule.price);
  if (rule.percentBp != null) assertNonNegativeInteger(rule.percentBp, 10_000);
  if (rule.minQty != null) assertNonNegativeInteger(rule.minQty);
  if (rule.maxQty != null) assertNonNegativeInteger(rule.maxQty);
  if (rule.minQty != null && rule.maxQty != null && rule.minQty > rule.maxQty) invalidInput();
  if (rule.priority != null && !Number.isSafeInteger(rule.priority)) invalidInput();
  if (rule.active != null && typeof rule.active !== 'boolean') invalidInput();
  if (rule.minInclusive != null && typeof rule.minInclusive !== 'boolean') invalidInput();
  if (rule.dateFrom != null && (typeof rule.dateFrom !== 'string' || !isValidDate(rule.dateFrom))) invalidInput();
  if (rule.dateTo != null && (typeof rule.dateTo !== 'string' || !isValidDate(rule.dateTo))) invalidInput();
  if (rule.dateFrom != null && rule.dateTo != null && rule.dateFrom > rule.dateTo) invalidInput();
}

function mergeLines(lines: PriceCartLine[]): MergedLine[] {
  if (!Array.isArray(lines) || lines.length === 0) invalidInput();
  const merged = new Map<string, MergedLine>();
  for (const line of lines) {
    if (!line || typeof line.productId !== 'string' || line.productId.length === 0) invalidInput();
    if (line.categoryId != null && (typeof line.categoryId !== 'string' || line.categoryId.length === 0)) invalidInput();
    assertNonNegativeInteger(line.qty);
    if (line.qty === 0) invalidInput();
    assertNonNegativeInteger(line.basePrice);
    if (line.fifoCostTotal != null) assertNonNegativeInteger(line.fifoCostTotal);
    const categoryId = line.categoryId ?? null;
    const current = merged.get(line.productId);
    if (current) {
      if (current.basePrice !== line.basePrice || current.categoryId !== categoryId) invalidInput();
      if ((current.fifoCostTotal == null) !== (line.fifoCostTotal == null)) invalidInput();
      current.qty = toSafeNumber(BigInt(current.qty) + BigInt(line.qty));
      if (current.fifoCostTotal != null && line.fifoCostTotal != null) {
        current.fifoCostTotal = toSafeNumber(BigInt(current.fifoCostTotal) + BigInt(line.fifoCostTotal));
      }
    } else {
      merged.set(line.productId, { ...line, categoryId });
    }
  }
  return [...merged.values()];
}

function ruleDateMatches(rule: PriceRule, date: string): boolean {
  return (rule.dateFrom == null || date >= rule.dateFrom) &&
    (rule.dateTo == null || date <= rule.dateTo);
}

function ruleMatchesLine(rule: PriceRule, line: MergedLine, cart: PriceCart, date: string): boolean {
  if (rule.active === false) return false;
  if (rule.productId != null && rule.productId !== line.productId) return false;
  if (rule.categoryId != null && rule.categoryId !== line.categoryId) return false;
  if (rule.type === 'customer' && (cart.customerId == null || cart.customerId !== rule.customerId)) return false;
  if (!ruleDateMatches(rule, date)) return false;
  if (rule.type === 'qty') {
    if (rule.minQty != null) {
      const minInclusive = rule.minInclusive ?? true;
      if (minInclusive ? line.qty < rule.minQty : line.qty <= rule.minQty) return false;
    }
    if (rule.maxQty != null && line.qty > rule.maxQty) return false;
  }
  return true;
}

function candidatePrice(rule: PriceRule, basePrice: number): number {
  if (rule.price != null) return rule.price;
  if (rule.percentBp == null) invalidInput();
  return toSafeNumber(roundDiv(BigInt(basePrice) * BigInt(10_000 - rule.percentBp), 10_000n));
}

function selectPrice(
  line: MergedLine,
  cart: PriceCart,
  rules: PriceRule[],
  date: string,
): PriceCandidate {
  let selected: PriceCandidate = { price: line.basePrice, rule: null };
  for (const rule of rules) {
    if (!ruleMatchesLine(rule, line, cart, date)) continue;
    const price = candidatePrice(rule, line.basePrice);
    if (price < selected.price ||
      (price === selected.price && selected.rule != null &&
        ((rule.priority ?? 0) > (selected.rule.priority ?? 0) ||
          ((rule.priority ?? 0) === (selected.rule.priority ?? 0) && rule.id < selected.rule.id)))) {
      selected = { price, rule };
    }
  }
  return selected;
}

function allocateProportionally(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const weightTotal = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (weightTotal === 0n) {
    if (total !== 0) invalidInput();
    return weights.map(() => 0);
  }
  let cumulativeWeight = 0n;
  let previousShare = 0n;
  const shares: number[] = [];
  for (let index = 0; index < weights.length - 1; index += 1) {
    cumulativeWeight += BigInt(weights[index]!);
    const cumulativeShare = roundDiv(BigInt(total) * cumulativeWeight, weightTotal);
    shares.push(toSafeNumber(cumulativeShare - previousShare));
    previousShare = cumulativeShare;
  }
  shares.push(toSafeNumber(BigInt(total) - previousShare));
  return shares;
}

export function calculateCart(
  cart: PriceCart,
  rules: PriceRule[],
  settings: PriceSettings,
  now: Date,
): CalculatedCart {
  if (!cart || !Array.isArray(rules) || !settings || !settings.permissions) invalidInput();
  if (settings.rounding !== 'sum' && settings.rounding !== 'tiyin') invalidInput();
  if (typeof settings.permissions.discountManual !== 'boolean' ||
    typeof settings.permissions.discountCheck !== 'boolean') invalidInput();
  assertNonNegativeInteger(settings.permissions.discountManualLimitBp, 10_000);
  assertNonNegativeInteger(settings.permissions.discountCheckLimitBp, 10_000);
  if ((cart.customerId != null && typeof cart.customerId !== 'string') ||
    (cart.manualDiscounts != null && !Array.isArray(cart.manualDiscounts))) invalidInput();
  for (const rule of rules) validateRule(rule);

  const date = tashkentDate(now);
  const mergedLines = mergeLines(cart.lines);
  const lineIds = new Set(mergedLines.map((line) => line.productId));
  const manualDiscounts = new Map<string, DiscountInput>();
  for (const entry of cart.manualDiscounts ?? []) {
    if (!entry || typeof entry.productId !== 'string') invalidInput();
    if (!lineIds.has(entry.productId) || manualDiscounts.has(entry.productId)) invalidInput();
    validateDiscount(entry.discount);
    manualDiscounts.set(entry.productId, entry.discount);
  }

  const prepared = mergedLines.map((line) => {
    const selected = selectPrice(line, cart, rules, date);
    const baseTotal = roundAmount(checkedMulQty(line.qty, line.basePrice), settings.rounding);
    const subtotal = roundAmount(checkedMulQty(line.qty, selected.price), settings.rounding);
    const ruleDiscount = baseTotal - subtotal;
    const manual = manualDiscounts.get(line.productId);
    const requestedManual = manual == null ? 0 : discountAmount(manual, subtotal);
    if (manual != null) {
      authorizeDiscount(
        requestedManual,
        subtotal,
        settings.permissions.discountManual,
        settings.permissions.discountManualLimitBp,
      );
    }
    const afterManual = roundAmount(subtotal - requestedManual, settings.rounding);
    const manualDiscount = subtotal - afterManual;
    return {
      line,
      selected,
      baseTotal,
      subtotal,
      ruleDiscount,
      afterManual,
      manualDiscount,
      manual,
    };
  });

  const checkSubtotal = safeSum(prepared.map((entry) => entry.afterManual));
  const requestedCheck = cart.checkDiscount == null
    ? 0
    : discountAmount(cart.checkDiscount, checkSubtotal);
  if (cart.checkDiscount != null) {
    authorizeDiscount(
      requestedCheck,
      checkSubtotal,
      settings.permissions.discountCheck,
      settings.permissions.discountCheckLimitBp,
    );
  }
  const checkShares = allocateProportionally(
    requestedCheck,
    prepared.map((entry) => entry.afterManual),
  );

  const lines: CalculatedPriceLine[] = prepared.map((entry, index) => {
    const checkBeforeRounding = entry.afterManual - checkShares[index]!;
    const lineTotal = roundAmount(checkBeforeRounding, settings.rounding);
    const checkDiscount = entry.afterManual - lineTotal;
    const appliedDiscounts: AppliedDiscount[] = [];
    if (entry.selected.rule && entry.ruleDiscount > 0) {
      appliedDiscounts.push({
        kind: entry.selected.rule.type,
        ruleId: entry.selected.rule.id,
        amount: entry.ruleDiscount,
      });
    }
    if (entry.manualDiscount > 0) {
      appliedDiscounts.push({
        kind: 'manual',
        amount: entry.manualDiscount,
        ...(entry.manual?.kind === 'percent' ? { percentBp: entry.manual.valueBp } : {}),
      });
    }
    if (checkDiscount > 0) {
      appliedDiscounts.push({
        kind: 'check',
        amount: checkDiscount,
        ...(cart.checkDiscount?.kind === 'percent' ? { percentBp: cart.checkDiscount.valueBp } : {}),
      });
    }
    return {
      productId: entry.line.productId,
      categoryId: entry.line.categoryId,
      qty: entry.line.qty,
      basePrice: entry.line.basePrice,
      unitPrice: entry.selected.price,
      baseTotal: entry.baseTotal,
      subtotal: entry.subtotal,
      ruleDiscount: entry.ruleDiscount,
      manualDiscount: entry.manualDiscount,
      checkDiscount,
      lineDiscount: entry.baseTotal - lineTotal,
      lineTotal,
      appliedDiscounts,
    };
  });
  const subtotal = safeSum(lines.map((line) => line.baseTotal));
  const total = safeSum(lines.map((line) => line.lineTotal));
  const result = { lines, subtotal, discountTotal: subtotal - total, total };
  const hasFifoCost = mergedLines.some((line) => line.fifoCostTotal != null);
  if (hasFifoCost) {
    const fifoCosts = mergedLines.map((line) => {
      if (line.fifoCostTotal == null) invalidInput();
      return { productId: line.productId, costTotal: line.fifoCostTotal };
    });
    assertNotBelowCost(result, fifoCosts);
  }
  return result;
}

export function assertNotBelowCost(
  cart: CalculatedCart,
  fifoCosts: Array<{ productId: string; costTotal: number }>,
): void {
  if (!cart || !Array.isArray(fifoCosts)) invalidInput();
  const costs = new Map<string, number>();
  for (const cost of fifoCosts) {
    if (!cost || typeof cost.productId !== 'string' || cost.productId.length === 0 ||
      costs.has(cost.productId)) invalidInput();
    assertNonNegativeInteger(cost.costTotal);
    costs.set(cost.productId, cost.costTotal);
  }
  for (const line of cart.lines) {
    const costTotal = costs.get(line.productId);
    if (costTotal == null) invalidInput();
    if (line.lineTotal < costTotal) throw new PriceCalculationError('BELOW_COST');
  }
  if (costs.size !== cart.lines.length) invalidInput();
}
