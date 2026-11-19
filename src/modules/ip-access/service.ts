import { isIP } from 'node:net';
import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { inTransaction } from '../../core/tx';
import { AuthError } from '../auth/errors';

export type IpRuleMode = 'any' | 'selected';
export type IpAccessStatus = 'allowed' | 'pending' | 'denied';

interface IpRuleRow {
  ip: string;
  mode: IpRuleMode;
  created_at: string;
  updated_at: string;
}

interface IpRequestRow {
  ip: string;
  status: 'pending' | 'denied';
  first_seen_at: string;
  last_seen_at: string;
}

function cleanupStaleRequests(db: Db, nowMs: number): void {
  const cutoff = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM ip_requests WHERE status = 'pending' AND first_seen_at < ?").run(cutoff);
}

export function normalizeIpAddress(value: unknown): string {
  if (typeof value !== 'string') throw new AuthError(400, 'ip.invalid_address');
  const address = value.trim();
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mappedIpv4 && isIP(mappedIpv4[1]!) === 4) return mappedIpv4[1]!;
  const family = isIP(address);
  if (family === 4) return address.split('.').map((part) => String(Number(part))).join('.');
  if (family === 6) return address.toLowerCase();
  throw new AuthError(400, 'ip.invalid_address');
}

export function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1';
}

export function assertIpAccountAllowed(db: Db, ip: string, userId: string): void {
  if (isLoopbackIp(ip)) return;
  const rule = db.prepare('SELECT mode FROM ip_rules WHERE ip = ?').get(ip) as
    | { mode: IpRuleMode }
    | undefined;
  if (!rule) throw new AuthError(403, 'ip.pending');
  if (rule.mode === 'any') return;
  const allowed = db.prepare('SELECT 1 FROM ip_rule_users WHERE ip = ? AND user_id = ?').get(ip, userId);
  if (!allowed) throw new AuthError(403, 'ip.account_not_allowed');
}

export function inspectIpAccess(db: Db, address: unknown, nowMs = Date.now()): {
  ip: string;
  status: IpAccessStatus;
} {
  const ip = normalizeIpAddress(address);
  if (isLoopbackIp(ip)) return { ip, status: 'allowed' };
  if (db.prepare('SELECT 1 FROM ip_rules WHERE ip = ?').get(ip)) return { ip, status: 'allowed' };

  const now = new Date(nowMs).toISOString();
  cleanupStaleRequests(db, nowMs);
  const request = db.prepare('SELECT status, last_seen_at FROM ip_requests WHERE ip = ?').get(ip) as
    | Pick<IpRequestRow, 'status' | 'last_seen_at'>
    | undefined;
  if (request?.status === 'denied') return { ip, status: 'denied' };

  if (request) {
    if (nowMs - Date.parse(request.last_seen_at) >= 60_000) {
      db.prepare('UPDATE ip_requests SET last_seen_at = ? WHERE ip = ? AND status = ?')
        .run(now, ip, 'pending');
    }
  } else {
    const count = (db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get() as { count: number }).count;
    if (count < 200) {
      db.prepare(
        `INSERT INTO ip_requests (ip, status, first_seen_at, last_seen_at)
         VALUES (?, 'pending', ?, ?)`,
      ).run(ip, now, now);
    }
  }
  return { ip, status: 'pending' };
}

function readRule(db: Db, ip: string): {
  ip: string;
  mode: IpRuleMode;
  userIds: string[];
  logins: string[];
} | null {
  const row = db.prepare('SELECT ip, mode FROM ip_rules WHERE ip = ?').get(ip) as
    | Pick<IpRuleRow, 'ip' | 'mode'>
    | undefined;
  if (!row) return null;
  const users = db.prepare(
    `SELECT u.id, u.login FROM ip_rule_users ru
     JOIN users u ON u.id = ru.user_id
     WHERE ru.ip = ? ORDER BY u.login COLLATE NOCASE, u.id`,
  ).all(ip) as Array<{ id: string; login: string }>;
  return { ip: row.ip, mode: row.mode, userIds: users.map((user) => user.id), logins: users.map((user) => user.login) };
}

