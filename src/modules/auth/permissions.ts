import type { Db } from '../../db/connection';

export const PERMISSIONS = [
  'sell',
  'pay_cash',
  'pay_card',
  'pay_transfer',
  'hold_cart',
  'reserve_cart',
  'discount_check',
  'discount_manual',
  'sell_below_cost',
  'debt_sale',
  'debt_payment',
  'return',
  'write_off',
  'purchase',
  'stocktake',
  'price_edit',
  'view_cost',
  'reports',
  'view_customers',
  'search_receipts',
  'cash_in',
  'cash_out',
  'expense',
  'cash_collection',
  'users_manage',
  'ip_manage',
  'settings',
] as const;

export const PERMISSION_LIMITS = ['discount_check_limit_bp', 'discount_manual_limit_bp'] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type PermissionLimit = (typeof PERMISSION_LIMITS)[number];
export type PermissionKey = Permission | PermissionLimit;
export type PermissionValues = Record<PermissionKey, number>;

const SALE_PAYMENT_PERMISSIONS = {
  cash: 'pay_cash',
  card: 'pay_card',
  transfer: 'pay_transfer',
} as const satisfies Record<string, Permission>;

interface UserRoleRow {
  role: 'admin' | 'cashier';
}

interface PermissionRow {
  permission: string;
  value: number;
}

export function getPermissionValues(db: Db, userId: string): PermissionValues {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as UserRoleRow | undefined;
  if (!user) throw new Error(`Unknown user: ${userId}`);

  const values = Object.fromEntries(
    [...PERMISSIONS, ...PERMISSION_LIMITS].map((permission) => [permission, 0]),
  ) as PermissionValues;
  if (user.role === 'admin') {
    for (const permission of PERMISSIONS) values[permission] = 1;
    values.discount_check_limit_bp = 10_000;
    values.discount_manual_limit_bp = 10_000;
    return values;
  }

  const rows = db
    .prepare('SELECT permission, value FROM user_permissions WHERE user_id = ?')
    .all(userId) as PermissionRow[];
  for (const row of rows) {
    if (PERMISSIONS.includes(row.permission as Permission)) {
      values[row.permission as Permission] = row.value === 1 ? 1 : 0;
    } else if (PERMISSION_LIMITS.includes(row.permission as PermissionLimit)) {
      values[row.permission as PermissionLimit] = row.value;
    }
  }
  return values;
}

export function hasPermission(db: Db, userId: string, permission: Permission): boolean {
  return getPermissionValues(db, userId)[permission] === 1;
}

export function canUseSalePaymentMethod(db: Db, userId: string, kind: string): boolean {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as UserRoleRow | undefined;
  if (!user) throw new Error(`Unknown user: ${userId}`);
  if (user.role === 'admin') return true;
  const permission = SALE_PAYMENT_PERMISSIONS[kind as keyof typeof SALE_PAYMENT_PERMISSIONS];
  return permission !== undefined && hasPermission(db, userId, permission);
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSIONS as readonly string[]).includes(value) || (PERMISSION_LIMITS as readonly string[]).includes(value);
}

export function validatePermissionValue(permission: PermissionKey, value: unknown): number {
  if (!Number.isSafeInteger(value)) throw new TypeError('permission_value_must_be_integer');
  const number = value as number;
  if (PERMISSION_LIMITS.includes(permission as PermissionLimit)) {
    if (number < 0 || number > 10_000) throw new RangeError('permission_limit_out_of_range');
    return number;
  }
  if (number !== 0 && number !== 1) throw new RangeError('permission_value_must_be_boolean');
  return number;
}
