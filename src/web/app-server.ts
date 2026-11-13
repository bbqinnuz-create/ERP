import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { TLSSocket } from 'node:tls';
import { fileURLToPath } from 'node:url';
import type { Db } from '../db/connection';
import { AuthError, createUserForSession, listUsers, login, logout, setUserPermissions, updateUserForSession, withAuthorizedUser } from '../modules/auth/service';
import { hasPermission, type Permission } from '../modules/auth/permissions';
import { createBackup, getBackupStatus } from '../modules/backup/service';
import { getReport, REPORT_TYPES } from '../modules/reports/service';
import { createPurchase, getPurchase, listPurchases, reversePurchase } from '../modules/purchases/service';
import { addCartLine, getActiveCart, removeCartLine, setCartLineQty } from '../modules/carts/service';
import {
  getHeldCart,
  holdActiveCart,
  listHeldCarts,
  releaseHeldCart,
  reserveHeldCart,
  setReservationQuantity,
} from '../modules/carts/held';
import { createSale, getSalesContext, quoteSale } from '../modules/sales/service';
import { createReturn, findSalesForReturn, quoteReturn } from '../modules/returns/service';
import { createWriteOff, listWriteOffs } from '../modules/writeoffs/service';
import {
  cancelStocktake,
  completeStocktake,
  getStocktake,
  listStocktakeReservations,
  listStocktakes,
  saveStocktakeCounts,
  startStocktake,
} from '../modules/stocktakes/service';
import {
  collectDebtPayment,
  forgiveDebt,
  getCustomerDebt,
  listDebtors,
  listDebtPaymentMethods,
} from '../modules/debts/service';
import { createCashOperation, getCashSummary, reverseCashOperation } from '../modules/cash/service';
import { reconcileStockCaches } from '../modules/stock/ledger';
import { listLanConnectionAddresses } from './connection-info';
import { createCopyJob, listPrintJobs } from '../modules/print/service';
import { expireReservations } from '../modules/carts/held';
import { getReceiptProfile, updateReceiptProfile } from '../modules/print/profile';
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
import {
  buildProductImportTemplate,
  commitProductImport,
  MAX_PRODUCT_IMPORT_BYTES,
  previewProductImport,
  type ProductImportOptions,
} from '../modules/products/import';

const SESSION_COOKIE = 'kassa_session';
const MAX_BODY_BYTES = 64 * 1024;
const STATIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

