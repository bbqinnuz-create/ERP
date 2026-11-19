import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, login, setUserPermissions } from '../src/modules/auth/service';
import {
  addIpRule,
  allowIpAddress,
  denyIpAddress,
  inspectIpAccess,
  normalizeIpAddress,
  removeIpEntry,
  revokeIpRule,
  updateIpRule,
} from '../src/modules/ip-access/service';
import { createWebServer } from '../src/web/app-server';
import { makeEnv, type TestEnv } from './helpers';

let env: TestEnv;
let server: Server;
let baseUrl: string;
let clientIp: string;
let adminId: string;
let nowMs: number;
const adminLogin = 'owner';
const adminPassword = 'correct horse battery';
const workstationIp = '192.168.10.44';

beforeEach(async () => {
  env = makeEnv();
  nowMs = Date.UTC(2026, 10, 19, 10, 0, 0);
  clientIp = workstationIp;
  const admin = await bootstrapAdmin(env.db, {
    login: adminLogin,
    password: adminPassword,
    fullName: 'Owner',
    role: 'admin',
    lang: 'ru',
  });
  adminId = admin.id;
  server = createWebServer(env.db, { now: () => nowMs, clientAddress: () => clientIp });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  env.cleanup();
});

async function loginCookie(loginName = adminLogin, password = adminPassword): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!response.ok) throw new Error(`login failed: ${response.status} ${await response.text()}`);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

