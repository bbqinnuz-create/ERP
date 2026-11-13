import ExcelJS from 'exceljs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapAdmin, createUser, login, setUserPermissions } from '../src/modules/auth/service';
import {
  buildProductImportTemplate,
  commitProductImport,
  previewProductImport,
} from '../src/modules/products/import';
import { saveReference } from '../src/modules/references/service';
import { createWebServer } from '../src/web/app-server';
import { addProduct, addUser, makeEnv, type TestEnv } from './helpers';
import { setReferenceActive } from '../src/modules/references/service';

const HEADER = 'sku,name_ru,name_uz,unit,price_sum,category,barcode,min_stock,attributes';

describe('product CSV import', () => {
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

  it('validates semicolon CSV, extra columns, and physical line numbers', () => {
    env = makeEnv();
    const text = [
      'sku;name_ru;name_uz;unit;price_sum;category;barcode;min_stock;attributes',
      'SKU-1;"Первая',
      'строка";;шт;12,50;;;;',
      'SKU-2;Товар;Tovar;шт;10;;;;;лишняя ячейка',
    ].join('\r\n');

    const result = previewProductImport(env.db, text, 'skip');

    expect(result.rows).toEqual([
      { line: 2, sku: 'SKU-1', action: 'create', errors: [] },
      { line: 4, sku: 'SKU-2', action: 'error', errors: ['product_import.extra_columns'] },
    ]);
    expect(result.counts).toEqual({ create: 1, update: 0, skip: 0, error: 1 });
  });

  it('creates and updates only product-card fields and preserves blank update cells', () => {
    env = makeEnv();
    const userId = addUser(env.db);
    const existingId = addProduct(env.db, 'EXISTING', 'шт', 500);
    const category = saveReference(env.db, userId, 'categories', { name_ru: 'Категория' });
    const text = [
      HEADER,
      'EXISTING,,,,200.00,,,,',
      'NEW-1,Новый товар,Yangi tovar,шт,120.50,Категория,90001,1.25,"{""color"":""red""}"',
    ].join('\n');

    const result = commitProductImport(env.db, userId, text, 'update');

    expect(result.counts).toEqual({ create: 1, update: 1, skip: 0, error: 0 });
    const existing = env.db.prepare('SELECT name_ru, base_price FROM products WHERE id = ?').get(existingId) as
      { name_ru: string; base_price: number };
    expect(existing).toEqual({ name_ru: 'Товар EXISTING', base_price: 20_000 });
    const created = env.db.prepare('SELECT * FROM products WHERE sku = ?').get('NEW-1') as
      { name_ru: string; name_uz: string; category_id: string; base_price: number; barcode: string; min_stock: number; attributes: string };
    expect(created).toMatchObject({
      name_ru: 'Новый товар',
      name_uz: 'Yangi tovar',
      category_id: category.id,
      base_price: 12_050,
      barcode: '90001',
      min_stock: 1_250,
      attributes: '{"color":"red"}',
    });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM stock_movements').get()).toEqual({ count: 0 });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM batches').get()).toEqual({ count: 0 });
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action IN ('products.create', 'products.update')").get())
      .toEqual({ count: 2 });
  });

  it('creates missing categories once, reports them in preview, and uses the selected language', () => {
    env = makeEnv();
    const userId = addUser(env.db);
    const text = [
      HEADER,
      'STEEL-1,Сталь 12,,м,100,Металлопрокат,,,',
      'STEEL-2,Сталь 14,,м,120,Металлопрокат,,,',
    ].join('\n');

    const disabled = previewProductImport(env.db, text, 'skip');
    expect(disabled.counts).toEqual({ create: 0, update: 0, skip: 0, error: 2 });
    expect(disabled.categoriesToCreate).toEqual([]);

    const preview = previewProductImport(env.db, text, 'skip', {
      createMissingCategories: true,
      lang: 'ru',
    });
    expect(preview.counts.create).toBe(2);
    expect(preview.categoriesToCreate).toEqual(['Металлопрокат']);
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM categories').get()).toEqual({ count: 0 });

    const result = commitProductImport(env.db, userId, text, 'skip', {
      createMissingCategories: true,
      lang: 'ru',
    });
    expect(result.categoriesToCreate).toEqual(['Металлопрокат']);
    const category = env.db.prepare('SELECT id, name_ru, name_uz FROM categories WHERE name_ru = ?')
      .get('Металлопрокат') as { id: string; name_ru: string; name_uz: string | null };
    expect(category).toMatchObject({ name_ru: 'Металлопрокат', name_uz: null });
    expect(env.db.prepare('SELECT COUNT(DISTINCT category_id) AS count FROM products').get())
      .toEqual({ count: 1 });
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'categories' AND action = 'categories.create'").get())
      .toEqual({ count: 1 });

    const uzbekText = `${HEADER}\nCONCRETE-1,Beton,,m,100,Beton,,,`;
    commitProductImport(env.db, userId, uzbekText, 'skip', {
      createMissingCategories: true,
      lang: 'uz',
    });
    expect(env.db.prepare('SELECT name_ru, name_uz FROM categories WHERE name_uz = ?')
      .get('Beton')).toEqual({ name_ru: 'Beton', name_uz: 'Beton' });
  });

  it('does not recreate inactive categories and rolls back category creation on failure', () => {
    env = makeEnv();
    const userId = addUser(env.db);
    const inactive = saveReference(env.db, userId, 'categories', { name_ru: 'Архив' });
    setReferenceActive(env.db, userId, 'categories', String(inactive.id), false);
    const inactivePreview = previewProductImport(
      env.db,
      `${HEADER}\nARCHIVE-1,Архивный товар,,шт,10,Архив,,,`,
      'skip',
      { createMissingCategories: true, lang: 'ru' },
    );
    expect(inactivePreview.rows[0]!.errors).toContain('product_import.category_inactive');

    env.db.exec(`
      CREATE TRIGGER reject_category_import
      BEFORE INSERT ON products
      WHEN NEW.sku = 'FAIL-CATEGORY'
      BEGIN
        SELECT RAISE(ABORT, 'test failure');
      END;
    `);
    const failingCsv = `${HEADER}\nFAIL-CATEGORY,Tовар,,шт,10,Новая категория,,,`;
    const categoryAuditCount = env.db.prepare(
      "SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'categories' AND action = 'categories.create'",
    ).get();
    expect(() => commitProductImport(env!.db, userId, failingCsv, 'skip', {
      createMissingCategories: true,
      lang: 'ru',
    })).toThrow('test failure');
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM categories WHERE name_ru = ?').get('Новая категория'))
      .toEqual({ count: 0 });
    expect(env.db.prepare(
      "SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'categories' AND action = 'categories.create'",
    ).get()).toEqual(categoryAuditCount);
  });

  it('rolls back every row and audit entry when a product save fails', () => {
    env = makeEnv();
    const userId = addUser(env.db);
    env.db.exec(`
      CREATE TRIGGER reject_test_import
      BEFORE INSERT ON products
      WHEN NEW.sku = 'FAIL'
      BEGIN
        SELECT RAISE(ABORT, 'test failure');
      END;
    `);
    const text = [
      HEADER,
      'OK,First,,шт,10,,,,',
      'FAIL,Second,,шт,10,,,,',
    ].join('\n');

    expect(() => commitProductImport(env!.db, userId, text, 'skip')).toThrow('test failure');
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM products WHERE sku IN ('OK', 'FAIL')").get())
      .toEqual({ count: 0 });
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'products'").get())
      .toEqual({ count: 0 });
  });

  it('builds localized XLSX templates with stable CSV headers and an armature example', async () => {
    for (const lang of ['ru', 'uz'] as const) {
      const buffer = await buildProductImportTemplate(lang);
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(arrayBuffer).set(buffer);
      await workbook.xlsx.load(arrayBuffer);

      const productsName = lang === 'ru' ? 'Товары' : 'Tovarlar';
      const instructionsName = lang === 'ru' ? 'Инструкция' : 'Yo‘riqnoma';
      expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([productsName, instructionsName]);
      const products = workbook.getWorksheet(productsName)!;
      expect(products.getRow(1).values).toEqual([
        undefined, 'sku', 'name_ru', 'name_uz', 'unit', 'price_sum', 'category', 'barcode', 'min_stock', 'attributes',
      ]);
      expect(products.getRow(2).values).toContain('Арматура 12 мм');
      expect(products.getRow(2).values).toContain('12 mm armatura');
      expect(products.getRow(2).getCell(1).value).toBe('ARM-12');
      const instructionValues = workbook.getWorksheet(instructionsName)!.getSheetValues().flat().join(' ');
      expect(instructionValues).toContain(lang === 'ru' ? 'Краткое объяснение' : 'Qisqa izoh');
      expect(instructionValues).toContain(lang === 'ru' ? 'Перед импортом' : 'Importdan oldin');
    }
  });

  it('protects template, preview, and commit APIs behind a session and import permissions', async () => {
    env = makeEnv();
    const admin = await bootstrapAdmin(env.db, {
      login: 'owner',
      password: 'correct horse battery',
      fullName: 'Owner',
      role: 'admin',
      lang: 'ru',
    });
    server = createWebServer(env.db);
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    expect((await fetch(`${baseUrl}/api/products/import/template`)).status).toBe(401);
    const session = await login(env.db, 'owner', 'correct horse battery');
    const cookie = `kassa_session=${session.token}`;
    const template = await fetch(`${baseUrl}/api/products/import/template`, { headers: { Cookie: cookie } });
    expect(template.status).toBe(200);
    expect(template.headers.get('content-type')).toContain('spreadsheetml.sheet');
    const localizedTemplate = await fetch(`${baseUrl}/api/products/import/template?lang=uz`, {
      headers: { Cookie: cookie },
    });
    const localizedWorkbook = new ExcelJS.Workbook();
    const localizedData = await localizedTemplate.arrayBuffer();
    await localizedWorkbook.xlsx.load(localizedData);
    expect(localizedWorkbook.worksheets.map((sheet) => sheet.name)).toEqual(['Tovarlar', 'Yo‘riqnoma']);
    expect((await fetch(`${baseUrl}/api/products/import/template?lang=fr`, {
      headers: { Cookie: cookie },
    })).status).toBe(400);

    const csv = `${HEADER}\nHTTP-1,HTTP product,,шт,10,Hardware,,,`;
    const importOptions = { lang: 'ru', createMissingCategories: true };
    const preview = await fetch(`${baseUrl}/api/products/import/preview`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, mode: 'skip', ...importOptions }),
    });
    expect(preview.status).toBe(200);
    const previewReport = await preview.json();
    expect(previewReport.counts).toEqual({ create: 1, update: 0, skip: 0, error: 0 });
    expect(previewReport.categoriesToCreate).toEqual(['Hardware']);
    const commit = await fetch(`${baseUrl}/api/products/import/commit`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, mode: 'skip', ...importOptions }),
    });
    expect(commit.status).toBe(200);
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM products WHERE sku = ?').get('HTTP-1'))
      .toEqual({ count: 1 });
    expect(env.db.prepare('SELECT COUNT(*) AS count FROM categories WHERE name_ru = ?').get('Hardware'))
      .toEqual({ count: 1 });

    const cashier = await createUser(env.db, admin.id, {
      login: 'cashier',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    setUserPermissions(env.db, admin.id, cashier.id, { settings: 1 });
    const cashierSession = await login(env.db, 'cashier', 'cashier password');
    const denied = await fetch(`${baseUrl}/api/products/import/template`, {
      headers: { Cookie: `kassa_session=${cashierSession.token}` },
    });
    expect(denied.status).toBe(403);
  });
});
