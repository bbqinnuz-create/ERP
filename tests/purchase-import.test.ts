import ExcelJS from 'exceljs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, login, setUserPermissions } from '../src/modules/auth/service';
import {
  buildPurchaseImportTemplate,
  buildPurchaseProductImportTemplate,
  previewPurchaseImport,
} from '../src/modules/purchases/import';
import { saveReference, setReferenceActive } from '../src/modules/references/service';
import { createWebServer } from '../src/web/app-server';
import { addProduct, addUser, makeEnv, type TestEnv } from './helpers';

describe('purchase CSV import preview', () => {
  let env: TestEnv | undefined;
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
      server = undefined;
    }
    env?.cleanup();
    env = undefined;
  });

  it('previews valid semicolon CSV and reports invalid rows without writing data', () => {
    env = makeEnv();
    const productId = addProduct(env.db, 'SKU-1', 'м');
    addProduct(env.db, 'SKU-2');
    const report = previewPurchaseImport(env.db, [
      'sku;qty;unit_cost_sum',
      'SKU-1;2,5;12,50',
      'UNKNOWN;1;10',
      'SKU-2;0;not-money',
    ].join('\r\n'));

    expect(report.counts).toEqual({ ready: 1, error: 2 });
    expect(report.rows).toEqual([
      {
        line: 2,
        sku: 'SKU-1',
        action: 'ready',
        errors: [],
        productId,
        productName: 'Товар SKU-1',
        unit: 'м',
        qty: '2.5',
        unitCost: 1250,
      },
      {
        line: 3,
        sku: 'UNKNOWN',
        action: 'error',
        errors: ['purchase_import.product_not_found'],
        qty: '1',
        unitCost: 1000,
      },
      {
        line: 4,
        sku: 'SKU-2',
        action: 'error',
        errors: ['purchase_import.invalid_qty', 'purchase_import.invalid_unit_cost'],
        productId: expect.any(String),
        productName: 'Товар SKU-2',
        unit: 'm',
      },
    ]);
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM purchases').get()).toEqual({ count: 0 });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM batches').get()).toEqual({ count: 0 });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM stock_movements').get()).toEqual({ count: 0 });
  });

  it('accepts Russian template headers while retaining the legacy headers', () => {
    env = makeEnv();
    addProduct(env.db, 'SKU-RU');
    const report = previewPurchaseImport(env.db, [
      'Артикул;Количество;Закупочная цена, сум',
      'SKU-RU;2,5;12,50',
    ].join('\r\n'));
    expect(report.counts).toEqual({ ready: 1, error: 0 });
    expect(report.rows[0]).toMatchObject({
      sku: 'SKU-RU',
      qty: '2.5',
      unitCost: 1250,
      action: 'ready',
    });

    const legacy = previewPurchaseImport(env.db, 'sku,qty,unit_cost_sum\nSKU-RU,1,10');
    expect(legacy.counts).toEqual({ ready: 1, error: 0 });
  });

  it('builds an XLSX template with Russian columns and usage instructions', async () => {
    const buffer = await buildPurchaseImportTemplate();
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(arrayBuffer).set(buffer);
    await workbook.xlsx.load(arrayBuffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Приход', 'Инструкция']);
    const purchases = workbook.getWorksheet('Приход')!;
    expect(purchases.getRow(1).values).toEqual([
      undefined, 'Артикул', 'Количество', 'Закупочная цена, сум',
    ]);
    expect(purchases.getRow(2).values).toContain('ЗАМЕНИТЕ_АРТИКУЛ');
    const instructions = workbook.getWorksheet('Инструкция')!.getSheetValues().flat().join(' ');
    expect(instructions).toContain('CSV UTF-8');
    expect(instructions).toContain('3 знаков');
    expect(instructions).toContain('2 знаков');
  });

  it('builds the product-filled template for all products or one category', async () => {
    env = makeEnv();
    const userId = addUser(env.db, 'owner', 'admin');
    const categoryA = saveReference(env.db, userId, 'categories', { name_ru: 'Сталь' });
    const categoryB = saveReference(env.db, userId, 'categories', { name_ru: 'Крепёж' });
    const steelId = addProduct(env.db, 'STEEL');
    const boltId = addProduct(env.db, 'BOLT');
    env.db.prepare('UPDATE products SET category_id = ? WHERE id = ?').run(categoryA.id, steelId);
    env.db.prepare('UPDATE products SET category_id = ? WHERE id = ?').run(categoryB.id, boltId);

    const buffer = await buildPurchaseProductImportTemplate(env.db, String(categoryA.id));
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(arrayBuffer).set(buffer);
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet('Товары')!;
    expect(sheet.getRow(1).values).toEqual([
      undefined, 'Название', 'Артикул', 'Единица измерения', 'Цена продажи, сум',
      'Статус', 'Количество', 'Закупочная цена, сум',
    ]);
    expect(sheet.getColumn(2).values).toContain('STEEL');
    expect(sheet.getColumn(2).values).not.toContain('BOLT');

    const allBuffer = await buildPurchaseProductImportTemplate(env.db, null);
    const allWorkbook = new ExcelJS.Workbook();
    const allArrayBuffer = new ArrayBuffer(allBuffer.byteLength);
    new Uint8Array(allArrayBuffer).set(allBuffer);
    await allWorkbook.xlsx.load(allArrayBuffer);
    expect(allWorkbook.getWorksheet('Товары')!.getColumn(2).values).toContain('BOLT');
  });

  it('previews sale-price updates only when selected and requires a permission-ready price column', () => {
    env = makeEnv();
    const productId = addProduct(env.db, 'SKU-PRICE', 'm', 10_000);
    const csv = [
      'Название;Артикул;Единица измерения;Цена продажи, сум;Статус;Количество;Закупочная цена, сум',
      'Товар SKU-PRICE;SKU-PRICE;m;125,50;Активен;2.5;50',
    ].join('\n');

    const preserve = previewPurchaseImport(env.db, csv);
    expect(preserve.updateSalePrice).toBe(false);
    expect(preserve.rows[0]).toMatchObject({ action: 'ready', productId });

    const update = previewPurchaseImport(env.db, csv, true);
    expect(update.updateSalePrice).toBe(true);
    expect(update.rows[0]).toMatchObject({
      action: 'ready',
      productId,
      currentBasePrice: 1_000_000,
      basePrice: 12_550,
    });
    expect(() => previewPurchaseImport(
      env!.db,
      'sku,qty,unit_cost_sum\nSKU-PRICE,1,1',
      true,
    )).toThrow('purchase_import.sale_price_column_required');
  });

  it('rejects duplicate SKUs, identifies inactive products, and validates file structure', () => {
    env = makeEnv();
    const userId = addUser(env.db, 'owner', 'admin');
    const inactiveId = addProduct(env.db, 'INACTIVE');
    setReferenceActive(env.db, userId, 'products', inactiveId, false);

    const report = previewPurchaseImport(env.db, [
      'sku,qty,unit_cost_sum',
      'DUPLICATE,1,1',
      'DUPLICATE,2,2',
      'INACTIVE,1,1',
    ].join('\n'));
    expect(report.counts).toEqual({ ready: 0, error: 3 });
    expect(report.rows[0]!.errors).toContain('purchase_import.duplicate_sku');
    expect(report.rows[1]!.errors).toContain('purchase_import.duplicate_sku');
    expect(report.rows[2]!.errors).toContain('purchase_import.product_inactive');
    expect(() => previewPurchaseImport(env!.db, 'sku,qty\nA,1')).toThrow('purchase_import.invalid_headers');
    expect(() => previewPurchaseImport(env!.db, 'sku,qty,unit_cost_sum\n"A,1,1')).toThrow('purchase_import.invalid_csv');
  });

  it('requires purchase permission for the preview API', async () => {
    env = makeEnv();
    const productId = addProduct(env.db, 'SKU-1');
    const admin = await bootstrapAdmin(env.db, {
      login: 'owner',
      password: 'correct horse battery',
      fullName: 'Owner',
      role: 'admin',
      lang: 'ru',
    });
    const cashier = await createUser(env.db, admin.id, {
      login: 'cashier',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    setUserPermissions(env.db, admin.id, cashier.id, { purchase: 1 });

    server = createWebServer(env.db);
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const csv = 'sku,qty,unit_cost_sum\nSKU-1,2.5,12.50';

    expect((await fetch(`${baseUrl}/api/purchases/import/template`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/purchases/import/products-template`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/purchases/import/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    })).status).toBe(401);

    const adminSession = await login(env.db, 'owner', 'correct horse battery');
    const preview = await fetch(`${baseUrl}/api/purchases/import/preview`, {
      method: 'POST',
      headers: { Cookie: `kassa_session=${adminSession.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    expect(preview.status).toBe(200);
    expect((await preview.json()).counts).toEqual({ ready: 1, error: 0 });
    const template = await fetch(`${baseUrl}/api/purchases/import/template`, {
      headers: { Cookie: `kassa_session=${adminSession.token}` },
    });
    expect(template.status).toBe(200);
    expect(template.headers.get('content-type')).toContain('spreadsheetml.sheet');
    const productsTemplate = await fetch(`${baseUrl}/api/purchases/import/products-template`, {
      headers: { Cookie: `kassa_session=${adminSession.token}` },
    });
    expect(productsTemplate.status).toBe(200);
    const filteredTemplate = await fetch(
      `${baseUrl}/api/purchases/import/products-template?categoryId=missing`,
      { headers: { Cookie: `kassa_session=${adminSession.token}` } },
    );
    expect(filteredTemplate.status).toBe(400);
    const updatedPurchase = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { Cookie: `kassa_session=${adminSession.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: env.warehouseId,
        date: '2026-11-13',
        lines: [{ productId, qty: '1', unitCost: 100 }],
        productPriceUpdates: [{ productId, basePrice: 2000, expectedBasePrice: 1500000 }],
      }),
    });
    expect(updatedPurchase.status).toBe(201);
    expect(env.db.prepare('SELECT base_price FROM products WHERE id = ?').get(productId))
      .toEqual({ base_price: 2000 });

    const cashierSession = await login(env.db, 'cashier', 'cashier password');
    const cashierPreview = await fetch(`${baseUrl}/api/purchases/import/preview`, {
      method: 'POST',
      headers: { Cookie: `kassa_session=${cashierSession.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    expect(cashierPreview.status).toBe(200);
    const priceDenied = await fetch(`${baseUrl}/api/purchases/import/preview`, {
      method: 'POST',
      headers: { Cookie: `kassa_session=${cashierSession.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv: 'sku,qty,unit_cost_sum,base_price_sum\nSKU-1,2.5,12.50,20',
        updateSalePrice: true,
      }),
    });
    expect(priceDenied.status).toBe(403);
    const purchasePriceDenied = await fetch(`${baseUrl}/api/purchases`, {
      method: 'POST',
      headers: { Cookie: `kassa_session=${cashierSession.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: env.warehouseId,
        date: '2026-11-13',
        lines: [{ productId, qty: '1', unitCost: 100 }],
        productPriceUpdates: [{ productId, basePrice: 2000, expectedBasePrice: 1500000 }],
      }),
    });
    expect(purchasePriceDenied.status).toBe(403);
    const templateDenied = await fetch(`${baseUrl}/api/purchases/import/template`, {
      headers: { Cookie: `kassa_session=${cashierSession.token}` },
    });
    expect(templateDenied.status).toBe(200);
    const productsTemplateDenied = await fetch(`${baseUrl}/api/purchases/import/products-template`, {
      headers: { Cookie: `kassa_session=${cashierSession.token}` },
    });
    expect(productsTemplateDenied.status).toBe(200);
  });
});
