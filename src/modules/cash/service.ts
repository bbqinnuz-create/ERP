import type { Db } from '../../db/connection';
import { nextDocNumber } from '../../core/counters';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { hasPermission, type Permission } from '../auth/permissions';
import { AuthError } from '../auth/service';

export type CashOperationType = 'cash_in' | 'cash_out' | 'expense' | 'collection';

interface CashOperationInput {
  type: CashOperationType;
  amount: number;
  reason: string;
  category: string | null;
  reference: string | null;
  idempotencyKey: string;
}

interface CashOperationRow {
  id: string;
  number: string;
  type: CashOperationType;
  amount: number;
  methodId: string;
  reason: string;
  category: string | null;
  reference: string | null;
  reversesId: string | null;
  userId: string;
  createdAt: string;
}

interface CashPeriod {
  from: string | null;
  to: string | null;
  fromIso: string | null;
  toExclusiveIso: string | null;
}

const PERMISSION_BY_TYPE: Record<CashOperationType, Permission> = {
  cash_in: 'cash_in',
  cash_out: 'cash_out',
  expense: 'expense',
  collection: 'cash_collection',
};

function assertAmount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AuthError(400, 'cash.invalid_amount');
  }
  return value as number;
}

function normalizeText(value: unknown, errorKey: string, maxLength: number): string {
  if (typeof value !== 'string') throw new AuthError(400, errorKey);
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) throw new AuthError(400, errorKey);
  return text;
}

function normalizeOptionalText(value: unknown, errorKey: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AuthError(400, errorKey);
  const text = value.trim();
  if (text.length > maxLength) throw new AuthError(400, errorKey);
  return text || null;
}

function normalizeIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    throw new AuthError(400, 'validation.invalid_idempotency_key');
  }
  return value.trim();
}

function normalizeOperationInput(input: unknown): CashOperationInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) =>
    !['type', 'amount', 'reason', 'category', 'reference', 'idempotencyKey'].includes(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (row.type !== 'cash_in' && row.type !== 'cash_out' &&
      row.type !== 'expense' && row.type !== 'collection') {
    throw new AuthError(400, 'cash.invalid_operation');
  }
  const category = normalizeOptionalText(row.category, 'cash.invalid_category', 120);
  if (row.type === 'expense' && !category) throw new AuthError(400, 'cash.category_required');
  return {
    type: row.type,
    amount: assertAmount(row.amount),
    reason: normalizeText(row.reason, 'cash.invalid_reason', 500),
    category,
    reference: normalizeOptionalText(row.reference, 'cash.invalid_reference', 200),
    idempotencyKey: normalizeIdempotencyKey(row.idempotencyKey),
  };
}

function normalizeReversalInput(input: unknown): { reason: string; idempotencyKey: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'reason' && key !== 'idempotencyKey')) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  return {
    reason: normalizeText(row.reason, 'cash.invalid_reason', 500),
    idempotencyKey: normalizeIdempotencyKey(row.idempotencyKey),
  };
}

function validateDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AuthError(400, 'cash.invalid_date_range');
  }
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new AuthError(400, 'cash.invalid_date_range');
  }
  return value;
}

function getCashPeriod(fromInput: unknown, toInput: unknown): CashPeriod {
  const from = validateDate(fromInput);
  const to = validateDate(toInput);
  if (from && to && from > to) throw new AuthError(400, 'cash.invalid_date_range');
  const start = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!) - 5 * 60 * 60 * 1000).toISOString();
  };
  const endExclusive = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day! + 1) - 5 * 60 * 60 * 1000).toISOString();
  };
  return {
    from,
    to,
    fromIso: from ? start(from) : null,
    toExclusiveIso: to ? endExclusive(to) : null,
  };
}

