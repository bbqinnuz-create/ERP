import type { Db } from '../../db/connection';
import { inTransaction } from '../../core/tx';
import { nowIso } from '../../core/time';
import { uuidv7 } from '../../core/uuid';
import { writeAudit } from '../../core/audit';
import { AuthError } from '../auth/service';

export const REFERENCE_TYPES = [
  'categories',
  'attributes',
  'products',
  'customers',
  'payment_methods',
  'warehouses',
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

const DEFAULT_PRODUCT_UNITS = ['шт', 'кг', 'тн', 'метр'] as const;
const PRODUCT_INPUT_FIELDS = new Set(['sku', 'name', 'unit', 'base_price']);

interface ReferenceSpec {
  table: string;
  fields: readonly string[];
  required: readonly string[];
  defaults: Record<string, unknown>;
}

const SPECS: Record<ReferenceType, ReferenceSpec> = {
  categories: {
    table: 'categories',
    fields: ['name_ru', 'name_uz', 'parent_id'],
    required: ['name_ru'],
    defaults: { name_uz: null, parent_id: null },
  },
  attributes: {
    table: 'attribute_defs',
    fields: ['category_id', 'key', 'name_ru', 'name_uz', 'type', 'unit', 'options'],
    required: ['category_id', 'key', 'name_ru', 'type'],
    defaults: { name_uz: null, unit: null, options: null },
  },
  products: {
    table: 'products',
    fields: ['sku', 'name_ru', 'name_uz', 'category_id', 'unit', 'attributes', 'base_price', 'min_stock', 'barcode'],
    required: ['sku', 'name_ru', 'unit', 'base_price'],
    defaults: {
      name_uz: null,
      category_id: null,
      attributes: '{}',
      min_stock: null,
      barcode: null,
    },
  },
  customers: {
    table: 'customers',
    fields: ['name', 'phone', 'note', 'discount_bp'],
    required: ['name'],
    defaults: { phone: null, note: null, discount_bp: 0 },
  },
  payment_methods: {
    table: 'payment_methods',
    fields: ['name_ru', 'name_uz', 'kind'],
    required: ['name_ru', 'kind'],
    defaults: { name_uz: null },
  },
  warehouses: {
    table: 'warehouses',
    fields: ['branch_id', 'name'],
    required: ['branch_id', 'name'],
    defaults: {},
  },
};

function validProductUnitsSetting(value: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed.length < DEFAULT_PRODUCT_UNITS.length || parsed.length > 100) return false;

  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== 'string' || item.trim() !== item || item.length === 0 || item.length > 32) return false;
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
  }
  return DEFAULT_PRODUCT_UNITS.every((unit) => seen.has(unit.toLowerCase()));
}

const SETTING_RULES: Record<string, (value: string) => boolean> = {
  allow_negative_stock: (value) => value === '0',
  allow_sell_below_cost: (value) => value === '0' || value === '1',
  price_rules_mode: (value) => value === 'lowest',
  rounding: (value) => value === 'sum' || value === 'tiyin',
  reserve_days: (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 3650,
  min_stock_alerts: (value) => value === '0' || value === '1',
  receipt_lang_default: (value) => value === 'ru' || value === 'uz',
  return_without_receipt: (value) => value === '0',
  timezone: (value) => value === 'Asia/Tashkent',
  product_units: validProductUnitsSetting,
};

function assertRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  return input as Record<string, unknown>;
}

function text(value: unknown, key: string, required: boolean, max = 200): string | null {
  if (value === null && !required) return null;
  if (typeof value !== 'string') throw new AuthError(400, `validation.invalid_${key}`);
  const trimmed = value.trim();
  if ((required && trimmed.length === 0) || trimmed.length > max) {
    throw new AuthError(400, `validation.invalid_${key}`);
  }
  return trimmed;
}

function nullableId(value: unknown, key: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 64) throw new AuthError(400, `validation.invalid_${key}`);
  return value;
}

function safeInteger(value: unknown, key: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new AuthError(400, `validation.invalid_${key}`);
  }
  return value as number;
}

