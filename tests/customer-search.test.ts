import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, setUserAccess } from '../src/modules/auth/service';
import {
  getCustomer,
  getReceiptDetails,
  listCustomerSales,
  listCustomers,
  searchReceipts,
} from '../src/modules/customers/service';
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
    login: 'customer-owner',
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
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  env.cleanup();
});

async function loginCookie(loginName: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

function seedSale(input: {
  userId: string;
  customerId: string | null;
  productId: string;
  number: string;
  createdAt: string;
  debt?: number;
  returned?: boolean;
}) {
  const { db, branchId } = env;
  const id = `sale-${input.number}`;
  const total = 100_000;
  const debt = input.debt ?? 0;
  db.prepare(
    `INSERT INTO sales
       (id, number, branch_id, user_id, customer_id, customer_name, subtotal, total, paid_total, debt_amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.number, branchId, input.userId, input.customerId, 'Walk-in', total, total, total - debt, debt, input.createdAt);
  db.prepare(
    `INSERT INTO sale_lines (id, sale_id, product_id, qty, base_price, unit_price, line_total)
     VALUES (?, ?, ?, 1000, ?, ?, ?)`,
  ).run(`line-${id}`, id, input.productId, total, total, total);
  const methodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
  if (total - debt > 0) {
    db.prepare(
      `INSERT INTO payments (id, purpose, sale_id, customer_id, method_id, amount, direction, user_id, created_at)
       VALUES (?, 'sale', ?, ?, ?, ?, 'in', ?, ?)`,
    ).run(`payment-${id}`, id, input.customerId, methodId, total - debt, input.userId, input.createdAt);
  }
  if (input.returned) {
    db.prepare(
      `INSERT INTO returns (id, number, sale_id, user_id, reason, total_refund, created_at)
       VALUES (?, ?, ?, ?, 'Тестовый возврат', 1000, ?)`,
    ).run(`return-${id}`, `R-${input.number}`, id, input.userId, input.createdAt);
  }
  if (debt > 0 && input.customerId) {
    db.prepare(
      `INSERT INTO debt_ledger (id, customer_id, sale_id, type, amount, user_id, created_at)
       VALUES (?, ?, ?, 'DEBT_ADD', ?, ?, ?)`,
    ).run(`debt-${id}`, input.customerId, id, debt, input.userId, input.createdAt);
  }
  return { id, methodId };
}

describe('client directory and receipt search', () => {
  it('paginates customer and receipt results with a fixed server-side limit', () => {
    for (let index = 0; index < 51; index += 1) {
      addCustomer(env.db, `Paging customer ${String(index).padStart(2, '0')}`);
      const number = `A-PAGE-${String(index).padStart(3, '0')}`;
      env.db.prepare(
        `INSERT INTO sales (id, number, branch_id, user_id, subtotal, total, paid_total, created_at)
         VALUES (?, ?, ?, ?, 100, 100, 100, '2026-11-16T10:00:00.000Z')`,
      ).run(`sale-${number}`, number, env.branchId, adminId);
    }

    const customersPage1 = listCustomers(env.db, { search: 'Paging customer', page: 1 });
    const customersPage2 = listCustomers(env.db, { search: 'Paging customer', page: 2 });
    expect(customersPage1.rows).toHaveLength(50);
    expect(customersPage1.hasMore).toBe(true);
    expect(customersPage2.rows).toHaveLength(1);
    expect(customersPage2.hasMore).toBe(false);

    const receiptsPage1 = searchReceipts(env.db, { search: 'A-PAGE-', page: 1 });
    const receiptsPage2 = searchReceipts(env.db, { search: 'A-PAGE-', page: 2 });
    expect(receiptsPage1.rows).toHaveLength(50);
    expect(receiptsPage1.hasMore).toBe(true);
    expect(receiptsPage2.rows).toHaveLength(1);
    expect(receiptsPage2.hasMore).toBe(false);
  });

  it('finds customer history and searches receipts with multiple filters', () => {
    const sellerId = (env.db.prepare('SELECT id FROM users WHERE id = ?').get(adminId) as { id: string }).id;
    const customerId = addCustomer(env.db, 'Ирина Покупатель');
    env.db.prepare('UPDATE customers SET phone = ?, note = ? WHERE id = ?')
      .run('998901234567', 'Тестовая заметка', customerId);
    const productId = addProduct(env.db, 'RECEIPT-SEARCH-1');
    const paidSale = seedSale({
      userId: sellerId,
      customerId,
      productId,
      number: 'A-RECEIPT-101',
      createdAt: '2026-11-15T10:00:00.000Z',
      returned: true,
    });
    const debtSale = seedSale({
      userId: sellerId,
      customerId,
      productId,
      number: 'A-RECEIPT-102',
      createdAt: '2026-11-16T10:00:00.000Z',
      debt: 50_000,
    });
    seedSale({
      userId: sellerId,
      customerId: null,
      productId,
      number: 'A-RECEIPT-103',
      createdAt: '2026-11-16T11:00:00.000Z',
    });

    expect(listCustomers(env.db, { search: '901234' }).rows).toMatchObject([
      { id: customerId, name: 'Ирина Покупатель', phone: '998901234567' },
    ]);
    expect(getCustomer(env.db, customerId)).toMatchObject({
      id: customerId, note: 'Тестовая заметка', balance: 50_000,
    });
    expect(listCustomerSales(env.db, customerId, 1).rows.map((row) => row.id))
      .toEqual([debtSale.id, paidSale.id]);
    expect(searchReceipts(env.db, { search: 'RECEIPT-SEARCH-1', returned: 'true' }).rows)
      .toMatchObject([{ id: paidSale.id, refunded: 1000 }]);
    expect(searchReceipts(env.db, {
      userId: sellerId,
      methodId: paidSale.methodId,
      status: 'debt',
      minTotal: '1000',
      maxTotal: '1000',
    }).rows).toMatchObject([{ id: debtSale.id, debtAmount: 50_000 }]);
    expect(searchReceipts(env.db, {
      search: 'A-RECEIPT-102', from: '2026-11-16', to: '2026-11-16',
    }).rows).toMatchObject([{ id: debtSale.id }]);
    const cardMethodId = (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'card'").get() as
      { id: string }).id;
    const debtPaymentId = `debt-payment-${debtSale.id}`;
    const debtLedgerId = `debt-payment-ledger-${debtSale.id}`;
    env.db.prepare(
      `INSERT INTO payments
       (id, purpose, customer_id, method_id, amount, direction, user_id, created_at)
       VALUES (?, 'debt_payment', ?, ?, 50000, 'in', ?, '2026-11-16T12:00:00.000Z')`,
    ).run(debtPaymentId, customerId, cardMethodId, sellerId);
    env.db.prepare(
      `INSERT INTO debt_ledger
       (id, customer_id, sale_id, type, amount, payment_id, method_id, user_id, created_at)
       VALUES (?, ?, ?, 'DEBT_PAY', -50000, ?, ?, ?, '2026-11-16T12:00:00.000Z')`,
    ).run(debtLedgerId, customerId, debtSale.id, debtPaymentId, cardMethodId, sellerId);
    env.db.prepare(
      `INSERT INTO debt_payment_allocations (id, payment_id, debt_ledger_id, sale_id, amount)
       VALUES (?, ?, ?, ?, 50000)`,
    ).run(`allocation-${debtSale.id}`, debtPaymentId, debtLedgerId, debtSale.id);
    expect(getCustomer(env.db, customerId)).toMatchObject({ balance: 0 });
    expect(searchReceipts(env.db, { search: 'A-RECEIPT-102', status: 'paid' }).rows)
      .toMatchObject([{ id: debtSale.id, debtAmount: 0, paidTotal: 100_000 }]);
    expect(searchReceipts(env.db, { search: 'A-RECEIPT-102', methodId: cardMethodId }).rows)
      .toMatchObject([{ id: debtSale.id }]);
    expect(getReceiptDetails(env.db, debtSale.id).payments).toHaveLength(2);
    expect(getReceiptDetails(env.db, paidSale.id)).toMatchObject({
      sale: { id: paidSale.id, customerId, customerPhone: '998901234567' },
      lines: [{ sku: 'RECEIPT-SEARCH-1' }],
      payments: [{ amount: 100_000 }],
      returns: [{ number: 'R-A-RECEIPT-101' }],
    });
    expect(() => searchReceipts(env.db, { from: '2026-02-30' }))
      .toThrowError(expect.objectContaining({ errorKey: 'receipts.invalid_date' }));
  });

  it('enforces separate client and receipt permissions and keeps legacy customer lookups minimal', async () => {
    const customerId = addCustomer(env.db, 'Private client');
    env.db.prepare('UPDATE customers SET phone = ?, note = ? WHERE id = ?')
      .run('998901112233', 'Private note', customerId);
    const productId = addProduct(env.db, 'PRIVATE-RECEIPT');
    seedSale({
      userId: adminId,
      customerId,
      productId,
      number: 'A-PRIVATE-1',
      createdAt: '2026-11-16T10:00:00.000Z',
    });
    const cashier = await createUser(env.db, adminId, {
      login: 'limited-viewer',
      password: 'viewer password',
      fullName: 'Viewer',
      role: 'cashier',
      lang: 'ru',
    });
    setUserAccess(env.db, adminId, cashier.id, {
      permissions: { view_customers: 1 },
      pagePermissions: { customers: 1, receiptSearch: 0 },
    });
    const cookie = await loginCookie('limited-viewer', 'viewer password');

    const clients = await fetch(`${baseUrl}/api/clients`, { headers: { Cookie: cookie } });
    expect(clients.status).toBe(200);
    expect((await clients.json()).rows).toMatchObject([{ id: customerId, phone: '998901112233' }]);
    const receiptDenied = await fetch(`${baseUrl}/api/receipt-search`, { headers: { Cookie: cookie } });
    expect(receiptDenied.status).toBe(403);
    const receiptDetailsDenied = await fetch(`${baseUrl}/api/receipt-search/sale-A-PRIVATE-1`, {
      headers: { Cookie: cookie },
    });
    expect(receiptDetailsDenied.status).toBe(403);
    const dropdown = await fetch(`${baseUrl}/api/references/customers`, { headers: { Cookie: cookie } });
    expect(await dropdown.json()).toEqual({
      rows: [{ id: customerId, name: 'Private client', active: 1 }],
    });

    setUserAccess(env.db, adminId, cashier.id, {
      permissions: { view_customers: 0, search_receipts: 1 },
      pagePermissions: { customers: 0, receiptSearch: 1 },
    });
    const clientsDenied = await fetch(`${baseUrl}/api/clients`, { headers: { Cookie: cookie } });
    expect(clientsDenied.status).toBe(403);
    const clientHistoryDenied = await fetch(`${baseUrl}/api/clients/${customerId}/sales`, {
      headers: { Cookie: cookie },
    });
    expect(clientHistoryDenied.status).toBe(403);
    const options = await fetch(`${baseUrl}/api/receipt-search/options`, { headers: { Cookie: cookie } });
    expect(options.status).toBe(200);
    const receipts = await fetch(`${baseUrl}/api/receipt-search?search=A-PRIVATE-1`, {
      headers: { Cookie: cookie },
    });
    expect(receipts.status).toBe(200);
    const rows = (await receipts.json()).rows;
    expect(rows).toMatchObject([{ number: 'A-PRIVATE-1' }]);
    const details = await fetch(`${baseUrl}/api/receipt-search/${encodeURIComponent(rows[0].id)}`, {
      headers: { Cookie: cookie },
    });
    expect(details.status).toBe(200);
  });
});
