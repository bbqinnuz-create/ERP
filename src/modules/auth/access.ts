import type { Db } from '../../db/connection';
import { AuthError } from './errors';

export const PAGE_PERMISSIONS = [
  'sales',
  'heldCarts',
  'reservations',
  'print',
  'returns',
  'writeoffs',
  'stocktakes',
  'reports',
  'customers',
  'receiptSearch',
  'products',
  'stock',
  'warehouses',
  'purchases',
  'movements',
  'debts',
  'cash',
  'users',
  'connection',
] as const;

export type AppPage = (typeof PAGE_PERMISSIONS)[number];
export type PagePermissionValues = Record<AppPage, number>;

interface UserRoleRow {
  role: 'admin' | 'cashier';
}

interface PagePermissionRow {
  page: string;
  value: number;
}

interface WarehouseRow {
  id: string;
  name: string;
}

export function getPagePermissionValues(db: Db, userId: string): PagePermissionValues {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as UserRoleRow | undefined;
  if (!user) throw new Error(`Unknown user: ${userId}`);

  const values = Object.fromEntries(PAGE_PERMISSIONS.map((page) => [page, 1])) as PagePermissionValues;
  if (user.role === 'admin') return values;

  const rows = db.prepare('SELECT page, value FROM user_page_permissions WHERE user_id = ?')
    .all(userId) as PagePermissionRow[];
  for (const row of rows) {
    if ((PAGE_PERMISSIONS as readonly string[]).includes(row.page)) {
      values[row.page as AppPage] = row.value === 1 ? 1 : 0;
    }
  }
  return values;
}

export function isAppPage(value: string): value is AppPage {
  return (PAGE_PERMISSIONS as readonly string[]).includes(value);
}

export function requirePagePermission(db: Db, userId: string, page: AppPage): void {
  if (getPagePermissionValues(db, userId)[page] !== 1) {
    throw new AuthError(403, 'auth.page_permission_denied');
  }
}

function defaultWarehouseId(db: Db): string | null {
  const configured = db.prepare("SELECT value FROM settings WHERE key = 'default_warehouse_id'").get() as
    | { value: string }
    | undefined;
  if (!configured) return null;
  const warehouse = db.prepare(
    `SELECT w.id FROM warehouses w JOIN branches b ON b.id = w.branch_id
     WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
  ).get(configured.value) as { id: string } | undefined;
  return warehouse?.id ?? null;
}

export function listUserSalesWarehouses(db: Db, userId: string): WarehouseRow[] {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as UserRoleRow | undefined;
  if (!user) throw new Error(`Unknown user: ${userId}`);

  if (user.role === 'admin') {
    return db.prepare(
      `SELECT w.id, w.name FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.active = 1 AND b.active = 1 ORDER BY w.created_at, w.id`,
    ).all() as WarehouseRow[];
  }

  const assignments = db.prepare(
    'SELECT COUNT(*) AS count FROM user_sales_warehouses WHERE user_id = ?',
  ).get(userId) as { count: number };
  if (assignments.count === 0) {
    const fallbackId = defaultWarehouseId(db);
    if (fallbackId) return db.prepare('SELECT id, name FROM warehouses WHERE id = ?').all(fallbackId) as WarehouseRow[];
    const active = db.prepare(
      `SELECT w.id, w.name FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.active = 1 AND b.active = 1 ORDER BY w.created_at, w.id`,
    ).all() as WarehouseRow[];
    return active.length === 1 ? active : [];
  }

  return db.prepare(
    `SELECT w.id, w.name FROM user_sales_warehouses a
     JOIN warehouses w ON w.id = a.warehouse_id
     JOIN branches b ON b.id = w.branch_id
     WHERE a.user_id = ? AND w.active = 1 AND b.active = 1
     ORDER BY w.created_at, w.id`,
  ).all(userId) as WarehouseRow[];
}

export function resolveUserSalesWarehouse(db: Db, userId: string, requestedId?: string | null): {
  id: string;
  branch_id: string;
  name: string;
} {
  const warehouses = listUserSalesWarehouses(db, userId);
  if (requestedId) {
    const selected = warehouses.find((warehouse) => warehouse.id === requestedId);
    if (!selected) throw new AuthError(403, 'auth.warehouse_permission_denied');
    return db.prepare(
      `SELECT w.id, w.branch_id, w.name FROM warehouses w
       JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(selected.id) as { id: string; branch_id: string; name: string };
  }

  if (warehouses.length === 0) throw new AuthError(409, 'settings.default_warehouse_required');
  const fallbackId = defaultWarehouseId(db);
  const selected = warehouses.find((warehouse) => warehouse.id === fallbackId) ??
    (warehouses.length === 1 ? warehouses[0]! : null);
  if (!selected) throw new AuthError(409, 'settings.default_warehouse_required');
  return db.prepare(
    `SELECT w.id, w.branch_id, w.name FROM warehouses w
     JOIN branches b ON b.id = w.branch_id
     WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
  ).get(selected.id) as { id: string; branch_id: string; name: string };
}

export function validatePagePermissionValues(input: Record<string, unknown>): Array<[AppPage, number]> {
  const normalized: Array<[AppPage, number]> = [];
  for (const [page, value] of Object.entries(input)) {
    if (!isAppPage(page)) throw new AuthError(400, 'validation.unknown_page');
    if (value !== 0 && value !== 1) throw new AuthError(400, 'validation.invalid_permission_value');
    normalized.push([page, value]);
  }
  if (normalized.length === 0) throw new AuthError(400, 'validation.empty_update');
  return normalized;
}

export function validateSalesWarehouseIds(db: Db, values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 500 ||
      values.some((value) => typeof value !== 'string' || value.length < 1 || value.length > 64) ||
      new Set(values).size !== values.length) {
    throw new AuthError(400, 'validation.invalid_warehouses');
  }
  if (values.length > 0) {
    const existing = db.prepare(
      `SELECT w.id FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.active = 1 AND b.active = 1 AND w.id IN (${values.map(() => '?').join(', ')})`,
    ).all(...values) as Array<{ id: string }>;
    if (existing.length !== values.length) throw new AuthError(400, 'validation.invalid_warehouse');
  }
  return values as string[];
}