function normalizeValue(type: ReferenceType, key: string, value: unknown, required: boolean): unknown {
  if (['name_ru', 'name_uz', 'sku', 'unit', 'name', 'key', 'phone', 'note'].includes(key)) {
    const max = key === 'note' ? 1000 : key === 'unit' ? 32 :
      key === 'name_ru' || key === 'name_uz' || key === 'name' ? 120 : 200;
    return text(value, key, required, max);
  }
  if (key === 'parent_id' || key === 'category_id' || key === 'branch_id') return nullableId(value, key);
  if (key === 'base_price' || key === 'discount_bp') return safeInteger(value, key, 0, key === 'discount_bp' ? 10_000 : Number.MAX_SAFE_INTEGER);
  if (key === 'min_stock') return value === null ? null : safeInteger(value, key, 0);
  if (key === 'barcode') return value === null || value === '' ? null : text(value, key, false, 128);
  if (key === 'type') {
    if (value !== 'number' && value !== 'text' && value !== 'list') throw new AuthError(400, 'validation.invalid_type');
    return value;
  }
  if (key === 'kind') {
    if (!['cash', 'card', 'transfer', 'online'].includes(String(value))) {
      throw new AuthError(400, 'validation.invalid_kind');
    }
    return value;
  }
  if (key === 'attributes') {
    const parsed = typeof value === 'string' ? parseJsonObject(value) : assertRecord(value);
    return JSON.stringify(parsed);
  }
  if (key === 'options') {
    if (value === null || value === '') return null;
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new AuthError(400, 'validation.invalid_options');
      }
    }
    if (!Array.isArray(parsed) || parsed.length > 200 || parsed.some((item) => typeof item !== 'string')) {
      throw new AuthError(400, 'validation.invalid_options');
    }
    return JSON.stringify(parsed);
  }
  throw new AuthError(400, 'validation.unknown_field');
}

function parseJsonObject(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AuthError(400, 'validation.invalid_attributes');
  }
  return assertRecord(parsed);
}

export function listProductUnits(db: Db): string[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'product_units'").get() as
    | { value: string }
    | undefined;
  if (!row) return [...DEFAULT_PRODUCT_UNITS];
  if (!validProductUnitsSetting(row.value)) throw new Error('Invalid product_units setting.');
  return JSON.parse(row.value) as string[];
}

function registerProductUnit(db: Db, actorId: string, unit: string): string {
  const units = listProductUnits(db);
  const existing = units.find((item) => item.toLowerCase() === unit.toLowerCase());
  if (existing) return existing;

  const updated = [...units, unit];
  const serialized = JSON.stringify(updated);
  if (!validProductUnitsSetting(serialized)) throw new AuthError(400, 'validation.invalid_unit');
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('product_units', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(serialized, nowIso());
  writeAudit(db, {
    userId: actorId,
    action: 'settings.product_units_updated',
    entity: 'settings',
    entityId: 'product_units',
    before: { product_units: units },
    after: { product_units: updated },
  });
  return unit;
}

function normalize(type: ReferenceType, input: unknown, existing?: Record<string, unknown>): Record<string, unknown> {
  const spec = SPECS[type];
  let source = assertRecord(input);
  if (type === 'products') {
    if (Object.keys(source).some((key) => !PRODUCT_INPUT_FIELDS.has(key))) {
      throw new AuthError(400, 'validation.unknown_field');
    }
    const productInput: Record<string, unknown> = {};
    for (const key of ['sku', 'unit', 'base_price']) {
      if (Object.prototype.hasOwnProperty.call(source, key)) productInput[key] = source[key];
    }
    if (Object.prototype.hasOwnProperty.call(source, 'name')) {
      productInput.name_ru = source.name;
      productInput.name_uz = null;
    }
    source = productInput;
  }
  const allowed = new Set(spec.fields);
  if (Object.keys(source).some((key) => !allowed.has(key))) throw new AuthError(400, 'validation.unknown_field');

  const result: Record<string, unknown> = {};
  for (const key of spec.fields) {
    const required = spec.required.includes(key);
    const current = existing && Object.prototype.hasOwnProperty.call(existing, key) ? existing[key] : spec.defaults[key];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = normalizeValue(type, key, source[key], required);
    } else if (current !== undefined) {
      result[key] = current;
    } else if (required) {
      throw new AuthError(400, `validation.required_${key}`);
    } else {
      result[key] = null;
    }
  }

  for (const key of spec.required) {
    if (result[key] === null || result[key] === undefined || result[key] === '') {
      throw new AuthError(400, `validation.required_${key}`);
    }
  }
  if (type === 'attributes' && result.type === 'list' && result.options === null) {
    throw new AuthError(400, 'validation.options_required');
  }
  return result;
}

