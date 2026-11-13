import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { hasPermission } from '../auth/permissions';
import { AuthError } from '../auth/service';

interface OpenSaleRow {
  id: string;
  number: string;
  createdAt: string;
  total: number;
  balance: number;
}

interface DebtPaymentInput {
  customerId: string;
  methodId: string;
  amount: number;
  idempotencyKey: string;
}

interface ForgivenessItem {
  saleId: string;
  amount: number;
}

function assertSafeAmount(value: number, errorKey: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new AuthError(400, errorKey);
  return value;
}

function normalizeText(value: unknown, errorKey: string, maxLength: number): string {
  if (typeof value !== 'string') throw new AuthError(400, errorKey);
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) throw new AuthError(400, errorKey);
  return text;
}

function normalizeDebtPayment(input: unknown): DebtPaymentInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) =>
    !['customerId', 'methodId', 'amount', 'idempotencyKey'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.customerId !== 'string' || row.customerId.length < 1 || row.customerId.length > 64) {
    throw new AuthError(400, 'validation.invalid_customer');
  }
  if (typeof row.methodId !== 'string' || row.methodId.length < 1 || row.methodId.length > 64) {
    throw new AuthError(400, 'validation.invalid_payment_method');
  }
  if (!Number.isSafeInteger(row.amount) || (row.amount as number) <= 0) {
    throw new AuthError(400, 'validation.invalid_payment_amount');
  }
  if (typeof row.idempotencyKey !== 'string' || row.idempotencyKey.trim().length === 0 ||
      row.idempotencyKey.length > 128) {
    throw new AuthError(400, 'validation.invalid_idempotency_key');
  }
  return {
    customerId: row.customerId,
    methodId: row.methodId,
    amount: row.amount as number,
    idempotencyKey: row.idempotencyKey.trim(),
  };
}

function normalizeForgiveness(input: unknown): {
  customerId: string;
  reason: string;
  items: ForgivenessItem[];
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['customerId', 'reason', 'items'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (typeof row.customerId !== 'string' || row.customerId.length < 1 || row.customerId.length > 64) {
    throw new AuthError(400, 'validation.invalid_customer');
  }
  const reason = normalizeText(row.reason, 'debt.invalid_forgiveness_reason', 1000);
  if (!Array.isArray(row.items) || row.items.length < 1 || row.items.length > 100) {
    throw new AuthError(400, 'debt.invalid_forgiveness');
  }
  const seen = new Set<string>();
  const items = row.items.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new AuthError(400, 'debt.invalid_forgiveness');
    }
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => key !== 'saleId' && key !== 'amount') ||
        typeof item.saleId !== 'string' || item.saleId.length < 1 || item.saleId.length > 64 ||
        seen.has(item.saleId) || !Number.isSafeInteger(item.amount) || (item.amount as number) <= 0) {
      throw new AuthError(400, 'debt.invalid_forgiveness');
    }
    seen.add(item.saleId);
    return { saleId: item.saleId, amount: item.amount as number };
  });
  return { customerId: row.customerId, reason, items };
}

function safeBalance(value: number): number {
  if (!Number.isSafeInteger(value)) throw new AuthError(409, 'debt.balance_out_of_range');
  if (value < 0) throw new Error('Debt ledger contains a negative receipt balance.');
  return value;
}

function readOpenSales(db: Db, customerId: string): OpenSaleRow[] {
  const rows = db.prepare(
    `SELECT s.id, s.number, s.created_at AS createdAt, s.total,
            COALESCE(SUM(dl.amount), 0) AS balance
     FROM sales s
     JOIN debt_ledger dl ON dl.sale_id = s.id
     WHERE s.customer_id = ?
     GROUP BY s.id
     HAVING SUM(dl.amount) <> 0
     ORDER BY s.created_at, s.id`,
  ).all(customerId) as OpenSaleRow[];
  return rows.map((row) => ({ ...row, balance: safeBalance(row.balance) }));
}

function readCustomer(db: Db, customerId: string): { id: string; name: string } {
  const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(customerId) as
    | { id: string; name: string }
    | undefined;
  if (!customer) throw new AuthError(404, 'debt.customer_not_found');
  return customer;
}

function addOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

function paymentResult(db: Db, paymentId: string, replayed: boolean, lang: 'ru' | 'uz') {
  const methodName = lang === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  const payment = db.prepare(
    `SELECT p.id, p.customer_id AS customerId, c.name AS customerName, p.method_id AS methodId,
            ${methodName} AS methodName, p.amount, p.created_at AS createdAt
     FROM payments p
     JOIN customers c ON c.id = p.customer_id
     JOIN payment_methods pm ON pm.id = p.method_id
     WHERE p.id = ? AND p.purpose = 'debt_payment'`,
  ).get(paymentId) as {
    id: string;
    customerId: string;
    customerName: string;
    methodId: string;
    methodName: string;
    amount: number;
    createdAt: string;
  } | undefined;
  if (!payment) throw new Error(`Missing debt payment: ${paymentId}`);
  const allocations = db.prepare(
    `SELECT a.sale_id AS saleId, s.number AS saleNumber, a.amount
     FROM debt_payment_allocations a
     JOIN sales s ON s.id = a.sale_id
     WHERE a.payment_id = ?
     ORDER BY s.created_at, s.id`,
  ).all(paymentId) as Array<{ saleId: string; saleNumber: string; amount: number }>;
  return { payment, allocations, replayed };
}

