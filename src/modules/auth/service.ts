import { randomBytes, createHash } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';
import type { Db } from '../../db/connection';
import { inTransaction } from '../../core/tx';
import { nowIso } from '../../core/time';
import { uuidv7 } from '../../core/uuid';
import { writeAudit } from '../../core/audit';
import {
  getPermissionValues,
  hasPermission,
  isPermissionKey,
  validatePermissionValue,
  type Permission,
  type PermissionValues,
} from './permissions';

const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

const PASSWORD_MIN_LENGTH = 5;
const PASSWORD_MAX_LENGTH = 128;
const LOGIN_RE = /^[a-zA-Z0-9._-]{3,64}$/;

export type UserRole = 'admin' | 'cashier';
export type UserLanguage = 'ru' | 'uz';

export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  role: UserRole;
  lang: UserLanguage;
  active: boolean;
  permissions: PermissionValues;
}

export interface SessionInfo {
  id: string;
  user: AuthUser;
}

export class AuthError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413,
    readonly errorKey: string,
  ) {
    super(errorKey);
    this.name = 'AuthError';
  }
}

interface UserRow {
  id: string;
  login: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  lang: UserLanguage;
  active: number;
}

type PublicUserRow = Omit<UserRow, 'password_hash'>;

interface SessionRow extends UserRow {
  session_id: string;
  absolute_expires_at: string;
  last_activity_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

interface SettingRow {
  value: string;
}

export interface CreateUserInput {
  login: string;
  password: string;
  fullName: string;
  role: UserRole;
  lang: UserLanguage;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  lang?: UserLanguage;
  active?: boolean;
  password?: string;
}

function validateUpdateUserInput(input: UpdateUserInput): UpdateUserInput {
  const allowed = new Set(['fullName', 'role', 'lang', 'active', 'password']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  if (input.fullName !== undefined && (typeof input.fullName !== 'string' || !input.fullName.trim() || input.fullName.trim().length > 120)) {
    throw new AuthError(400, 'validation.invalid_full_name');
  }
  if (input.role !== undefined && input.role !== 'admin' && input.role !== 'cashier') {
    throw new AuthError(400, 'validation.invalid_role');
  }
  if (input.lang !== undefined && input.lang !== 'ru' && input.lang !== 'uz') {
    throw new AuthError(400, 'validation.invalid_language');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') throw new AuthError(400, 'validation.invalid_active');
  if (input.password !== undefined) validatePassword(input.password);
  if (Object.keys(input).length === 0) throw new AuthError(400, 'validation.empty_update');
  return input;
}

export function validateLogin(login: unknown): string {
  if (typeof login !== 'string') throw new AuthError(400, 'validation.invalid_login');
  const normalized = login.trim().toLowerCase();
  if (!LOGIN_RE.test(normalized)) throw new AuthError(400, 'validation.invalid_login');
  return normalized;
}

export function validatePassword(password: unknown): asserts password is string {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH ||
    password.trim().length === 0
  ) {
    throw new AuthError(400, 'validation.invalid_password');
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  if (!passwordHash.startsWith('$argon2id$')) return false;
  return verify(passwordHash, password);
}

function toAuthUser(db: Db, row: PublicUserRow): AuthUser {
  return {
    id: row.id,
    login: row.login,
    fullName: row.full_name,
    role: row.role,
    lang: row.lang,
    active: row.active === 1,
    permissions: getPermissionValues(db, row.id),
  };
}

function readSettingInteger(db: Db, key: string): number {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingRow | undefined;
  if (!row || !/^\d+$/.test(row.value)) throw new Error(`Invalid or missing setting: ${key}`);
  const value = Number(row.value);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid or missing setting: ${key}`);
  return value;
}

function sha256(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function auditFailedLogin(db: Db, userId: string | null, login: string, at: string): void {
  writeAudit(db, {
    action: 'auth.login_failed',
    entity: 'users',
    entityId: userId,
    after: { login, at },
  });
}

export async function login(
  db: Db,
  loginInput: unknown,
  password: unknown,
  nowMs: number = Date.now(),
): Promise<{ token: string; user: AuthUser }> {
  let normalizedLogin: string;
  try {
    normalizedLogin = validateLogin(loginInput);
  } catch (error) {
    inTransaction(db, () =>
      auditFailedLogin(
        db,
        null,
        typeof loginInput === 'string' ? loginInput.trim().slice(0, 64) : '',
        new Date(nowMs).toISOString(),
      ),
    );
    throw error;
  }
  if (typeof password !== 'string' || password.length > PASSWORD_MAX_LENGTH) {
    inTransaction(db, () => auditFailedLogin(db, null, normalizedLogin, new Date(nowMs).toISOString()));
    throw new AuthError(401, 'auth.invalid_credentials');
  }

  const row = db
    .prepare(
      `SELECT id, login, password_hash, full_name, role, lang, active
       FROM users WHERE login = ? COLLATE NOCASE`,
    )
    .get(normalizedLogin) as UserRow | undefined;
  if (!row || row.active !== 1) {
    inTransaction(db, () => auditFailedLogin(db, row?.id ?? null, normalizedLogin, new Date(nowMs).toISOString()));
    throw new AuthError(401, 'auth.invalid_credentials');
  }

  const validPassword = await verifyPassword(row.password_hash, password);
  if (!validPassword) {
    inTransaction(db, () => auditFailedLogin(db, row.id, normalizedLogin, new Date(nowMs).toISOString()));
    throw new AuthError(401, 'auth.invalid_credentials');
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const now = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + readSettingInteger(db, 'session_absolute_hours') * 60 * 60 * 1000).toISOString();

  const user = inTransaction(db, () => {
    db.prepare(
      `UPDATE sessions SET revoked_at = ?, revoke_reason = 'login_elsewhere'
       WHERE user_id = ? AND revoked_at IS NULL`,
    ).run(now, row.id);
    db.prepare(
      `INSERT INTO sessions
         (id, user_id, token_hash, created_at, absolute_expires_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(uuidv7(), row.id, tokenHash, now, expiresAt, now);
    writeAudit(db, {
      userId: row.id,
      action: 'auth.login_succeeded',
      entity: 'users',
      entityId: row.id,
      after: { at: now },
    });
    return toAuthUser(db, row);
  });

  return { token, user };
}

export function requireSession(
  db: Db,
  token: string | null | undefined,
  nowMs: number = Date.now(),
  touchActivity = true,
): SessionInfo {
  if (!token || token.length > 256) throw new AuthError(401, 'auth.required');
  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.absolute_expires_at, s.last_activity_at, s.revoked_at, s.revoke_reason,
              u.id, u.login, u.password_hash, u.full_name, u.role, u.lang, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as SessionRow | undefined;
  if (!row) throw new AuthError(401, 'auth.required');
  if (row.revoked_at) {
    throw new AuthError(401, row.revoke_reason === 'login_elsewhere' ? 'auth.session_replaced' : 'auth.session_expired');
  }
  if (row.active !== 1) {
    db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'admin' WHERE id = ? AND revoked_at IS NULL")
      .run(new Date(nowMs).toISOString(), row.session_id);
    throw new AuthError(401, 'auth.session_expired');
  }

  const absoluteExpiresAt = Date.parse(row.absolute_expires_at);
  const lastActivityAt = Date.parse(row.last_activity_at);
  if (!Number.isFinite(absoluteExpiresAt) || !Number.isFinite(lastActivityAt)) {
    throw new Error(`Invalid timestamps in session ${row.session_id}`);
  }
  const idleTimeoutMs = readSettingInteger(db, 'session_idle_minutes') * 60 * 1000;
  if (nowMs >= absoluteExpiresAt || nowMs >= lastActivityAt + idleTimeoutMs) {
    db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'expired' WHERE id = ? AND revoked_at IS NULL")
      .run(new Date(nowMs).toISOString(), row.session_id);
    throw new AuthError(401, 'auth.session_expired');
  }

  if (touchActivity) {
    db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?')
      .run(new Date(nowMs).toISOString(), row.session_id);
  }
  return { id: row.session_id, user: toAuthUser(db, row) };
}

export function withAuthorizedUser<T>(
  db: Db,
  token: string | null | undefined,
  permission: Permission | null,
  action: (session: SessionInfo) => T,
  nowMs: number = Date.now(),
  touchActivity = true,
): T {
  const outcome = inTransaction(db, () => {
    let session: SessionInfo;
    try {
      session = requireSession(db, token, nowMs, touchActivity);
    } catch (error) {
      if (error instanceof AuthError) return { error };
      throw error;
    }
    if (permission && !hasPermission(db, session.user.id, permission)) {
      return { error: new AuthError(403, 'auth.permission_denied') };
    }
    return { value: action(session) };
  });
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}

export function logout(db: Db, token: string | null | undefined, nowMs: number = Date.now()): void {
  if (!token || token.length > 256) return;
  inTransaction(db, () => {
    db.prepare(
      `UPDATE sessions SET revoked_at = ?, revoke_reason = 'logout'
       WHERE token_hash = ? AND revoked_at IS NULL`,
    ).run(new Date(nowMs).toISOString(), sha256(token));
  });
}

function validateUserInput(input: CreateUserInput): CreateUserInput {
  const login = validateLogin(input.login);
  validatePassword(input.password);
  if (typeof input.fullName !== 'string' || input.fullName.trim().length < 1 || input.fullName.trim().length > 120) {
    throw new AuthError(400, 'validation.invalid_full_name');
  }
  if (input.role !== 'admin' && input.role !== 'cashier') throw new AuthError(400, 'validation.invalid_role');
  if (input.lang !== 'ru' && input.lang !== 'uz') throw new AuthError(400, 'validation.invalid_language');
  return { ...input, login, fullName: input.fullName.trim() };
}

function assertLoginAvailable(db: Db, login: string): void {
  const existing = db.prepare('SELECT 1 FROM users WHERE login = ? COLLATE NOCASE').get(login);
  if (existing) throw new AuthError(409, 'users.login_taken');
}

export async function createUser(db: Db, actorId: string, input: CreateUserInput): Promise<AuthUser> {
  const valid = validateUserInput(input);
  const passwordHash = await hashPassword(valid.password);
  const create = (): AuthUser => inTransaction(db, () => {
    if (!hasPermission(db, actorId, 'users_manage')) throw new AuthError(403, 'auth.permission_denied');
    assertLoginAvailable(db, valid.login);
    const id = uuidv7();
    const now = nowIso();
    db.prepare(
      `INSERT INTO users (id, login, password_hash, full_name, role, lang, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, valid.login, passwordHash, valid.fullName, valid.role, valid.lang, now, now);
    writeAudit(db, {
      userId: actorId,
      action: 'user.create',
      entity: 'users',
      entityId: id,
      after: { login: valid.login, fullName: valid.fullName, role: valid.role, lang: valid.lang, active: true },
    });
    const row = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(id) as PublicUserRow;
    return toAuthUser(db, row);
  });
  return create();
}

function ensureAdminRemains(db: Db, userId: string, nextRole: UserRole, nextActive: boolean): void {
  const current = db.prepare('SELECT role, active FROM users WHERE id = ?').get(userId) as
    | { role: UserRole; active: number }
    | undefined;
  if (!current) throw new AuthError(404, 'users.not_found');
  if (current.role !== 'admin' || current.active !== 1 || (nextRole === 'admin' && nextActive)) return;
  const otherAdmins = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1 AND id <> ?")
    .get(userId) as { count: number };
  if (otherAdmins.count === 0) throw new AuthError(409, 'users.last_admin');
}

export async function updateUser(
  db: Db,
  actorId: string,
  userId: string,
  input: UpdateUserInput,
): Promise<AuthUser> {
  const valid = validateUpdateUserInput(input);
  const passwordHash = valid.password === undefined ? undefined : await hashPassword(valid.password);
  return updateUserWithHash(db, actorId, userId, valid, passwordHash, Date.now());
}

export async function resetAdminPassword(db: Db, loginInput: unknown, passwordInput: unknown): Promise<AuthUser> {
  const login = validateLogin(loginInput);
  const password = passwordInput;
  validatePassword(password);
  const admin = db
    .prepare("SELECT id FROM users WHERE login = ? COLLATE NOCASE AND role = 'admin' AND active = 1")
    .get(login) as { id: string } | undefined;
  if (!admin) throw new Error(`Активный администратор «${login}» не найден.`);
  return updateUser(db, admin.id, admin.id, { password });
}

export async function createUserForSession(
  db: Db,
  token: string,
  input: CreateUserInput,
  nowMs?: number,
): Promise<AuthUser> {
  const valid = validateUserInput(input);
  const passwordHash = await hashPassword(valid.password);
  const operationTime = nowMs ?? Date.now();
  return withAuthorizedUser(db, token, 'users_manage', (session) => {
    assertLoginAvailable(db, valid.login);
    const id = uuidv7();
    const now = new Date(operationTime).toISOString();
    db.prepare(
      `INSERT INTO users (id, login, password_hash, full_name, role, lang, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, valid.login, passwordHash, valid.fullName, valid.role, valid.lang, now, now);
    writeAudit(db, {
      userId: session.user.id,
      action: 'user.create',
      entity: 'users',
      entityId: id,
      after: { login: valid.login, fullName: valid.fullName, role: valid.role, lang: valid.lang, active: true },
    });
    const row = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(id) as PublicUserRow;
    return toAuthUser(db, row);
  }, operationTime);
}

export async function updateUserForSession(
  db: Db,
  token: string,
  userId: string,
  input: UpdateUserInput,
  nowMs?: number,
): Promise<AuthUser> {
  const valid = validateUpdateUserInput(input);
  const passwordHash = valid.password === undefined ? undefined : await hashPassword(valid.password);
  const operationTime = nowMs ?? Date.now();
  return withAuthorizedUser(db, token, 'users_manage', (session) =>
    updateUserWithHash(db, session.user.id, userId, valid, passwordHash, operationTime),
  operationTime);
}

function updateUserWithHash(
  db: Db,
  actorId: string,
  userId: string,
  input: UpdateUserInput,
  passwordHash: string | undefined,
  nowMs: number,
): AuthUser {
  return inTransaction(db, () => {
    if (!hasPermission(db, actorId, 'users_manage')) throw new AuthError(403, 'auth.permission_denied');
    const before = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(userId) as
      | { id: string; login: string; full_name: string; role: UserRole; lang: UserLanguage; active: number }
      | undefined;
    if (!before) throw new AuthError(404, 'users.not_found');
    const role = input.role ?? before.role;
    const active = input.active ?? (before.active === 1);
    ensureAdminRemains(db, userId, role, active);

    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.fullName !== undefined) {
      fields.push('full_name = ?');
      values.push(input.fullName.trim());
    }
    if (input.role !== undefined) {
      fields.push('role = ?');
      values.push(input.role);
    }
    if (input.lang !== undefined) {
      fields.push('lang = ?');
      values.push(input.lang);
    }
    if (input.active !== undefined) {
      fields.push('active = ?');
      values.push(input.active ? 1 : 0);
    }
    if (passwordHash !== undefined) {
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }
    if (fields.length === 0) throw new AuthError(400, 'validation.empty_update');
    fields.push('updated_at = ?');
    values.push(new Date(nowMs).toISOString());
    values.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const after = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(userId) as
      | { id: string; login: string; full_name: string; role: UserRole; lang: UserLanguage; active: number }
      | undefined;
    if (!after) throw new Error(`Updated user disappeared: ${userId}`);
    writeAudit(db, {
      userId: actorId,
      action: passwordHash === undefined ? 'user.update' : 'user.password_changed',
      entity: 'users',
      entityId: userId,
      before,
      after,
    });
    if (input.active === false || passwordHash !== undefined) {
      db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'admin' WHERE user_id = ? AND revoked_at IS NULL")
        .run(new Date(nowMs).toISOString(), userId);
    }
    const row = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(userId) as PublicUserRow;
    return toAuthUser(db, row);
  });
}

export function listUsers(db: Db): AuthUser[] {
  const rows = db
    .prepare('SELECT id, login, full_name, role, lang, active FROM users ORDER BY login COLLATE NOCASE')
    .all() as PublicUserRow[];
  return rows.map((row) => toAuthUser(db, row));
}

export async function bootstrapAdmin(db: Db, input: CreateUserInput): Promise<AuthUser> {
  const valid = validateUserInput({ ...input, role: 'admin' });
  const passwordHash = await hashPassword(valid.password);
  return inTransaction(db, () => {
    const count = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
    if (count !== 0) throw new AuthError(409, 'users.bootstrap_already_used');
    const id = uuidv7();
    const now = nowIso();
    db.prepare(
      `INSERT INTO users (id, login, password_hash, full_name, role, lang, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', ?, 1, ?, ?)`,
    ).run(id, valid.login, passwordHash, valid.fullName, valid.lang, now, now);
    writeAudit(db, {
      action: 'user.bootstrap_admin',
      entity: 'users',
      entityId: id,
      after: { login: valid.login, fullName: valid.fullName, role: 'admin', lang: valid.lang },
    });
    const row = db.prepare('SELECT id, login, full_name, role, lang, active FROM users WHERE id = ?').get(id) as PublicUserRow;
    return toAuthUser(db, row);
  });
}

export async function ensureConfiguredAdmin(
  db: Db,
  input: { login: unknown; password: unknown },
): Promise<boolean> {
  if (db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get()) return false;

  const login = validateLogin(input.login);
  const password = input.password;
  validatePassword(password);
  const passwordHash = await hashPassword(password);

  return inTransaction(db, () => {
    if (db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get()) return false;
    if (db.prepare('SELECT 1 FROM users WHERE login = ? COLLATE NOCASE').get(login)) {
      throw new Error(`Configured administrator login "${login}" already exists. Change ADMIN or activate that user.`);
    }

    const id = uuidv7();
    const now = nowIso();
    db.prepare(
      `INSERT INTO users (id, login, password_hash, full_name, role, lang, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 'ru', 1, ?, ?)`,
    ).run(id, login, passwordHash, login, now, now);
    writeAudit(db, {
      action: 'user.bootstrap_admin',
      entity: 'users',
      entityId: id,
      after: { login, fullName: login, role: 'admin', lang: 'ru' },
    });
    return true;
  });
}

export function setUserPermissions(
  db: Db,
  actorId: string,
  userId: string,
  values: Record<string, unknown>,
): PermissionValues {
  return inTransaction(db, () => {
    if (!hasPermission(db, actorId, 'users_manage')) throw new AuthError(403, 'auth.permission_denied');
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: UserRole } | undefined;
    if (!user) throw new AuthError(404, 'users.not_found');
    if (user.role === 'admin') throw new AuthError(400, 'users.admin_permissions_implicit');
    if (Object.keys(values).length === 0) throw new AuthError(400, 'validation.empty_update');
    const normalized: [string, number][] = [];
    for (const [permission, value] of Object.entries(values)) {
      if (!isPermissionKey(permission)) throw new AuthError(400, 'validation.unknown_permission');
      try {
        normalized.push([permission, validatePermissionValue(permission, value)]);
      } catch (error) {
        if (error instanceof RangeError && error.message === 'permission_limit_out_of_range') {
          throw new AuthError(400, 'validation.permission_limit_out_of_range');
        }
        if (error instanceof TypeError || error instanceof RangeError) {
          throw new AuthError(400, 'validation.invalid_permission_value');
        }
        throw error;
      }
    }
    const before = getPermissionValues(db, userId);
    const upsert = db.prepare(
      `INSERT INTO user_permissions (user_id, permission, value) VALUES (?, ?, ?)
       ON CONFLICT(user_id, permission) DO UPDATE SET value = excluded.value`,
    );
    for (const [permission, value] of normalized) upsert.run(userId, permission, value);
    const after = getPermissionValues(db, userId);
    writeAudit(db, {
      userId: actorId,
      action: 'user.permissions_changed',
      entity: 'users',
      entityId: userId,
      before,
      after,
    });
    return after;
  });
}
