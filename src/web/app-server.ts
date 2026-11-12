import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TLSSocket } from 'node:tls';
import { fileURLToPath } from 'node:url';
import type { Db } from '../db/connection';
import { AuthError, createUserForSession, listUsers, login, logout, setUserPermissions, updateUserForSession, withAuthorizedUser } from '../modules/auth/service';
import { hasPermission, type Permission } from '../modules/auth/permissions';
import {
  getSettings,
  listProductUnits,
  listReferences,
  REFERENCE_TYPES,
  saveReference,
  setReferenceActive,
  updateSettings,
  type ReferenceType,
} from '../modules/references/service';

const SESSION_COOKIE = 'kassa_session';
const MAX_BODY_BYTES = 64 * 1024;
const STATIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

interface ServerOptions {
  now?: () => number;
}

function isLocalAddress(address: string | undefined): boolean {
  if (!address) return false;
  const ip = address.startsWith('::ffff:') ? address.slice(7) : address;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = octets as [number, number, number, number];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 169 && b === 254);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === SESSION_COOKIE) result[key] = value;
  }
  return result;
}

function sessionToken(req: IncomingMessage): string | null {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] ?? null;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > MAX_BODY_BYTES) throw new AuthError(400, 'http.body_too_large');
    chunks.push(buffer);
  }
  if (length === 0) return {};
  const contentType = req.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') throw new AuthError(400, 'http.json_required');
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AuthError(400, 'http.invalid_json');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AuthError(400, 'http.invalid_json');
  }
  return parsed as Record<string, unknown>;
}