export function listDebtors(db: Db): Array<{
  customerId: string;
  customerName: string;
  balance: number;
  openSaleCount: number;
}> {
  const rows = db.prepare(
    `SELECT c.id AS customerId, c.name AS customerName, s.id AS saleId,
            SUM(dl.amount) AS balance
     FROM customers c
     JOIN sales s ON s.customer_id = c.id
     JOIN debt_ledger dl ON dl.sale_id = s.id
     GROUP BY s.id
     ORDER BY c.name, c.id, s.created_at, s.id`,
  ).all() as Array<{ customerId: string; customerName: string; saleId: string; balance: number }>;
  const debtors = new Map<string, {
    customerId: string;
    customerName: string;
    balance: bigint;
    openSaleCount: number;
  }>();
  for (const row of rows) {
    const balance = safeBalance(row.balance);
    if (balance === 0) continue;
    const debtor = debtors.get(row.customerId) ?? {
      customerId: row.customerId,
      customerName: row.customerName,
      balance: 0n,
      openSaleCount: 0,
    };
    debtor.balance += BigInt(balance);
    debtor.openSaleCount += 1;
    if (debtor.balance > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new AuthError(409, 'debt.balance_out_of_range');
    }
    debtors.set(row.customerId, debtor);
  }
  return [...debtors.values()].map(({ balance, ...debtor }) => ({
    ...debtor,
    balance: Number(balance),
  }));
}

export function listDebtPaymentMethods(
  db: Db,
  lang: 'ru' | 'uz' = 'ru',
): Array<{ id: string; name: string; kind: string }> {
  const nameColumn = lang === 'uz' ? 'COALESCE(name_uz, name_ru)' : 'name_ru';
  return db.prepare(
    `SELECT id, ${nameColumn} AS name, kind FROM payment_methods
     WHERE active = 1 ORDER BY rowid`,
  ).all() as Array<{ id: string; name: string; kind: string }>;
}

export function getCustomerDebt(db: Db, customerIdInput: unknown) {
  if (typeof customerIdInput !== 'string' || customerIdInput.length < 1 || customerIdInput.length > 64) {
    throw new AuthError(400, 'validation.invalid_customer');
  }
  const customer = readCustomer(db, customerIdInput);
  const sales = readOpenSales(db, customer.id);
  const balance = sales.reduce((sum, sale) => sum + BigInt(sale.balance), 0n);
  if (balance > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AuthError(409, 'debt.balance_out_of_range');
  }
  return { customer, balance: Number(balance), sales };
}

