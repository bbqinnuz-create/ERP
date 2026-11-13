import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, login, setUserPermissions } from '../src/modules/auth/service';
import { addCartLine } from '../src/modules/carts/service';
import { createPurchase } from '../src/modules/purchases/service';
import { saveReference } from '../src/modules/references/service';
import { createSale } from '../src/modules/sales/service';
import { createWebServer } from '../src/web/app-server';
import type { Server } from 'node:http';
import { addCustomer, addProduct, makeEnv, type TestEnv } from './helpers';

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
    expect((await fetch(`${baseUrl}/api/purchases`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/stock/movements`)).status).toBe(401);

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

  it('защищает очередь печати правом sell и профиль чека правом settings', async () => {
    expect((await fetch(`${baseUrl}/api/print-jobs`)).status).toBe(401);
    const adminCookie = await loginCookie();
    const queueResponse = await fetch(`${baseUrl}/api/print-jobs`, { headers: { Cookie: adminCookie } });
    expect(queueResponse.status).toBe(200);
    expect(await queueResponse.json()).toEqual({ jobs: [], enabled: false });

    const profileResponse = await fetch(`${baseUrl}/api/print-profile`, { headers: { Cookie: adminCookie } });
    expect(profileResponse.status).toBe(200);
    expect(await profileResponse.json()).toMatchObject({
      profile: { storeName: 'Тест', address: '', phone: '', footerRu: '', footerUz: '' },
    });
    const savedProfile = await fetch(`${baseUrl}/api/print-profile`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: 'Магазин',
        address: 'Ташкент',
        phone: '+998 90 000 00 00',
        footerRu: 'Спасибо!',
        footerUz: 'Rahmat!',
      }),
    });
    expect(savedProfile.status).toBe(200);
    expect((await savedProfile.json()).profile).toMatchObject({
      storeName: 'Магазин',
      address: 'Ташкент',
      footerRu: 'Спасибо!',
      footerUz: 'Rahmat!',
    });
    expect((env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'print.profile.update'").get() as
      { count: number }).count).toBe(1);

    const cashier = await createUser(env.db, adminId, {
      login: 'no-print-permission',
      password: 'cashier secure password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    const cashierCookie = await loginCookie(cashier.login, 'cashier secure password');
    expect((await fetch(`${baseUrl}/api/print-jobs`, { headers: { Cookie: cashierCookie } })).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/print-profile`, { headers: { Cookie: cashierCookie } })).status).toBe(403);
  });

  it('сохраняет права пользователя через API и возвращает обновлённые значения', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'rights-cashier',
      password: 'cashier secure password',
      fullName: 'Rights Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    const cookie = await loginCookie();
    const response = await fetch(`${baseUrl}/api/users/${encodeURIComponent(cashier.id)}/permissions`, {
      method: 'PATCH',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: { sell: 1, discount_check_limit_bp: 500 } }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      permissions: { sell: 1, discount_check_limit_bp: 500 },
    });
    const usersResponse = await fetch(`${baseUrl}/api/users`, { headers: { Cookie: cookie } });
    const { users } = await usersResponse.json() as { users: Array<Record<string, unknown>> };
    const saved = users.find((user) => user.id === cashier.id);
    expect(saved).toMatchObject({
      permissions: { sell: 1, discount_check_limit_bp: 500 },
    });
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
    const purchaseResponse = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: env.warehouseId,
        date: '2026-11-13',
        lines: [{ productId: product.id, qty: '1.250', unitCost: 1000 }],
      }),
    });
    expect(purchaseResponse.status).toBe(201);
    const { purchase } = await purchaseResponse.json() as { purchase: Record<string, unknown> };
    expect(purchase).toMatchObject({ number: 'A-P-000001', total_cost: 1250, status: 'posted' });
    const movementResponseAdmin = await fetch(`${baseUrl}/api/stock/movements`, { headers: { Cookie: adminCookie } });
    const movementListAdmin = await movementResponseAdmin.json() as { rows: Record<string, unknown>[] };
    expect(movementListAdmin.rows[0]).toMatchObject({
      type: 'PURCHASE',
      qty: 1250,
      unit_cost: 1000,
      document_number: 'A-P-000001',
    });

    const cashier = await createUser(env.db, adminId, {
      login: 'cashier',
      password: 'cashier secure password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    setUserPermissions(env.db, adminId, cashier.id, { settings: 1 });
    const cashierCookie = await loginCookie('cashier', 'cashier secure password');
    const purchaseListResponse = await fetch(`${baseUrl}/api/purchases`, { headers: { Cookie: cashierCookie } });
    const purchaseList = await purchaseListResponse.json() as { purchases: Record<string, unknown>[] };
    expect(purchaseList.purchases[0]).not.toHaveProperty('total_cost');
    const purchaseDetailResponse = await fetch(
      `${baseUrl}/api/purchases/${encodeURIComponent(String(purchase.id))}`,
      { headers: { Cookie: cashierCookie } },
    );
    const purchaseDetail = await purchaseDetailResponse.json() as {
      purchase: Record<string, unknown>;
      lines: Record<string, unknown>[];
    };
    expect(purchaseDetail.purchase).not.toHaveProperty('total_cost');
    expect(purchaseDetail.lines[0]).not.toHaveProperty('unitCost');
    expect(purchaseDetail.lines[0]).not.toHaveProperty('costTotal');
    const movementResponse = await fetch(`${baseUrl}/api/stock/movements`, { headers: { Cookie: cashierCookie } });
    const movementList = await movementResponse.json() as { rows: Record<string, unknown>[] };
    expect(movementList.rows[0]).not.toHaveProperty('unit_cost');
    const purchaseDenied = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: env.warehouseId,
        date: '2026-11-13',
        lines: [{ productId: product.id, qty: '1', unitCost: 100 }],
      }),
    });
    expect(purchaseDenied.status).toBe(403);
    const connectionDenied = await fetch(`${baseUrl}/api/server-info`, { headers: { Cookie: cashierCookie } });
    expect(connectionDenied.status).toBe(403);
    const denied = await fetch(`${baseUrl}/api/references/products`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'X', name: 'X', unit: 'шт', base_price: 0 }),
    });
    expect(denied.status).toBe(403);

    const secondPurchaseResponse = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: env.warehouseId,
        date: '2026-11-14',
        lines: [{ productId: product.id, qty: '0.250', unitCost: 1100 }],
      }),
    });
    expect(secondPurchaseResponse.status).toBe(201);
    const firstMovementPageResponse = await fetch(`${baseUrl}/api/stock/movements?limit=1&offset=0`, {
      headers: { Cookie: adminCookie },
    });
    const firstMovementPage = await firstMovementPageResponse.json() as {
      rows: Record<string, unknown>[];
      hasMore: boolean;
    };
    expect(firstMovementPage.rows).toHaveLength(1);
    expect(firstMovementPage.hasMore).toBe(true);
    const secondMovementPageResponse = await fetch(`${baseUrl}/api/stock/movements?limit=1&offset=1`, {
      headers: { Cookie: adminCookie },
    });
    const secondMovementPage = await secondMovementPageResponse.json() as {
      rows: Record<string, unknown>[];
      hasMore: boolean;
    };
    expect(secondMovementPage.rows).toHaveLength(1);
    expect(secondMovementPage.hasMore).toBe(false);
    const firstMovementId = firstMovementPage.rows[0]?.id;
    const secondMovementId = secondMovementPage.rows[0]?.id;
    expect(firstMovementId).toBeDefined();
    expect(secondMovementId).toBeDefined();
    expect(secondMovementId).not.toBe(firstMovementId);
    const invalidMovementPage = await fetch(`${baseUrl}/api/stock/movements?offset=-1`, {
      headers: { Cookie: adminCookie },
    });
    expect(invalidMovementPage.status).toBe(400);
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

  it('защищает корзину правом sell и проводит чек с общим складом и идемпотентностью', async () => {
    const adminCookie = await loginCookie();
    expect((await fetch(`${baseUrl}/api/cart`)).status).toBe(401);

    const extraWarehouse = saveReference(env.db, adminId, 'warehouses', {
      branch_id: env.branchId,
      name: 'Дополнительный склад',
    });
    const contextBefore = await fetch(`${baseUrl}/api/sales/context`, { headers: { Cookie: adminCookie } });
    expect(contextBefore.status).toBe(200);
    expect((await contextBefore.json() as { defaultWarehouseId: string | null }).defaultWarehouseId).toBeNull();

    const invalidSetting = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_warehouse_id: 'missing-warehouse' }),
    });
    expect(invalidSetting.status).toBe(400);
    expect(await invalidSetting.json()).toMatchObject({ errorKey: 'settings.invalid_default_warehouse' });
    const savedSetting = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_warehouse_id: env.warehouseId }),
    });
    expect(savedSetting.status).toBe(200);
    expect(extraWarehouse.id).not.toBe(env.warehouseId);

    const cashier = await createUser(env.db, adminId, {
      login: 'cart-denied',
      password: 'cashier secure password',
      fullName: 'No Sale Permission',
      role: 'cashier',
      lang: 'ru',
    });
    const cashierCookie = await loginCookie('cart-denied', 'cashier secure password');
    expect((await fetch(`${baseUrl}/api/cart`, { headers: { Cookie: cashierCookie } })).status).toBe(403);
    setUserPermissions(env.db, adminId, cashier.id, { sell: 1 });

    const productId = addProduct(env.db, 'WEB-SALE', 'шт', 20_000);
    createPurchase(env.db, adminId, {
      warehouseId: env.warehouseId,
      date: '2026-11-13',
      lines: [{ productId, qty: '2', unitCost: 1_000_000 }],
    });
    const added = await fetch(`${baseUrl}/api/cart/lines`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, qty: '1' }),
    });
    expect(added.status).toBe(200);
    expect((await added.json() as { cart: { lines: Array<{ qty: number }> } }).cart.lines[0]).toMatchObject({ qty: 1000 });

    const quote = await fetch(`${baseUrl}/api/sales/quote`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(quote.status).toBe(200);
    expect((await quote.json() as { quote: { total: number } }).quote.total).toBe(2_000_000);
    const clientPrice = await fetch(`${baseUrl}/api/sales/quote`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitPrice: 1 }),
    });
    expect(clientPrice.status).toBe(400);

    const cashMethodId = (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
    const saleInput = {
      idempotencyKey: 'web-sale-once',
      payments: [{ methodId: cashMethodId, amount: 2_000_000, tendered: 2_000_000 }],
    };
    const saleResponse = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(saleInput),
    });
    expect(saleResponse.status).toBe(201);
    const sale = await saleResponse.json() as {
      sale: Record<string, unknown>;
      replayed: boolean;
    };
    expect(sale.sale).toMatchObject({ number: 'A-000001', total: 2_000_000, paidTotal: 2_000_000 });
    expect(sale.sale).not.toHaveProperty('cost_total');
    expect(sale.sale).not.toHaveProperty('profit');
    expect(sale.replayed).toBe(false);

    const replay = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(saleInput),
    });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ sale: { id: sale.sale.id }, replayed: true });
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
  });

  it('проверяет права и проводит оплату долга, прощение и кассовые операции через API', async () => {
    const adminCookie = await loginCookie();
    const productId = addProduct(env.db, 'API-DEBT', 'шт', 20_000);
    const customerId = addCustomer(env.db, 'API debt customer');
    createPurchase(env.db, adminId, {
      warehouseId: env.warehouseId,
      date: '2026-11-13',
      lines: [{ productId, qty: '2', unitCost: 1_000_000 }],
    });
    addCartLine(env.db, adminId, { productId, qty: '1' });
    const sale = createSale(env.db, adminId, 'ru', {
      customerId,
      idempotencyKey: 'api-debt-sale',
      payments: [],
    }).receipt.sale;

    expect((await fetch(`${baseUrl}/api/debts`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/cash`)).status).toBe(401);
    const cashier = await createUser(env.db, adminId, {
      login: 'debt-cashier',
      password: 'cashier secure password',
      fullName: 'Debt Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    const cashierCookie = await loginCookie('debt-cashier', 'cashier secure password');
    expect((await fetch(`${baseUrl}/api/debts`, { headers: { Cookie: cashierCookie } })).status).toBe(403);
    setUserPermissions(env.db, adminId, cashier.id, { debt_payment: 1, cash_in: 1, cash_out: 1 });

    const debtorsResponse = await fetch(`${baseUrl}/api/debts`, { headers: { Cookie: cashierCookie } });
    expect(debtorsResponse.status).toBe(200);
    expect(await debtorsResponse.json()).toMatchObject({
      debtors: [{ customerId, balance: sale.total, openSaleCount: 1 }],
    });
    const detailResponse = await fetch(`${baseUrl}/api/debts/${encodeURIComponent(customerId)}`, {
      headers: { Cookie: cashierCookie },
    });
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toMatchObject({
      customer: { id: customerId },
      sales: [{ id: sale.id, balance: sale.total }],
    });

    const cashMethodId = (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
    const debtPaymentInput = {
      customerId,
      methodId: cashMethodId,
      amount: 1_000_000,
      idempotencyKey: 'api-debt-payment',
    };
    const debtPayment = await fetch(`${baseUrl}/api/debts/payments`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(debtPaymentInput),
    });
    expect(debtPayment.status).toBe(201);
    const paymentResult = await debtPayment.json() as { payment: { id: string }; replayed: boolean };
    expect(paymentResult.replayed).toBe(false);
    const debtPaymentReplay = await fetch(`${baseUrl}/api/debts/payments`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(debtPaymentInput),
    });
    expect(debtPaymentReplay.status).toBe(200);
    expect(await debtPaymentReplay.json()).toMatchObject({
      payment: { id: paymentResult.payment.id },
      replayed: true,
    });

    const cashBeforeOperation = await fetch(`${baseUrl}/api/cash`, { headers: { Cookie: cashierCookie } });
    expect(cashBeforeOperation.status).toBe(200);
    expect((await cashBeforeOperation.json() as { balance: number }).balance).toBe(1_000_000);
    const cashOperationInput = {
      type: 'cash_in',
      amount: 500_000,
      reason: 'Opening funds',
      idempotencyKey: 'api-cash-in',
    };
    const cashOperation = await fetch(`${baseUrl}/api/cash/operations`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(cashOperationInput),
    });
    expect(cashOperation.status).toBe(201);
    const operationResult = await cashOperation.json() as { operation: { id: string } };
    const reversal = await fetch(`${baseUrl}/api/cash/operations/${encodeURIComponent(operationResult.operation.id)}/reverse`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Input error', idempotencyKey: 'api-cash-in-reversal' }),
    });
    expect(reversal.status).toBe(201);
    expect(await reversal.json()).toMatchObject({
      operation: { type: 'cash_out', reversesId: operationResult.operation.id },
      replayed: false,
    });
    const cashAfterReversal = await fetch(`${baseUrl}/api/cash`, { headers: { Cookie: cashierCookie } });
    expect((await cashAfterReversal.json() as { balance: number }).balance).toBe(1_000_000);

    const deniedExpense = await fetch(`${baseUrl}/api/cash/operations`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        amount: 100_000,
        reason: 'Denied expense',
        category: 'Office',
        idempotencyKey: 'api-denied-expense',
      }),
    });
    expect(deniedExpense.status).toBe(403);
    const deniedForgiveness = await fetch(`${baseUrl}/api/debts/forgiveness`, {
      method: 'POST',
      headers: { Cookie: cashierCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        reason: 'Not an administrator',
        items: [{ saleId: sale.id, amount: 250_000 }],
      }),
    });
    expect(deniedForgiveness.status).toBe(403);

    const forgiveness = await fetch(`${baseUrl}/api/debts/forgiveness`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        reason: 'Owner approved',
        items: [{ saleId: sale.id, amount: 250_000 }],
      }),
    });
    expect(forgiveness.status).toBe(201);
    expect(await forgiveness.json()).toMatchObject({
      forgiven: [{ saleId: sale.id, amount: 250_000, balanceAfter: 750_000 }],
    });
  });
});