describe('доступ по IP', () => {
  it('показывает экран ожидания и запрещает любые API неизвестному IP', async () => {
    const page = await fetch(baseUrl);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('data-i18n="pending"');

    const appScript = await fetch(`${baseUrl}/app.js`);
    expect(appScript.status).toBe(200);
    expect(await appScript.text()).toContain('data-i18n="pending"');

    const waitScript = await fetch(`${baseUrl}/ip-wait.js`);
    expect(waitScript.status).toBe(200);
    expect(await waitScript.text()).toContain('Ulanishga ruxsat');

    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ errorKey: 'ip.pending', ip: workstationIp });

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: adminLogin, password: adminPassword }),
    });
    expect(loginResponse.status).toBe(403);
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM sessions').get()).toEqual({ count: 0 });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get()).toEqual({ count: 1 });

    clientIp = '127.0.0.1';
    const adminCookie = await loginCookie();
    const approval = await fetch(`${baseUrl}/api/ip-access`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: workstationIp, mode: 'any', userIds: [] }),
    });
    expect(approval.status).toBe(201);
    expect(env.db.prepare("SELECT action FROM audit_log WHERE action = 'ip.allow'").get()).toEqual({ action: 'ip.allow' });

    clientIp = workstationIp;
    expect(await (await fetch(`${baseUrl}/ip-wait-status`)).json())
      .toMatchObject({ ip: workstationIp, status: 'allowed' });
    expect((await fetch(baseUrl)).status).toBe(200);
    expect(await (await fetch(baseUrl)).text()).toContain('id="login-form"');
  });

  it('does not trust public IP or forwarded headers and never stores loopback', async () => {
    clientIp = '8.8.8.8';
    const response = await fetch(baseUrl, { headers: { 'X-Forwarded-For': workstationIp } });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ errorKey: 'http.local_network_only' });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get()).toEqual({ count: 0 });

    expect(inspectIpAccess(env.db, '::ffff:127.0.0.1', nowMs)).toEqual({ ip: '127.0.0.1', status: 'allowed' });
    expect(inspectIpAccess(env.db, '::1', nowMs)).toEqual({ ip: '::1', status: 'allowed' });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get()).toEqual({ count: 0 });
    expect(normalizeIpAddress('FE80::ABCD')).toBe('fe80::abcd');
  });

  it('checks a selected account after the password and allows any-account rules', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    allowIpAddress(env.db, adminId, workstationIp, 'any', []);
    await expect(login(env.db, adminLogin, adminPassword, nowMs, workstationIp))
      .resolves.toMatchObject({ user: { login: adminLogin } });

    updateIpRule(env.db, adminId, workstationIp, 'selected', [cashier.id]);
    await expect(login(env.db, adminLogin, 'wrong password', nowMs + 1000, workstationIp))
      .rejects.toMatchObject({ status: 401, errorKey: 'auth.invalid_credentials' });
    await expect(login(env.db, adminLogin, adminPassword, nowMs + 1000, workstationIp))
      .rejects.toMatchObject({ status: 403, errorKey: 'ip.account_not_allowed' });
    await expect(login(env.db, 'cashier1', 'cashier password', nowMs + 1000, workstationIp))
      .resolves.toMatchObject({ user: { login: 'cashier1' } });
  });

  it('rechecks live sessions after account changes and IP revocation', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    allowIpAddress(env.db, adminId, workstationIp, 'selected', [cashier.id]);
    const cookie = await loginCookie('cashier1', 'cashier password');
    expect((await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } })).status).toBe(200);

    updateIpRule(env.db, adminId, workstationIp, 'selected', [adminId]);
    const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'cashier1', password: 'wrong password' }),
    });
    expect(wrongPassword.status).toBe(401);
    expect(await wrongPassword.json()).toMatchObject({ errorKey: 'auth.invalid_credentials' });
    const accountDenied = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(accountDenied.status).toBe(403);
    expect(await accountDenied.json()).toMatchObject({ errorKey: 'ip.account_not_allowed' });

    updateIpRule(env.db, adminId, workstationIp, 'selected', [cashier.id]);
    const validCookie = await loginCookie('cashier1', 'cashier password');
    revokeIpRule(env.db, adminId, workstationIp);
    const revoked = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: validCookie } });
    expect(revoked.status).toBe(403);
    expect(await revoked.json()).toMatchObject({ errorKey: 'ip.pending', ip: workstationIp });
  });

  it('keeps denied addresses on the waiting screen and reports denial to API', async () => {
    denyIpAddress(env.db, adminId, workstationIp);
    const page = await fetch(baseUrl);
    expect(page.status).toBe(200);
    const status = await fetch(`${baseUrl}/ip-wait-status`);
    expect(await status.json()).toMatchObject({ ip: workstationIp, status: 'denied' });
    const api = await fetch(`${baseUrl}/api/health`);
    expect(api.status).toBe(403);
    expect(await api.json()).toEqual({ errorKey: 'ip.denied', ip: workstationIp });
  });

  it('requires ip_manage for management and limits mutations to the main computer', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    clientIp = '127.0.0.1';
    let cookie = await loginCookie('cashier1', 'cashier password');
    const denied = await fetch(`${baseUrl}/api/ip-access`, { headers: { Cookie: cookie } });
    expect(denied.status).toBe(403);

    setUserPermissions(env.db, adminId, cashier.id, { ip_manage: 1 });
    cookie = await loginCookie('cashier1', 'cashier password');
    const allowed = await fetch(`${baseUrl}/api/ip-access`, { headers: { Cookie: cookie } });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ rules: [], requests: [] });

    clientIp = workstationIp;
    allowIpAddress(env.db, adminId, workstationIp, 'any', []);
    const remoteMutation = await fetch(`${baseUrl}/api/ip-access`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: '192.168.10.45', mode: 'any', userIds: [] }),
    });
    expect(remoteMutation.status).toBe(403);
    expect(await remoteMutation.json()).toMatchObject({ errorKey: 'ip.main_computer_required' });
  });

  it('limits request rows, throttles updates and removes pending requests older than seven days', () => {
    inspectIpAccess(env.db, '192.168.0.1', nowMs);
    const initial = env.db.prepare('SELECT first_seen_at, last_seen_at FROM ip_requests WHERE ip = ?')
      .get('192.168.0.1') as { first_seen_at: string; last_seen_at: string };
    inspectIpAccess(env.db, '192.168.0.1', nowMs + 59_999);
    expect((env.db.prepare('SELECT last_seen_at FROM ip_requests WHERE ip = ?').get('192.168.0.1') as
      { last_seen_at: string }).last_seen_at).toBe(initial.last_seen_at);
    inspectIpAccess(env.db, '192.168.0.1', nowMs + 60_000);
    expect((env.db.prepare('SELECT last_seen_at FROM ip_requests WHERE ip = ?').get('192.168.0.1') as
      { last_seen_at: string }).last_seen_at).toBe(new Date(nowMs + 60_000).toISOString());

    for (let index = 1; index < 200; index += 1) {
      inspectIpAccess(env.db, `192.168.${Math.floor(index / 250)}.${(index % 250) + 1}`, nowMs);
    }
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get()).toEqual({ count: 200 });
    const overLimitIp = '192.168.2.1';
    expect(inspectIpAccess(env.db, overLimitIp, nowMs).status).toBe('pending');
    expect(env.db.prepare('SELECT 1 FROM ip_requests WHERE ip = ?').get(overLimitIp)).toBeUndefined();

    inspectIpAccess(env.db, '192.168.3.1', nowMs + 8 * 24 * 60 * 60 * 1000);
    expect(env.db.prepare('SELECT 1 FROM ip_requests WHERE ip = ?').get('192.168.0.1')).toBeUndefined();
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM ip_requests').get() as { count: number }).count)
      .toBeLessThanOrEqual(200);
  });

  it('audits allow, update, revoke, deny and remove actions', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    addIpRule(env.db, adminId, '192.168.10.45', 'any', []);
    updateIpRule(env.db, adminId, '192.168.10.45', 'selected', [cashier.id]);
    revokeIpRule(env.db, adminId, '192.168.10.45');
    denyIpAddress(env.db, adminId, '192.168.10.45');
    removeIpEntry(env.db, adminId, '192.168.10.45');
    const actions = (env.db.prepare(
      "SELECT action FROM audit_log WHERE entity IN ('ip_rules', 'ip_requests') ORDER BY at, id",
    ).all() as Array<{ action: string }>).map((entry) => entry.action);
    expect(actions).toContain('ip.add');
    expect(actions).toContain('ip.update');
    expect(actions).toContain('ip.revoke');
    expect(actions).toContain('ip.deny');
    expect(actions).toContain('ip.remove');
  });
});