export function collectDebtPayment(db: Db, userId: string, input: unknown, lang: 'ru' | 'uz' = 'ru') {
  const normalized = normalizeDebtPayment(input);
  return inTransaction(db, () => {
    if (!hasPermission(db, userId, 'debt_payment')) {
      throw new AuthError(403, 'auth.permission_denied');
    }
    const existing = db.prepare(
      'SELECT user_id, operation, result_id FROM idempotency_keys WHERE key = ?',
    ).get(normalized.idempotencyKey) as
      | { user_id: string; operation: string; result_id: string | null }
      | undefined;
    if (existing) {
      if (existing.user_id !== userId || existing.operation !== 'debt_payment' || !existing.result_id) {
        throw new AuthError(409, 'debt.idempotency_conflict');
      }
      const result = paymentResult(db, existing.result_id, true, lang);
      if (result.payment.customerId !== normalized.customerId ||
          result.payment.methodId !== normalized.methodId ||
          result.payment.amount !== normalized.amount) {
        throw new AuthError(409, 'debt.idempotency_conflict');
      }
      return result;
    }

    const customer = readCustomer(db, normalized.customerId);
    const method = db.prepare(
      'SELECT id, name_ru, kind FROM payment_methods WHERE id = ? AND active = 1',
    ).get(normalized.methodId) as { id: string; name_ru: string; kind: string } | undefined;
    if (!method) throw new AuthError(400, 'validation.invalid_payment_method');

    const openSales = readOpenSales(db, customer.id);
    const totalOpen = openSales.reduce((sum, sale) => sum + BigInt(sale.balance), 0n);
    if (totalOpen === 0n) throw new AuthError(409, 'debt.no_open_balance');
    if (BigInt(normalized.amount) > totalOpen) throw new AuthError(409, 'debt.payment_exceeds_balance');

    const paymentId = uuidv7();
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO payments
         (id, purpose, customer_id, method_id, amount, direction, user_id, idempotency_key, created_at)
       VALUES (?, 'debt_payment', ?, ?, ?, 'in', ?, ?, ?)`,
    ).run(
      paymentId,
      customer.id,
      method.id,
      normalized.amount,
      userId,
      normalized.idempotencyKey,
      createdAt,
    );

    let remaining = normalized.amount;
    const debtIds: string[] = [];
    const allocationIds: string[] = [];
    const allocations: Array<{ saleId: string; saleNumber: string; amount: number }> = [];
    for (const sale of openSales) {
      if (remaining === 0) break;
      const amount = Math.min(remaining, sale.balance);
      const debtId = uuidv7();
      db.prepare(
        `INSERT INTO debt_ledger
           (id, customer_id, sale_id, type, amount, payment_id, method_id, user_id, created_at)
         VALUES (?, ?, ?, 'DEBT_PAY', ?, ?, ?, ?, ?)`,
      ).run(debtId, customer.id, sale.id, -amount, paymentId, method.id, userId, createdAt);
      const allocationId = uuidv7();
      db.prepare(
        `INSERT INTO debt_payment_allocations (id, payment_id, debt_ledger_id, sale_id, amount)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(allocationId, paymentId, debtId, sale.id, amount);
      debtIds.push(debtId);
      allocationIds.push(allocationId);
      allocations.push({ saleId: sale.id, saleNumber: sale.number, amount });
      remaining -= amount;
    }
    if (remaining !== 0) throw new Error('Debt payment allocation did not balance.');

    const cashIds: string[] = [];
    if (method.kind === 'cash') {
      const cashId = uuidv7();
      db.prepare(
        `INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at)
         VALUES (?, ?, ?, 'debt_payment', ?, ?, ?)`,
      ).run(cashId, method.id, normalized.amount, paymentId, userId, createdAt);
      cashIds.push(cashId);
    }
    db.prepare(
      `INSERT INTO idempotency_keys (key, user_id, operation, result_type, result_id, created_at)
       VALUES (?, ?, 'debt_payment', 'payments', ?, ?)`,
    ).run(normalized.idempotencyKey, userId, paymentId, createdAt);

    addOutbox(db, 'payments', paymentId, createdAt);
    for (const id of debtIds) addOutbox(db, 'debt_ledger', id, createdAt);
    for (const id of allocationIds) addOutbox(db, 'debt_payment_allocations', id, createdAt);
    for (const id of cashIds) addOutbox(db, 'cash_ledger', id, createdAt);
    writeAudit(db, {
      userId,
      action: 'debt.payment',
      entity: 'payments',
      entityId: paymentId,
      after: {
        customerId: customer.id,
        amount: normalized.amount,
        methodId: method.id,
        allocations,
      },
    });
    return paymentResult(db, paymentId, false, lang);
  });
}

export function forgiveDebt(db: Db, userId: string, input: unknown) {
  const normalized = normalizeForgiveness(input);
  return inTransaction(db, () => {
    const user = db.prepare('SELECT role FROM users WHERE id = ? AND active = 1').get(userId) as
      | { role: string }
      | undefined;
    if (user?.role !== 'admin') throw new AuthError(403, 'debt.admin_required');
    const customer = readCustomer(db, normalized.customerId);
    const openSales = readOpenSales(db, customer.id);
    const openById = new Map(openSales.map((sale) => [sale.id, sale]));
    for (const item of normalized.items) {
      const sale = openById.get(item.saleId);
      if (!sale) throw new AuthError(409, 'debt.no_open_balance');
      if (item.amount > sale.balance) throw new AuthError(409, 'debt.forgive_exceeds_balance');
    }

    const createdAt = nowIso();
    const forgiven = normalized.items.map((item) => {
      const sale = openById.get(item.saleId)!;
      const id = uuidv7();
      db.prepare(
        `INSERT INTO debt_ledger
           (id, customer_id, sale_id, type, amount, user_id, note, created_at)
         VALUES (?, ?, ?, 'DEBT_FORGIVE', ?, ?, ?, ?)`,
      ).run(id, customer.id, sale.id, -item.amount, userId, normalized.reason, createdAt);
      addOutbox(db, 'debt_ledger', id, createdAt);
      return {
        id,
        saleId: sale.id,
        saleNumber: sale.number,
        amount: item.amount,
        balanceAfter: sale.balance - item.amount,
      };
    });
    writeAudit(db, {
      userId,
      action: 'debt.forgive',
      entity: 'debt_ledger',
      after: { customerId: customer.id, reason: normalized.reason, items: forgiven },
    });
    return { customer, reason: normalized.reason, forgiven };
  });
}
