import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, login, setUserPermissions } from '../src/modules/auth/service';
import { createWebServer } from '../src/web/app-server';
import type { Server } from 'node:http';
import { makeEnv, type TestEnv } from './helpers';

let env: TestEnv;
let server: Server;
let baseUrl: string;
let adminId: string;

beforeEach(async () => {
  env = makeEnv();
  const admin = await bootstrapAdmin(env.db, {
    login: 'owner',
    password: 'correct horse battery',
    fullName: 'Owner',
    role: 'admin',
    lang: 'ru',
  });
  adminId = admin.id;
  server = createWebServer(env.db);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  env.cleanup();
});

async function loginCookie(loginName = 'owner', password = 'correct horse battery'): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get('set-cookie');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Strict');
  return cookie!.split(';')[0]!;
}

describe('HTTP API этапа 2', () => {
  it('отдаёт RU/UZ-клиент, требует сессию для API и возвращает текущего пользователя', async () => {
    expect((await fetch(baseUrl)).status).toBe(200);
    expect((await fetch(`${baseUrl}/app.js`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/stock`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/product-units`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/server-info`)).status).toBe(401);

    const cookie = await loginCookie();
    const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { login: 'owner', role: 'admin' } });
    const statusResponse = await fetch(`${baseUrl}/api/auth/status`, { headers: { Cookie: cookie } });
    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toEqual({ status: 'ok' });
    const connectionResponse = await fetch(`${baseUrl}/api/server-info`, { headers: { Cookie: cookie } });
    expect(connectionResponse.status).toBe(200);
    expect(await connectionResponse.json()).toEqual({
      addresses: [],
      warningKey: 'connection.no_lan_addresses',
    });
    const usersResponse = await fetch(`${baseUrl}/api/users`, { headers: { Cookie: cookie } });
    const { users } = await usersResponse.json() as { users: Record<string, unknown>[] };
    expect(users[0]).not.toHaveProperty('password_hash');
  });

  it('проверяет права на сервере и позволяет администратору вести справочник', async () => {
    const adminCookie = await loginCookie();
    const unitsResponse = await fetch(`${baseUrl}/api/product-units`, { headers: { Cookie: adminCookie } });
    expect(await unitsResponse.json()).toEqual({ units: ['шт', 'кг', 'тн', 'метр'] });

    const created = await fetch(`${baseUrl}/api/references/categories`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_ru: 'Категория' }),
    });
    expect(created.status).toBe(201);

    const productResponse = await fetch(`${baseUrl}/api/references/products`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'BOX-1', name: 'Коробка', unit: 'коробка', base_price: 250 }),
    });
    expect(productResponse.status).toBe(201);
    const { row: product } = await productResponse.json() as { row: Record<string, unknown> };
    expect(product).toMatchObject({ name: 'Коробка', unit: 'коробка', base_price: 250 });
    expect(product).not.toHaveProperty('name_ru');
    const listedProducts = await fetch(`${baseUrl}/api/references/products`, { headers: { Cookie: adminCookie } });
    const { rows } = await listedProducts.json() as { rows: Record<string, unknown>[] };
    expect(rows[0]).toMatchObject({ name: 'Коробка', unit: 'коробка', base_price: 250 });
    expect(rows[0]).not.toHaveProperty('name_uz');
    const updatedUnits = await fetch(`${baseUrl}/api/product-units`, { headers: { Cookie: adminCookie } });
    expect(await updatedUnits.json()).toEqual({ units: ['шт', 'кг', 'тн', 'метр', 'коробка'] });

    const cashier = await createUser(env.db, adminId, {
      login: 'cashier',
      password: 'cashier secure password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    setUserPermissions(env.db, adminId, cashier.id, { settings: 1 });
    const cashierCookie = await loginCookie('cashier', 'cashier secure password');
    const connectionDenied = await fetch(`${baseUrl}/api/server-info`, { headers: { Cookie: cashierCookie } });
    expect(connectionDenied.status).toBe(403);
    const denied = await fetch(`${baseUrl}/api/references/products`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'X', name: 'X', unit: 'шт', base_price: 0 }),
    });
    expect(denied.status).toBe(403);
  });

  it('доступ к API прекращается после нового входа и сервер выдаёт понятный статус', async () => {
    const oldCookie = await loginCookie();
    await login(env.db, 'owner', 'correct horse battery');
    const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: oldCookie } });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ errorKey: 'auth.session_replaced' });
    const statusResponse = await fetch(`${baseUrl}/api/auth/status`, { headers: { Cookie: oldCookie } });
    expect(statusResponse.status).toBe(401);
    expect(await statusResponse.json()).toMatchObject({ errorKey: 'auth.session_replaced' });
  });
});