function setSessionCookie(res: ServerResponse, token: string): void {
  const secure = res.req.socket instanceof TLSSocket ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`);
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function isReferenceType(value: string): value is ReferenceType {
  return (REFERENCE_TYPES as readonly string[]).includes(value);
}

function requireAdditionalPermission(db: Db, userId: string, permission: Permission): void {
  if (!hasPermission(db, userId, permission)) throw new AuthError(403, 'auth.permission_denied');
}

function respondError(res: ServerResponse, error: unknown): void {
  if (error instanceof AuthError) {
    sendJson(res, error.status, { errorKey: error.errorKey });
    return;
  }
  const message = error instanceof Error ? error.message : '';
  if (/UNIQUE constraint failed/i.test(message)) {
    sendJson(res, 409, { errorKey: 'database.unique_conflict' });
    return;
  }
  if (/FOREIGN KEY constraint failed/i.test(message)) {
    sendJson(res, 400, { errorKey: 'database.invalid_reference' });
    return;
  }
  if (/CHECK constraint failed/i.test(message)) {
    sendJson(res, 400, { errorKey: 'database.invalid_value' });
    return;
  }
  console.error('Unhandled HTTP request error:', error);
  sendJson(res, 500, { errorKey: 'server.internal_error' });
}

function listStock(db: Db): Record<string, unknown>[] {
  return db
    .prepare(
      `SELECT p.id AS product_id, p.sku, p.name_ru AS name, p.unit,
              w.id AS warehouse_id, w.name AS warehouse_name, c.qty, c.reserved
       FROM stock_cache c
       JOIN products p ON p.id = c.product_id
       JOIN warehouses w ON w.id = c.warehouse_id
       WHERE p.active = 1 AND w.active = 1
       ORDER BY p.name_ru, w.name`,
    )
    .all() as Record<string, unknown>[];
}

async function handleApi(db: Db, req: IncomingMessage, res: ServerResponse, now: () => number): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';
  const token = sessionToken(req);

  if (path === '/api/health' && method === 'GET') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readJson(req);
    const result = await login(db, body.login, body.password, now());
    setSessionCookie(res, result.token);
    sendJson(res, 200, { user: result.user });
    return;
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    logout(db, token, now());
    clearSessionCookie(res);
    res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
    return;
  }
  if (path === '/api/auth/me' && method === 'GET') {
    const user = withAuthorizedUser(db, token, null, (session) => session.user, now());
    sendJson(res, 200, { user });
    return;
  }
  if (path === '/api/auth/status' && method === 'GET') {
    withAuthorizedUser(db, token, null, () => true, now(), false);
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (path === '/api/users' && method === 'GET') {
    const users = withAuthorizedUser(db, token, 'users_manage', () => listUsers(db), now());
    sendJson(res, 200, { users });
    return;
  }
  if (path === '/api/users' && method === 'POST') {
    const body = await readJson(req);
    const user = await createUserForSession(
      db,
      token ?? '',
      {
        login: body.login as string,
        password: body.password as string,
        fullName: body.fullName as string,
        role: body.role as 'admin' | 'cashier',
        lang: body.lang as 'ru' | 'uz',
      },
    );
    sendJson(res, 201, { user });
    return;
  }
  const userMatch = /^\/api\/users\/([^/]+)(?:\/permissions)?$/.exec(path);
  if (userMatch && method === 'PATCH') {
    const userId = decodeURIComponent(userMatch[1]!);
    const body = await readJson(req);
    if (path.endsWith('/permissions')) {
      const permissions = withAuthorizedUser(db, token, 'users_manage', (session) => {
        if (!body.permissions || typeof body.permissions !== 'object' || Array.isArray(body.permissions)) {
          throw new AuthError(400, 'validation.invalid_permissions');
        }
        return setUserPermissions(db, session.user.id, userId, body.permissions as Record<string, unknown>);
      }, now());
      sendJson(res, 200, { permissions });
      return;
    }
    const user = await updateUserForSession(db, token ?? '', userId, {
      fullName: body.fullName as string | undefined,
      role: body.role as 'admin' | 'cashier' | undefined,
      lang: body.lang as 'ru' | 'uz' | undefined,
      active: body.active as boolean | undefined,
      password: body.password as string | undefined,
    });
    sendJson(res, 200, { user });
    return;
  }

  if (path === '/api/stock' && method === 'GET') {
    const rows = withAuthorizedUser(db, token, null, () => listStock(db), now());
    sendJson(res, 200, { rows });
    return;
  }

  if (path === '/api/product-units' && method === 'GET') {
    const units = withAuthorizedUser(db, token, null, () => listProductUnits(db), now());
    sendJson(res, 200, { units });
    return;
  }

  const refMatch = /^\/api\/references\/([^/]+)(?:\/([^/]+)(?:\/active)?)?$/.exec(path);
  if (refMatch) {
    const type = refMatch[1]!;
    if (!isReferenceType(type)) throw new AuthError(404, 'http.not_found');
    const id = refMatch[2] ? decodeURIComponent(refMatch[2]) : undefined;
    const activeRoute = path.endsWith('/active');
    if (method === 'GET' && !id) {
      const includeInactive = url.searchParams.get('includeInactive') === 'true';
      const rows = withAuthorizedUser(db, token, includeInactive ? 'settings' : null,
        () => listReferences(db, type, includeInactive), now());
      sendJson(res, 200, { rows });
      return;
    }
    if (method === 'POST' && !id) {
      const body = await readJson(req);
      const row = withAuthorizedUser(db, token, 'settings', (session) => {
        if (type === 'products' && Object.prototype.hasOwnProperty.call(body, 'base_price')) {
          requireAdditionalPermission(db, session.user.id, 'price_edit');
        }
        return saveReference(db, session.user.id, type, body);
      }, now());
      sendJson(res, 201, { row });
      return;
    }
    if (method === 'PATCH' && id && activeRoute) {
      const body = await readJson(req);
      if (typeof body.active !== 'boolean') throw new AuthError(400, 'validation.invalid_active');
      withAuthorizedUser(db, token, 'settings', (session) => {
        setReferenceActive(db, session.user.id, type, id, body.active as boolean);
      }, now());
      res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    if (method === 'PATCH' && id && !activeRoute) {
      const body = await readJson(req);
      const row = withAuthorizedUser(db, token, 'settings', (session) => {
        if (type === 'products' && Object.prototype.hasOwnProperty.call(body, 'base_price')) {
          requireAdditionalPermission(db, session.user.id, 'price_edit');
        }
        return saveReference(db, session.user.id, type, body, id);
      }, now());
      sendJson(res, 200, { row });
      return;
    }
  }

  if (path === '/api/settings' && method === 'GET') {
    const settings = withAuthorizedUser(db, token, 'settings', () => getSettings(db), now());
    sendJson(res, 200, { settings });
    return;
  }
  if (path === '/api/settings' && method === 'PUT') {
    const body = await readJson(req);
    const settings = withAuthorizedUser(db, token, 'settings', (session) =>
      updateSettings(db, session.user.id, body), now());
    sendJson(res, 200, { settings });
    return;
  }

  sendJson(res, 404, { errorKey: 'http.not_found' });
}

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const path = req.url?.split('?')[0] ?? '/';
  const files: Record<string, { file: string; type: string }> = {
    '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
    '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
    '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  };
  const entry = files[path];
  if (!entry || req.method !== 'GET') {
    sendJson(res, 404, { errorKey: 'http.not_found' });
    return;
  }
  const body = readFileSync(join(STATIC_DIR, entry.file));
  res.writeHead(200, {
    'Content-Type': entry.type,
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

export function createWebServer(db: Db, options: ServerOptions = {}): Server {
  const now = options.now ?? Date.now;
  return createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (!isLocalAddress(req.socket.remoteAddress)) {
      sendJson(res, 403, { errorKey: 'http.local_network_only' });
      return;
    }
    const path = req.url?.split('?')[0] ?? '/';
    if (path.startsWith('/api/')) {
      void handleApi(db, req, res, now).catch((error: unknown) => respondError(res, error));
      return;
    }
    try {
      serveStatic(req, res);
    } catch (error) {
      respondError(res, error);
    }
  });
}