interface ServerOptions {
  now?: () => number;
  printEnabled?: boolean;
  backupDirectory?: string;
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

async function readJson(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maxBytes) throw new AuthError(413, 'http.body_too_large');
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

function requireAnyPermission(db: Db, userId: string, permissions: Permission[]): void {
  if (!permissions.some((permission) => hasPermission(db, userId, permission))) {
    throw new AuthError(403, 'auth.permission_denied');
  }
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

async function handleApi(
  db: Db,
  req: IncomingMessage,
  res: ServerResponse,
  now: () => number,
  listenAddress: AddressInfo | string | null,
  printEnabled: boolean,
  backupDirectory: string | undefined,
): Promise<void> {
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
  if (path === '/api/server-info' && method === 'GET') {
    const addresses = withAuthorizedUser(db, token, null, (session) => {
      if (session.user.role !== 'admin') throw new AuthError(403, 'auth.permission_denied');
      if (!listenAddress || typeof listenAddress === 'string') return [];
      return listLanConnectionAddresses(listenAddress.address, listenAddress.port);
    }, now());
    sendJson(res, 200, {
      addresses,
      warningKey: addresses.length === 0 ? 'connection.no_lan_addresses' : null,
    });
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
    const rows = withAuthorizedUser(db, token, null, () => {
      expireReservations(db);
      return listStock(db);
    }, now());
    sendJson(res, 200, { rows });
    return;
  }

  if (path === '/api/reports' && method === 'GET') {
    const report = withAuthorizedUser(db, token, 'reports', (session) => {
      const type = url.searchParams.get('type');
      if (!type || !(REPORT_TYPES as readonly string[]).includes(type)) {
        throw new AuthError(400, 'report.invalid_type');
      }
      const language = url.searchParams.get('lang') ?? session.user.lang;
      if (language !== 'ru' && language !== 'uz') throw new AuthError(400, 'validation.invalid_language');
      return getReport(db, session.user.id, {
        type,
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
        warehouseId: url.searchParams.get('warehouseId') ?? undefined,
        productId: url.searchParams.get('productId') ?? undefined,
        userId: url.searchParams.get('userId') ?? undefined,
      }, language);
    }, now());
    sendJson(res, 200, { report });
    return;
  }
  if (path === '/api/reports/options' && method === 'GET') {
    const options = withAuthorizedUser(db, token, 'reports', (session) => {
      const productName = session.user.lang === 'uz'
        ? 'COALESCE(name_uz, name_ru)'
        : 'name_ru';
      const users = db.prepare(
        'SELECT id, full_name AS fullName FROM users WHERE active = 1 ORDER BY full_name, id',
      ).all();
      const products = db.prepare(
        `SELECT id, sku, ${productName} AS name FROM products
         WHERE active = 1 ORDER BY name_ru, sku`,
      ).all();
      const warehouses = db.prepare(
        `SELECT w.id, w.name FROM warehouses w JOIN branches b ON b.id = w.branch_id
         WHERE w.active = 1 AND b.active = 1 ORDER BY w.name, w.id`,
      ).all();
      return { users, products, warehouses };
    }, now());
    sendJson(res, 200, options);
    return;
  }

  if (path === '/api/backups' && method === 'GET') {
    const isAdmin = withAuthorizedUser(db, token, null, (session) => session.user.role === 'admin', now());
    if (!isAdmin) throw new AuthError(403, 'auth.permission_denied');
    const status = await getBackupStatus(backupDirectory);
    sendJson(res, 200, { status });
    return;
  }
  if (path === '/api/backups' && method === 'POST') {
    const userId = withAuthorizedUser(db, token, null, (session) => {
      if (session.user.role !== 'admin') throw new AuthError(403, 'auth.permission_denied');
      return session.user.id;
    }, now());
    const result = await createBackup(db, backupDirectory, userId);
    sendJson(res, 201, {
      backup: {
        file: result.file,
        createdAt: new Date().toISOString(),
        bytes: result.bytes,
        integrity: result.verification.integrity,
        discrepancies: result.verification.discrepancies.length,
      },
    });
    return;
  }

  if (path === '/api/returns/search' && method === 'GET') {
    const sales = withAuthorizedUser(db, token, 'return', () =>
      findSalesForReturn(db, url.searchParams.get('q')), now());
    sendJson(res, 200, { sales });
    return;
  }
  if (path === '/api/returns/quote' && method === 'POST') {
    const body = await readJson(req);
    const quote = withAuthorizedUser(db, token, 'return', (session) =>
      quoteReturn(db, session.user.id, body), now());
    sendJson(res, 200, { quote });
    return;
  }
  if (path === '/api/returns' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, 'return', (session) =>
      createReturn(db, session.user.id, body), now());
    sendJson(res, result.replayed ? 200 : 201, result);
    return;
  }
  if (path === '/api/writeoffs' && method === 'GET') {
    const writeoffs = withAuthorizedUser(db, token, 'write_off', () => listWriteOffs(db), now());
    sendJson(res, 200, { writeoffs });
    return;
  }
  if (path === '/api/writeoffs' && method === 'POST') {
    const body = await readJson(req);
    const writeoff = withAuthorizedUser(db, token, 'write_off', (session) =>
      createWriteOff(db, session.user.id, body), now());
    sendJson(res, 201, { writeoff });
    return;
  }
  if (path === '/api/stocktakes' && method === 'GET') {
    const stocktakes = withAuthorizedUser(db, token, 'stocktake', () => listStocktakes(db), now());
    sendJson(res, 200, { stocktakes });
    return;
  }
  if (path === '/api/stocktakes' && method === 'POST') {
    const body = await readJson(req);
    const stocktake = withAuthorizedUser(db, token, 'stocktake', (session) =>
      startStocktake(db, session.user.id, body), now());
    sendJson(res, 201, { stocktake });
    return;
  }
  const stocktakeRoute = /^\/api\/stocktakes\/([^/]+)(?:\/(counts|complete|cancel|reservations))?$/.exec(path);
  if (stocktakeRoute) {
    const id = decodeURIComponent(stocktakeRoute[1]!);
    if (!stocktakeRoute[2] && method === 'GET') {
      const result = withAuthorizedUser(db, token, 'stocktake', () => getStocktake(db, id), now());
      sendJson(res, 200, result);
      return;
    }
    if (stocktakeRoute[2] === 'counts' && method === 'POST') {
      const body = await readJson(req);
      const result = withAuthorizedUser(db, token, 'stocktake', (session) =>
        saveStocktakeCounts(db, session.user.id, id, body.lines), now());
      sendJson(res, 200, result);
      return;
    }
    if (stocktakeRoute[2] === 'reservations' && method === 'GET') {
      const reservations = withAuthorizedUser(db, token, 'reserve_cart', (session) =>
        listStocktakeReservations(db, session.user.id, id), now());
      sendJson(res, 200, { reservations });
      return;
    }
    if (stocktakeRoute[2] === 'complete' && method === 'POST') {
      const result = withAuthorizedUser(db, token, 'stocktake', (session) =>
        completeStocktake(db, session.user.id, id), now());
      sendJson(res, 200, result);
      return;
    }
    if (stocktakeRoute[2] === 'cancel' && method === 'POST') {
      const body = await readJson(req);
      withAuthorizedUser(db, token, 'stocktake', (session) =>
        cancelStocktake(db, session.user.id, id, body.reason), now());
      sendJson(res, 200, { status: 'cancelled' });
      return;
    }
  }
  if (path === '/api/held-carts' && method === 'GET') {
    const carts = withAuthorizedUser(db, token, 'hold_cart', (session) =>
      listHeldCarts(db, session.user.id, session.user.role === 'admin'), now());
    sendJson(res, 200, { carts });
    return;
  }
  if (path === '/api/held-carts' && method === 'POST') {
    const body = await readJson(req);
    const cart = withAuthorizedUser(db, token, 'hold_cart', (session) =>
      holdActiveCart(db, session.user.id, body.customerId), now());
    sendJson(res, 201, { cart });
    return;
  }
  const heldCartRoute = /^\/api\/held-carts\/([^/]+)(?:\/(reserve|release))?$/.exec(path);
  if (heldCartRoute) {
    const id = decodeURIComponent(heldCartRoute[1]!);
    if (!heldCartRoute[2] && method === 'GET') {
      const cart = withAuthorizedUser(db, token, 'hold_cart', (session) =>
        getHeldCart(db, session.user.id, id), now());
      sendJson(res, 200, { cart });
      return;
    }
    if (heldCartRoute[2] === 'reserve' && method === 'POST') {
      const body = await readJson(req);
      const cart = withAuthorizedUser(db, token, 'reserve_cart', (session) =>
        reserveHeldCart(db, session.user.id, id, body.warehouseId), now());
      sendJson(res, 200, { cart });
      return;
    }
    if (heldCartRoute[2] === 'release' && method === 'POST') {
      const body = await readJson(req);
      if (body.cancel !== undefined && typeof body.cancel !== 'boolean') {
        throw new AuthError(400, 'validation.invalid_object');
      }
      const cart = withAuthorizedUser(db, token, body.cancel === true ? 'hold_cart' : 'reserve_cart', (session) =>
        releaseHeldCart(db, session.user.id, id, body.cancel === true), now());
      sendJson(res, 200, { cart });
      return;
    }
  }
  const reservationRoute = /^\/api\/reservations\/([^/]+)$/.exec(path);
  if (reservationRoute && method === 'PUT') {
    const body = await readJson(req);
    if (Object.keys(body).some((key) => key !== 'qty')) throw new AuthError(400, 'validation.unknown_field');
    const reservation = withAuthorizedUser(db, token, 'reserve_cart', (session) =>
      setReservationQuantity(db, session.user.id, decodeURIComponent(reservationRoute[1]!), body.qty), now());
    sendJson(res, 200, { reservation });
    return;
  }

  if (path === '/api/sales/context' && method === 'GET') {
    const context = withAuthorizedUser(db, token, 'sell', () => getSalesContext(db), now());
    sendJson(res, 200, context);
    return;
  }
  if (path === '/api/cart' && method === 'GET') {
    const cart = withAuthorizedUser(db, token, 'sell', (session) => getActiveCart(db, session.user.id), now());
    sendJson(res, 200, { cart });
    return;
  }
  if (path === '/api/cart/lines' && method === 'POST') {
    const body = await readJson(req);
    const cart = withAuthorizedUser(db, token, 'sell', (session) => addCartLine(db, session.user.id, body), now());
    sendJson(res, 200, { cart });
    return;
  }
  const cartLineRoute = /^\/api\/cart\/lines\/([^/]+)$/.exec(path);
  if (cartLineRoute) {
    const productId = decodeURIComponent(cartLineRoute[1]!);
    if (method === 'PATCH') {
      const body = await readJson(req);
      if (Object.keys(body).some((key) => key !== 'qty')) throw new AuthError(400, 'validation.unknown_field');
      const cart = withAuthorizedUser(db, token, 'sell',
        (session) => setCartLineQty(db, session.user.id, productId, body.qty), now());
      sendJson(res, 200, { cart });
      return;
    }
    if (method === 'DELETE') {
      const cart = withAuthorizedUser(db, token, 'sell',
        (session) => removeCartLine(db, session.user.id, productId), now());
      sendJson(res, 200, { cart });
      return;
    }
  }
  if (path === '/api/sales/quote' && method === 'POST') {
    const body = await readJson(req);
    const quote = withAuthorizedUser(db, token, 'sell',
      (session) => quoteSale(db, session.user.id, body), now());
    sendJson(res, 200, { quote });
    return;
  }
  if (path === '/api/sales' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, 'sell',
      (session) => createSale(db, session.user.id, session.user.lang, body), now());
    sendJson(res, result.replayed ? 200 : 201, { ...result.receipt, replayed: result.replayed });
    return;
  }
  if (path === '/api/print-jobs' && method === 'GET') {
    const jobs = withAuthorizedUser(db, token, null, (session) => {
      if (!hasPermission(db, session.user.id, 'sell') && !hasPermission(db, session.user.id, 'return')) {
        throw new AuthError(403, 'auth.permission_denied');
      }
      return listPrintJobs(db, session.user.id, session.user.role === 'admin');
    }, now());
    sendJson(res, 200, { jobs, enabled: printEnabled });
    return;
  }
  const copyRoute = /^\/api\/print-jobs\/([^/]+)\/copy$/.exec(path);
  if (copyRoute && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, null, (session) =>
      createCopyJob(db, session.user.id, session.user.role === 'admin',
        decodeURIComponent(copyRoute[1]!), body), now());
    sendJson(res, 201, result);
    return;
  }
  if (path === '/api/print-profile' && method === 'GET') {
    const profile = withAuthorizedUser(db, token, 'settings', () => getReceiptProfile(db), now());
    sendJson(res, 200, { profile });
    return;
  }
  if (path === '/api/print-profile' && method === 'PUT') {
    const body = await readJson(req);
    const profile = withAuthorizedUser(db, token, 'settings', (session) =>
      updateReceiptProfile(db, session.user.id, body), now());
    sendJson(res, 200, { profile });
    return;
  }

  if (path === '/api/debts' && method === 'GET') {
    const result = withAuthorizedUser(db, token, null, (session) => {
      requireAnyPermission(db, session.user.id, ['debt_payment', 'reports']);
      return {
        debtors: listDebtors(db),
        paymentMethods: listDebtPaymentMethods(db, session.user.lang),
      };
    }, now());
    sendJson(res, 200, result);
    return;
  }
  const debtCustomerRoute = /^\/api\/debts\/([^/]+)$/.exec(path);
  if (debtCustomerRoute && method === 'GET') {
    const customerId = decodeURIComponent(debtCustomerRoute[1]!);
    const debt = withAuthorizedUser(db, token, null, (session) => {
      requireAnyPermission(db, session.user.id, ['debt_payment', 'reports']);
      return getCustomerDebt(db, customerId);
    }, now());
    sendJson(res, 200, debt);
    return;
  }
  if (path === '/api/debts/payments' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, 'debt_payment',
      (session) => collectDebtPayment(db, session.user.id, body, session.user.lang), now());
    sendJson(res, result.replayed ? 200 : 201, result);
    return;
  }
  if (path === '/api/debts/forgiveness' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, null,
      (session) => forgiveDebt(db, session.user.id, body), now());
    sendJson(res, 201, result);
    return;
  }
  if (path === '/api/cash' && method === 'GET') {
    const summary = withAuthorizedUser(db, token, null, (session) => {
      requireAnyPermission(db, session.user.id, [
        'cash_in',
        'cash_out',
        'expense',
        'cash_collection',
        'reports',
      ]);
      return getCashSummary(db, {
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
        offset: url.searchParams.get('offset') ?? undefined,
      }, session.user.lang);
    }, now());
    sendJson(res, 200, summary);
    return;
  }
  if (path === '/api/cash/operations' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, null,
      (session) => createCashOperation(db, session.user.id, body), now());
    sendJson(res, result.replayed ? 200 : 201, result);
    return;
  }
  const cashReversalRoute = /^\/api\/cash\/operations\/([^/]+)\/reverse$/.exec(path);
  if (cashReversalRoute && method === 'POST') {
    const operationId = decodeURIComponent(cashReversalRoute[1]!);
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, null,
      (session) => reverseCashOperation(db, session.user.id, operationId, body), now());
    sendJson(res, result.replayed ? 200 : 201, result);
    return;
  }

  if (path === '/api/purchases' && method === 'GET') {
    const result = withAuthorizedUser(db, token, null, (session) => ({
      purchases: listPurchases(db).map((purchase) => {
        if (hasPermission(db, session.user.id, 'view_cost')) return purchase;
        const { total_cost: _totalCost, ...visible } = purchase;
        return visible;
      }),
    }), now());
    sendJson(res, 200, result);
    return;
  }
  if (path === '/api/purchases' && method === 'POST') {
    const body = await readJson(req);
    const result = withAuthorizedUser(db, token, 'purchase', (session) => {
      const created = createPurchase(db, session.user.id, body);
      if (hasPermission(db, session.user.id, 'view_cost')) return created;
      const { purchase, lines } = created;
      const { total_cost: _totalCost, ...visiblePurchase } = purchase;
      return {
        purchase: visiblePurchase,
        lines: lines.map(({ unitCost: _unitCost, costTotal: _costTotal, ...line }) => line),
      };
    }, now());
    sendJson(res, 201, result);
    return;
  }
  const purchaseRoute = /^\/api\/purchases\/([^/]+)(?:\/(reverse))?$/.exec(path);
  if (purchaseRoute) {
    const purchaseId = decodeURIComponent(purchaseRoute[1]!);
    if (method === 'GET' && !purchaseRoute[2]) {
      const result = withAuthorizedUser(db, token, null, (session) => {
        const purchase = getPurchase(db, purchaseId);
        if (hasPermission(db, session.user.id, 'view_cost')) return purchase;
        const { total_cost: _totalCost, ...visiblePurchase } = purchase.purchase;
        return {
          purchase: visiblePurchase,
          lines: purchase.lines.map(({ unitCost: _unitCost, costTotal: _costTotal, ...line }) => line),
        };
      }, now());
      sendJson(res, 200, result);
      return;
    }
    if (method === 'POST' && purchaseRoute[2] === 'reverse') {
      const result = withAuthorizedUser(db, token, 'purchase', (session) => {
        const reversed = reversePurchase(db, session.user.id, purchaseId);
        if (hasPermission(db, session.user.id, 'view_cost')) return reversed;
        const { purchase, lines } = reversed;
        const { total_cost: _totalCost, ...visiblePurchase } = purchase;
        return {
          purchase: visiblePurchase,
          lines: lines.map(({ unitCost: _unitCost, costTotal: _costTotal, ...line }) => line),
        };
      }, now());
      sendJson(res, 200, result);
      return;
    }
  }
  if (path === '/api/stock/movements' && method === 'GET') {
    const productId = url.searchParams.get('productId');
    const warehouseId = url.searchParams.get('warehouseId');
    const limitText = url.searchParams.get('limit') ?? '200';
    const limit = /^\d+$/.test(limitText) ? Number(limitText) : 0;
    const offsetText = url.searchParams.get('offset') ?? '0';
    const offset = /^\d+$/.test(offsetText) ? Number(offsetText) : -1;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new AuthError(400, 'validation.invalid_limit');
    }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000_000) {
      throw new AuthError(400, 'validation.invalid_offset');
    }
    const result = withAuthorizedUser(db, token, null, (session) => {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (productId) {
        conditions.push('m.product_id = ?');
        params.push(productId);
      }
      if (warehouseId) {
        conditions.push('m.warehouse_id = ?');
        params.push(warehouseId);
      }
      const rows = db.prepare(
        `SELECT m.id, m.created_at, m.product_id, p.sku, p.name_ru AS product_name, p.unit,
                m.warehouse_id, w.name AS warehouse_name, m.type, m.qty,
                ${hasPermission(db, session.user.id, 'view_cost') ? 'm.unit_cost,' : ''}
                m.doc_type, m.doc_id,
                COALESCE((SELECT pch.number FROM purchases pch
                          WHERE m.doc_type = 'purchase' AND pch.id = m.doc_id), m.doc_id) AS document_number,
                m.user_id, u.full_name AS user_name, m.note
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
         JOIN warehouses w ON w.id = m.warehouse_id
         LEFT JOIN users u ON u.id = m.user_id
         ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
         ORDER BY m.created_at DESC, m.seq DESC LIMIT ? OFFSET ?`,
      ).all(...params, limit + 1, offset) as Record<string, unknown>[];
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
    }, now());
    sendJson(res, 200, result);
    return;
  }
  if (path === '/api/stock/reconcile' && method === 'GET') {
    const discrepancies = withAuthorizedUser(db, token, 'settings', () => reconcileStockCaches(db), now());
    sendJson(res, 200, { discrepancies });
    return;
  }

  if (path === '/api/product-units' && method === 'GET') {
    const units = withAuthorizedUser(db, token, null, () => listProductUnits(db), now());
    sendJson(res, 200, { units });
    return;
  }

  if (path === '/api/products/import/template' && method === 'GET') {
    withAuthorizedUser(db, token, null, (session) => {
      requireAdditionalPermission(db, session.user.id, 'settings');
      requireAdditionalPermission(db, session.user.id, 'price_edit');
    }, now());
    const language = url.searchParams.get('lang') ?? 'ru';
    if (language !== 'ru' && language !== 'uz') {
      throw new AuthError(400, 'product_import.invalid_language');
    }
    const template = await buildProductImportTemplate(language);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-import-template.xlsx"',
      'Content-Length': template.byteLength,
      'Cache-Control': 'no-store',
    });
    res.end(template);
    return;
  }

  const productImportRoute = /^\/api\/products\/import\/(preview|commit)$/.exec(path);
  if (productImportRoute && method === 'POST') {
    withAuthorizedUser(db, token, null, (session) => {
      requireAdditionalPermission(db, session.user.id, 'settings');
      requireAdditionalPermission(db, session.user.id, 'price_edit');
    }, now());
    const body = await readJson(req, MAX_PRODUCT_IMPORT_BYTES * 6 + 64 * 1024);
    const language = body.lang;
    const createMissingCategories = body.createMissingCategories;
    if (Object.keys(body).some((key) =>
      !['csv', 'mode', 'lang', 'createMissingCategories'].includes(key)) ||
        typeof body.csv !== 'string' ||
        (body.mode !== 'skip' && body.mode !== 'update') ||
        (language !== 'ru' && language !== 'uz') ||
        typeof createMissingCategories !== 'boolean') {
      throw new AuthError(400, 'product_import.invalid_request');
    }
    const csv = body.csv;
    const mode = body.mode;
    const options: ProductImportOptions = {
      lang: language === 'uz' ? 'uz' : 'ru',
      createMissingCategories,
    };
    const result = withAuthorizedUser(db, token, null, (session) => {
      requireAdditionalPermission(db, session.user.id, 'settings');
      requireAdditionalPermission(db, session.user.id, 'price_edit');
      return productImportRoute[1] === 'preview'
        ? previewProductImport(db, csv, mode, options)
        : commitProductImport(db, session.user.id, csv, mode, options);
    }, now());
    sendJson(res, 200, result);
    return;
  }

  const productPriceRoute = /^\/api\/references\/products\/([^/]+)\/price$/.exec(path);
  if (productPriceRoute && method === 'PATCH') {
    const body = await readJson(req);
    if (Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'base_price')) {
      throw new AuthError(400, 'validation.unknown_field');
    }
    const productId = decodeURIComponent(productPriceRoute[1]!);
    const row = withAuthorizedUser(db, token, null, (session) => {
      requireAdditionalPermission(db, session.user.id, 'price_edit');
      return saveReference(db, session.user.id, 'products', body, productId);
    }, now());
    sendJson(res, 200, { row });
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

const CLIENT_ROUTES = new Set([
  '/sell', '/sales', '/print', '/returns', '/writeoffs', '/stocktakes', '/reports',
  '/products', '/stock', '/purchases', '/movements', '/debts', '/cash', '/users', '/connection',
]);

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const files: Record<string, { file: string; type: string }> = {
    '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
    '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
    '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  };
  const entry = files[path] ?? (CLIENT_ROUTES.has(path) ? files['/'] : undefined);
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
  let server: Server;
  server = createServer((req, res) => {
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
      void handleApi(db, req, res, now, server.address(), options.printEnabled ?? false,
        options.backupDirectory ?? process.env.BACKUP_DIR)
        .catch((error: unknown) => respondError(res, error));
      return;
    }
    try {
      serveStatic(req, res);
    } catch (error) {
      respondError(res, error);
    }
  });
  return server;
}