function publicReference(type: ReferenceType, row: Record<string, unknown>): Record<string, unknown> {
  if (type !== 'products') return row;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name_ru,
    unit: row.unit,
    base_price: row.base_price,
    active: row.active,
  };
}

export function listReferences(db: Db, type: ReferenceType, includeInactive = false): Record<string, unknown>[] {
  const spec = SPECS[type];
  const rows = db
    .prepare(`SELECT * FROM ${spec.table}${includeInactive ? '' : ' WHERE active = 1'} ORDER BY rowid`)
    .all() as Record<string, unknown>[];
  return rows.map((row) => publicReference(type, row));
}

export function saveReference(
  db: Db,
  actorId: string,
  type: ReferenceType,
  input: unknown,
  id?: string,
): Record<string, unknown> {
  const spec = SPECS[type];
  return inTransaction(db, () => {
    const before = id
      ? (db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined)
      : undefined;
    if (id && !before) throw new AuthError(404, 'references.not_found');
    const values = normalize(type, input, before);
    const now = nowIso();
    if (type === 'products') values.unit = registerProductUnit(db, actorId, String(values.unit));
    if (before) {
      const assignments = spec.fields.map((field) => `${field} = ?`);
      const params = spec.fields.map((field) => values[field]);
      if (Object.prototype.hasOwnProperty.call(before, 'updated_at')) {
        assignments.push('updated_at = ?');
        params.push(now);
      }
      params.push(id);
      db.prepare(`UPDATE ${spec.table} SET ${assignments.join(', ')} WHERE id = ?`).run(...params);
    } else {
      const createdId = uuidv7();
      const fields = ['id', ...spec.fields];
      const params: unknown[] = [createdId, ...spec.fields.map((field) => values[field])];
      if (spec.table === 'warehouses') {
        fields.push('active', 'created_at', 'updated_at');
        params.push(1, now, now);
      } else if (spec.table === 'payment_methods') {
        fields.push('active', 'created_at');
        params.push(1, now);
      } else if (spec.table === 'attribute_defs') {
        fields.push('active', 'created_at');
        params.push(1, now);
      } else {
        fields.push('active', 'created_at', 'updated_at');
        params.push(1, now, now);
      }
      db.prepare(`INSERT INTO ${spec.table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`).run(...params);
      id = createdId;
    }
    const after = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id) as Record<string, unknown>;
    writeAudit(db, {
      userId: actorId,
      action: before ? `${type}.update` : `${type}.create`,
      entity: type,
      entityId: id,
      before: before ?? null,
      after,
    });
    return publicReference(type, after);
  });
}

export function setReferenceActive(db: Db, actorId: string, type: ReferenceType, id: string, active: boolean): void {
  const spec = SPECS[type];
  inTransaction(db, () => {
    const before = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!before) throw new AuthError(404, 'references.not_found');
    const now = nowIso();
    if (Object.prototype.hasOwnProperty.call(before, 'updated_at')) {
      db.prepare(`UPDATE ${spec.table} SET active = ?, updated_at = ? WHERE id = ?`).run(active ? 1 : 0, now, id);
    } else {
      db.prepare(`UPDATE ${spec.table} SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
    }
    const after = db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id) as Record<string, unknown>;
    writeAudit(db, {
      userId: actorId,
      action: `${type}.${active ? 'activate' : 'deactivate'}`,
      entity: type,
      entityId: id,
      before,
      after,
    });
  });
}

export function getSettings(db: Db): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function updateSettings(db: Db, actorId: string, input: unknown): Record<string, string> {
  const values = assertRecord(input);
  const normalized: [string, string][] = [];
  for (const [key, value] of Object.entries(values)) {
    const validate = SETTING_RULES[key];
    if (!validate || (typeof value !== 'string' && typeof value !== 'number')) {
      throw new AuthError(400, 'settings.invalid_key_or_value');
    }
    const stringValue = String(value);
    if (!validate(stringValue)) throw new AuthError(400, 'settings.invalid_key_or_value');
    normalized.push([key, stringValue]);
  }
  if (normalized.length === 0) throw new AuthError(400, 'validation.empty_update');

  return inTransaction(db, () => {
    const before = getSettings(db);
    const upsert = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    const now = nowIso();
    for (const [key, value] of normalized) upsert.run(key, value, now);
    const after = getSettings(db);
    writeAudit(db, {
      userId: actorId,
      action: 'settings.update',
      entity: 'settings',
      before,
      after,
    });
    return after;
  });
}