export function listIpAccess(db: Db): {
  rules: Array<NonNullable<ReturnType<typeof readRule>>>;
  requests: IpRequestRow[];
  users: Array<{ id: string; login: string; fullName: string }>;
} {
  cleanupStaleRequests(db, Date.now());
  const ips = db.prepare('SELECT ip FROM ip_rules ORDER BY ip').all() as Array<{ ip: string }>;
  const requests = db.prepare(
    'SELECT ip, status, first_seen_at, last_seen_at FROM ip_requests ORDER BY status, first_seen_at, ip',
  ).all() as IpRequestRow[];
  const users = db.prepare(
    'SELECT id, login, full_name AS fullName FROM users WHERE active = 1 ORDER BY login COLLATE NOCASE, id',
  ).all() as Array<{ id: string; login: string; fullName: string }>;
  return { rules: ips.map(({ ip }) => readRule(db, ip)!).filter(Boolean), requests, users };
}

function validateRuleInput(db: Db, ipInput: unknown, modeInput: unknown, userIdsInput: unknown): {
  ip: string;
  mode: IpRuleMode;
  userIds: string[];
} {
  const ip = normalizeIpAddress(ipInput);
  if (isLoopbackIp(ip)) throw new AuthError(400, 'ip.loopback_forbidden');
  if (modeInput !== 'any' && modeInput !== 'selected') throw new AuthError(400, 'ip.invalid_mode');
  if (!Array.isArray(userIdsInput) || userIdsInput.length > 200 ||
      userIdsInput.some((id) => typeof id !== 'string' || id.length < 1 || id.length > 64) ||
      new Set(userIdsInput).size !== userIdsInput.length) {
    throw new AuthError(400, 'ip.invalid_accounts');
  }
  const userIds = userIdsInput as string[];
  if (modeInput === 'any' && userIds.length > 0) throw new AuthError(400, 'ip.invalid_accounts');
  if (modeInput === 'selected' && userIds.length === 0) throw new AuthError(400, 'ip.accounts_required');
  if (userIds.length > 0) {
    const existing = db.prepare(
      `SELECT id FROM users WHERE active = 1 AND id IN (${userIds.map(() => '?').join(', ')})`,
    ).all(...userIds) as Array<{ id: string }>;
    if (existing.length !== userIds.length) throw new AuthError(400, 'ip.invalid_accounts');
  }
  return { ip, mode: modeInput, userIds };
}