function periodWhere(period: CashPeriod, column: string): { sql: string; params: string[] } {
  const clauses: string[] = [];
  const params: string[] = [];
  if (period.fromIso) {
    clauses.push(`${column} >= ?`);
    params.push(period.fromIso);
  }
  if (period.toExclusiveIso) {
    clauses.push(`${column} < ?`);
    params.push(period.toExclusiveIso);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function safeSum(values: number[]): number {
  const sum = values.reduce((total, value) => {
    if (!Number.isSafeInteger(value)) throw new AuthError(409, 'cash.balance_out_of_range');
    return total + BigInt(value);
  }, 0n);
  if (sum > BigInt(Number.MAX_SAFE_INTEGER) || sum < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new AuthError(409, 'cash.balance_out_of_range');
  }
  return Number(sum);
}

function addOutbox(db: Db, table: string, recordId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO sync_outbox (id, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (table_name, record_id) DO UPDATE
       SET created_at = excluded.created_at, sent_at = NULL, attempts = 0`,
  ).run(uuidv7(), table, recordId, createdAt);
}

function operationResult(db: Db, operationId: string, replayed: boolean) {
  const operation = db.prepare(
    `SELECT id, number, type, amount, method_id AS methodId, reason, category,
            reference, reverses_id AS reversesId, user_id AS userId, created_at AS createdAt
     FROM cash_operations WHERE id = ?`,
  ).get(operationId) as CashOperationRow | undefined;
  if (!operation) throw new Error(`Missing cash operation: ${operationId}`);
  return { operation, replayed };
}

function requireOperationPermission(db: Db, userId: string, type: CashOperationType): void {
  if (!hasPermission(db, userId, PERMISSION_BY_TYPE[type])) {
    throw new AuthError(403, 'auth.permission_denied');
  }
}

function getCashMethod(db: Db): { id: string; name: string } {
  const method = db.prepare(
    `SELECT id, name_ru AS name FROM payment_methods
     WHERE active = 1 AND kind = 'cash' ORDER BY rowid LIMIT 1`,
  ).get() as { id: string; name: string } | undefined;
  if (!method) throw new AuthError(409, 'cash.no_cash_method');
  return method;
}

function getBranchId(db: Db): string {
  const branch = db.prepare(
    'SELECT id FROM branches WHERE active = 1 ORDER BY code, id LIMIT 1',
  ).get() as { id: string } | undefined;
  if (!branch) throw new AuthError(409, 'cash.no_active_branch');
  return branch.id;
}

function createOperationRecord(
  db: Db,
  userId: string,
  input: Omit<CashOperationInput, 'idempotencyKey'>,
  reversesId: string | null,
  methodId: string,
  createdAt: string,
): CashOperationRow {
  const id = uuidv7();
  const number = nextDocNumber(db, getBranchId(db), 'cashop');
  db.prepare(
    `INSERT INTO cash_operations
       (id, number, type, amount, method_id, reason, category, reference, reverses_id, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    number,
    input.type,
    input.amount,
    methodId,
    input.reason,
    input.category,
    input.reference,
    reversesId,
    userId,
    createdAt,
  );
  const sign = input.type === 'cash_in' ? 1 : -1;
  const cashId = uuidv7();
  db.prepare(
    `INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at)
     VALUES (?, ?, ?, 'cash_operation', ?, ?, ?)`,
  ).run(cashId, methodId, sign * input.amount, id, userId, createdAt);
  addOutbox(db, 'cash_operations', id, createdAt);
  addOutbox(db, 'cash_ledger', cashId, createdAt);
  return {
    id,
    number,
    type: input.type,
    amount: input.amount,
    methodId,
    reason: input.reason,
    category: input.category,
    reference: input.reference,
    reversesId,
    userId,
    createdAt,
  };
}

function readIdempotency(db: Db, key: string, userId: string, operation: string): string | null {
  const existing = db.prepare(
    'SELECT user_id, operation, result_id FROM idempotency_keys WHERE key = ?',
  ).get(key) as { user_id: string; operation: string; result_id: string | null } | undefined;
  if (!existing) return null;
  if (existing.user_id !== userId || existing.operation !== operation || !existing.result_id) {
    throw new AuthError(409, 'cash.idempotency_conflict');
  }
  return existing.result_id;
}

function writeIdempotency(db: Db, key: string, userId: string, operation: string, resultType: string, resultId: string, at: string): void {
  db.prepare(
    `INSERT INTO idempotency_keys (key, user_id, operation, result_type, result_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(key, userId, operation, resultType, resultId, at);
}

export function createCashOperation(db: Db, userId: string, input: unknown) {
  const normalized = normalizeOperationInput(input);
  return inTransaction(db, () => {
    requireOperationPermission(db, userId, normalized.type);
    const existingId = readIdempotency(db, normalized.idempotencyKey, userId, 'cash_operation');
    if (existingId) {
      const result = operationResult(db, existingId, true);
      requireOperationPermission(db, userId, result.operation.type);
      const { operation } = result;
      if (operation.type !== normalized.type ||
          operation.amount !== normalized.amount ||
          operation.reason !== normalized.reason ||
          operation.category !== normalized.category ||
          operation.reference !== normalized.reference) {
        throw new AuthError(409, 'cash.idempotency_conflict');
      }
      return result;
    }

    const method = getCashMethod(db);
    const createdAt = nowIso();
    const { idempotencyKey, ...operationInput } = normalized;
    const operation = createOperationRecord(db, userId, operationInput, null, method.id, createdAt);
    writeIdempotency(
      db,
      idempotencyKey,
      userId,
      'cash_operation',
      'cash_operations',
      operation.id,
      createdAt,
    );
    writeAudit(db, {
      userId,
      action: 'cash.operation.create',
      entity: 'cash_operations',
      entityId: operation.id,
      after: operation,
    });
    return { operation, replayed: false };
  });
}

export function reverseCashOperation(db: Db, userId: string, operationId: string, input: unknown) {
  const normalized = normalizeReversalInput(input);
  if (typeof operationId !== 'string' || operationId.length < 1 || operationId.length > 64) {
    throw new AuthError(400, 'cash.operation_not_found');
  }
  return inTransaction(db, () => {
    const existingId = readIdempotency(db, normalized.idempotencyKey, userId, 'cash_operation_reversal');
    if (existingId) {
      const result = operationResult(db, existingId, true);
      requireOperationPermission(db, userId, result.operation.type);
      if (result.operation.reversesId !== operationId ||
          result.operation.reason !== normalized.reason) {
        throw new AuthError(409, 'cash.idempotency_conflict');
      }
      return result;
    }

    const original = db.prepare(
      `SELECT id, number, type, amount, method_id AS methodId, reason, category,
              reference, reverses_id AS reversesId, user_id AS userId, created_at AS createdAt
       FROM cash_operations WHERE id = ?`,
    ).get(operationId) as CashOperationRow | undefined;
    if (!original) throw new AuthError(404, 'cash.operation_not_found');
    if (original.reversesId) throw new AuthError(409, 'cash.reversal_of_reversal');
    const reversalType: CashOperationType = original.type === 'cash_in' ? 'cash_out' : 'cash_in';
    requireOperationPermission(db, userId, reversalType);
    const existingReversal = db.prepare(
      'SELECT 1 FROM cash_operations WHERE reverses_id = ?',
    ).get(original.id);
    if (existingReversal) throw new AuthError(409, 'cash.operation_already_reversed');

    const createdAt = nowIso();
    const operation = createOperationRecord(
      db,
      userId,
      {
        type: reversalType,
        amount: original.amount,
        reason: normalized.reason,
        category: original.category,
        reference: original.reference,
      },
      original.id,
      original.methodId,
      createdAt,
    );
    writeIdempotency(
      db,
      normalized.idempotencyKey,
      userId,
      'cash_operation_reversal',
      'cash_operations',
      operation.id,
      createdAt,
    );
    writeAudit(db, {
      userId,
      action: 'cash.operation.reverse',
      entity: 'cash_operations',
      entityId: operation.id,
      before: original,
      after: operation,
    });
    return { operation, replayed: false };
  });
}

export function getCashSummary(
  db: Db,
  filters: { from?: unknown; to?: unknown; limit?: unknown; offset?: unknown } = {},
  lang: 'ru' | 'uz' = 'ru',
) {
  const period = getCashPeriod(filters.from, filters.to);
  const limit = filters.limit === undefined ? 200 : Number(filters.limit);
  const offset = filters.offset === undefined ? 0 : Number(filters.offset);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new AuthError(400, 'validation.invalid_limit');
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000_000) {
    throw new AuthError(400, 'validation.invalid_offset');
  }

  const allCashAmounts = db.prepare('SELECT amount FROM cash_ledger').all() as Array<{ amount: number }>;
  const balance = safeSum(allCashAmounts.map((row) => row.amount));
  const cashPeriod = periodWhere(period, 'created_at');
  const periodAmounts = db.prepare(
    `SELECT amount FROM cash_ledger ${cashPeriod.sql}`,
  ).all(...cashPeriod.params) as Array<{ amount: number }>;
  const periodBalance = safeSum(periodAmounts.map((row) => row.amount));
  const paymentPeriod = periodWhere(period, 'p.created_at');
  const paymentConditions = [
    ...(paymentPeriod.sql ? [paymentPeriod.sql.slice('WHERE '.length)] : []),
    "pm.kind <> 'cash'",
  ];
  const methodName = lang === 'uz' ? 'COALESCE(pm.name_uz, pm.name_ru)' : 'pm.name_ru';
  const nonCash = db.prepare(
    `SELECT pm.id AS methodId, ${methodName} AS methodName,
            SUM(CASE WHEN p.direction = 'in' THEN p.amount ELSE 0 END) AS received,
            SUM(CASE WHEN p.direction = 'out' THEN p.amount ELSE 0 END) AS paid
     FROM payments p
     JOIN payment_methods pm ON pm.id = p.method_id
     WHERE ${paymentConditions.join(' AND ')}
     GROUP BY pm.id, ${methodName}
     ORDER BY pm.rowid`,
  ).all(...paymentPeriod.params) as Array<{
    methodId: string;
    methodName: string;
    received: number;
    paid: number;
  }>;
  for (const method of nonCash) {
    safeSum([method.received, method.paid]);
  }

  const entryWhere = periodWhere(period, 'cl.created_at');
  const entries = db.prepare(
    `SELECT cl.id, cl.created_at AS createdAt, cl.amount, cl.doc_type AS docType, cl.doc_id AS docId,
            cl.method_id AS methodId, ${methodName} AS methodName, cl.user_id AS userId,
            u.full_name AS userName, co.id AS operationId, co.number AS operationNumber,
            co.type AS operationType, co.reason, co.category, co.reference,
            co.reverses_id AS reversesId,
            c.name AS customerName,
            COALESCE(co.number, s.number, r.number, c.name) AS documentNumber,
            EXISTS (SELECT 1 FROM cash_operations reversal WHERE reversal.reverses_id = co.id) AS reversed
     FROM cash_ledger cl
     JOIN payment_methods pm ON pm.id = cl.method_id
     JOIN users u ON u.id = cl.user_id
     LEFT JOIN cash_operations co ON cl.doc_type = 'cash_operation' AND co.id = cl.doc_id
     LEFT JOIN sales s ON cl.doc_type = 'sale' AND s.id = cl.doc_id
     LEFT JOIN payments p ON cl.doc_type = 'debt_payment' AND p.id = cl.doc_id
     LEFT JOIN customers c ON c.id = p.customer_id
     LEFT JOIN returns r ON cl.doc_type = 'return' AND r.id = cl.doc_id
     ${entryWhere.sql}
     ORDER BY cl.created_at DESC, cl.id DESC LIMIT ? OFFSET ?`,
  ).all(...entryWhere.params, limit + 1, offset) as Array<Record<string, unknown>>;
  const methods = db.prepare(
    `SELECT id, ${lang === 'uz' ? 'COALESCE(name_uz, name_ru)' : 'name_ru'} AS name FROM payment_methods
     WHERE active = 1 AND kind = 'cash' ORDER BY rowid`,
  ).all() as Array<{ id: string; name: string }>;
  return {
    balance,
    periodBalance,
    from: period.from,
    to: period.to,
    nonCashPayments: nonCash.map((method) => ({
      ...method,
      net: safeSum([method.received, -method.paid]),
    })),
    cashMethods: methods,
    entries: entries.slice(0, limit),
    hasMore: entries.length > limit,
  };
}