function saveRule(db: Db, actorId: string, input: {
  ip: string;
  mode: IpRuleMode;
  userIds: string[];
}, action: 'allow' | 'update' | 'add'): void {
  const before = readRule(db, input.ip);
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO ip_rules (ip, mode, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET mode = excluded.mode, updated_at = excluded.updated_at`,
  ).run(input.ip, input.mode, timestamp, timestamp);
  db.prepare('DELETE FROM ip_rule_users WHERE ip = ?').run(input.ip);
  const insertUser = db.prepare('INSERT INTO ip_rule_users (ip, user_id) VALUES (?, ?)');
  for (const userId of input.userIds) insertUser.run(input.ip, userId);
  db.prepare('DELETE FROM ip_requests WHERE ip = ?').run(input.ip);
  writeAudit(db, {
    userId: actorId,
    action: `ip.${action}`,
    entity: 'ip_rules',
    entityId: input.ip,
    before: before ?? undefined,
    after: readRule(db, input.ip),
  });
}

export function allowIpAddress(
  db: Db,
  actorId: string,
  ipInput: unknown,
  modeInput: unknown,
  userIdsInput: unknown,
): void {
  const input = validateRuleInput(db, ipInput, modeInput, userIdsInput);
  inTransaction(db, () => saveRule(db, actorId, input, 'allow'));
}

export function updateIpRule(
  db: Db,
  actorId: string,
  ipInput: unknown,
  modeInput: unknown,
  userIdsInput: unknown,
): void {
  const input = validateRuleInput(db, ipInput, modeInput, userIdsInput);
  inTransaction(db, () => {
    if (!readRule(db, input.ip)) throw new AuthError(404, 'ip.rule_not_found');
    saveRule(db, actorId, input, 'update');
  });
}

export function addIpRule(
  db: Db,
  actorId: string,
  ipInput: unknown,
  modeInput: unknown,
  userIdsInput: unknown,
): void {
  const input = validateRuleInput(db, ipInput, modeInput, userIdsInput);
  inTransaction(db, () => {
    if (readRule(db, input.ip)) throw new AuthError(409, 'ip.rule_exists');
    saveRule(db, actorId, input, 'add');
  });
}

export function revokeIpRule(db: Db, actorId: string, ipInput: unknown): void {
  const ip = normalizeIpAddress(ipInput);
  inTransaction(db, () => {
    const before = readRule(db, ip);
    if (!before) throw new AuthError(404, 'ip.rule_not_found');
    db.prepare('DELETE FROM ip_rules WHERE ip = ?').run(ip);
    const existingRequest = db.prepare('SELECT ip FROM ip_requests WHERE ip = ?').get(ip);
    if (existingRequest) {
      db.prepare("UPDATE ip_requests SET status = 'pending' WHERE ip = ?").run(ip);
    }
    writeAudit(db, {
      userId: actorId,
      action: 'ip.revoke',
      entity: 'ip_rules',
      entityId: ip,
      before,
      after: { ip, status: 'pending' },
    });
  });
}

export function denyIpAddress(db: Db, actorId: string, ipInput: unknown): void {
  const ip = normalizeIpAddress(ipInput);
  if (isLoopbackIp(ip)) throw new AuthError(400, 'ip.loopback_forbidden');
  inTransaction(db, () => {
    const before = readRule(db, ip);
    db.prepare('DELETE FROM ip_rules WHERE ip = ?').run(ip);
    const request = db.prepare('SELECT first_seen_at FROM ip_requests WHERE ip = ?').get(ip) as
      | { first_seen_at: string }
      | undefined;
    if (!request) {
      const count = (db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get() as { count: number }).count;
      if (count >= 200) throw new AuthError(409, 'ip.request_limit');
    }
    const now = new Date().toISOString();
    const firstSeenAt = request?.first_seen_at ?? now;
    db.prepare(
      `INSERT INTO ip_requests (ip, status, first_seen_at, last_seen_at) VALUES (?, 'denied', ?, ?)
       ON CONFLICT(ip) DO UPDATE SET status = 'denied', last_seen_at = excluded.last_seen_at`,
    ).run(ip, firstSeenAt, now);
    writeAudit(db, {
      userId: actorId,
      action: 'ip.deny',
      entity: 'ip_requests',
      entityId: ip,
      before: before ?? request ?? undefined,
      after: { ip, status: 'denied' },
    });
  });
}

export function removeIpEntry(db: Db, actorId: string, ipInput: unknown): void {
  const ip = normalizeIpAddress(ipInput);
  inTransaction(db, () => {
    const before = { rule: readRule(db, ip), request: db.prepare(
      'SELECT ip, status, first_seen_at, last_seen_at FROM ip_requests WHERE ip = ?',
    ).get(ip) as IpRequestRow | undefined };
    if (!before.rule && !before.request) throw new AuthError(404, 'ip.entry_not_found');
    db.prepare('DELETE FROM ip_rules WHERE ip = ?').run(ip);
    db.prepare('DELETE FROM ip_requests WHERE ip = ?').run(ip);
    writeAudit(db, {
      userId: actorId,
      action: 'ip.remove',
      entity: 'ip_rules',
      entityId: ip,
      before,
      after: null,
    });
  });
}
