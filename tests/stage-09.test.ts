import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addUser, makeEnv, type TestEnv } from './helpers';
import { getReport, REPORT_FILTERS, REPORT_TYPES } from '../src/modules/reports/service';
import { createBackup, getBackupStatus, restoreBackup, verifyDatabaseFile } from '../src/modules/backup/service';
import { join } from 'node:path';
import { addCartLine } from '../src/modules/carts/service';
import { createPurchase } from '../src/modules/purchases/service';
import { createReturn } from '../src/modules/returns/service';
import { createSale } from '../src/modules/sales/service';
import { addCustomer, addProduct } from './helpers';

let env: TestEnv;
let adminId: string;

beforeEach(() => {
  env = makeEnv();
  adminId = addUser(env.db, 'stage9-admin', 'admin');
});

afterEach(() => env.cleanup());

describe('этап 9: отчёты и резервные копии', () => {
  it('выполняет все типы отчётов с периодными и складскими фильтрами', () => {
    for (const type of REPORT_TYPES) {
      const filters: Record<string, string> = { type };
      for (const filter of REPORT_FILTERS[type]) {
        filters[filter] = filter === 'from' ? '2026-01-01' :
          filter === 'to' ? '2027-01-01' :
            filter === 'warehouseId' ? env.warehouseId :
              filter === 'productId' ? 'stage9-product' : adminId;
      }
      const report = getReport(env.db, adminId, {
        ...filters,
      }, 'ru');
      expect(report.type).toBe(type);
      expect(Array.isArray(report.columns)).toBe(true);
      expect(Array.isArray(report.rows)).toBe(true);
      expect(report.truncated).toBe(false);
    }
  });

  it('считает продажи и прибыль из продаж и возвратов, скрывает себестоимость без view_cost', () => {
    const categoryId = 'stage9-category';
    env.db.prepare(
      `INSERT INTO categories (id, name_ru, name_uz, created_at, updated_at)
       VALUES (?, 'Категория', 'Toifa', ?, ?)`,
    ).run(categoryId, new Date().toISOString(), new Date().toISOString());
    const productId = addProduct(env.db, 'STAGE9-REPORT');
    env.db.prepare('UPDATE products SET category_id = ?, min_stock = ? WHERE id = ?')
      .run(categoryId, 10_000, productId);
    createPurchase(env.db, adminId, {
      warehouseId: env.warehouseId,
      date: '2026-11-13',
      lines: [{ productId, qty: '5', unitCost: 100_000 }],
    });
    const customerId = addCustomer(env.db);
    addCartLine(env.db, adminId, { productId, qty: '1' });
    const sale = createSale(env.db, adminId, 'ru', {
      idempotencyKey: 'stage9-report-sale',
      customerId,
      payments: [],
    });
    const line = env.db.prepare('SELECT id FROM sale_lines WHERE sale_id = ?')
      .get(sale.receipt.sale.id) as { id: string };
    createReturn(env.db, adminId, {
      saleId: sale.receipt.sale.id,
      reason: 'Проверка отчёта',
      idempotencyKey: 'stage9-report-return',
      lines: [{ saleLineId: line.id, qty: '0.5' }],
      payments: [],
    });

    const profit = getReport(env.db, adminId, { type: 'profit_by_sale' }, 'ru');
    expect(profit.rows[0]).toMatchObject({
      sales: 1_500_000,
      returns: 750_000,
      netSales: 750_000,
      cost: 50_000,
      profit: 700_000,
    });
    const productSales = getReport(env.db, adminId, { type: 'sales_by_product' }, 'ru');
    expect(productSales.rows[0]).toMatchObject({
      qty: 1000,
      sales: 1_500_000,
      returns: 750_000,
      netSales: 750_000,
    });
    const cashierSummary = getReport(env.db, adminId, { type: 'cashier_summary', productId }, 'ru');
    expect(cashierSummary.rows[0]).toMatchObject({ salesCount: 1, returns: 1, returnQty: 500 });
    expect(() => getReport(env.db, adminId, {
      type: 'sales_by_day',
      warehouseId: env.warehouseId,
    }, 'ru')).toThrowError(expect.objectContaining({ errorKey: 'report.filter_not_supported' }));

    const cashierId = addUser(env.db, 'stage9-report-cashier');
    env.db.prepare(
      'INSERT INTO user_permissions (user_id, permission, value) VALUES (?, ?, 1)',
    ).run(cashierId, 'reports');
    env.db.prepare(
      `INSERT INTO audit_log (id, at, user_id, action, entity, before_json, after_json)
       VALUES ('stage9-audit', ?, ?, 'test', 'test', NULL, ?)`,
    ).run(new Date().toISOString(), adminId, '{"cost":100,"safe":1,"nested":{"profit":5,"safe":2}}');

    const cashierStock = getReport(env.db, cashierId, { type: 'stock_valuation' }, 'ru');
    expect(cashierStock.columns).not.toContain('unitCost');
    expect(cashierStock.columns).not.toContain('value');
    expect(cashierStock.rows[0]).not.toHaveProperty('unitCost');
    expect(cashierStock.rows[0]).not.toHaveProperty('value');
    const cashierMovements = getReport(env.db, cashierId, { type: 'movements' }, 'ru');
    expect(cashierMovements.rows.every((row) => !('unitCost' in row))).toBe(true);
    const cashierReturns = getReport(env.db, cashierId, { type: 'returns' }, 'ru');
    expect(cashierReturns.rows[0]).not.toHaveProperty('cost');
    expect(getReport(env.db, cashierId, { type: 'audit' }, 'ru').rows
      .find((row) => row.action === 'test')?.after).toBe('{"safe":1,"nested":{"safe":2}}');
    expect(() => getReport(env.db, cashierId, { type: 'profit_by_sale' }, 'ru'))
      .toThrowError(expect.objectContaining({ errorKey: 'auth.permission_denied' }));
  });

  it('делает проверенную копию через SQLite Backup API и восстанавливает её только в новый файл', async () => {
    const backupDirectory = join(env.dir, 'backups');
    const backup = await createBackup(env.db, backupDirectory, adminId, new Date('2026-11-13T10:00:00.000Z'));

    expect(backup.verification).toEqual({ integrity: 'ok', discrepancies: [] });
    expect(verifyDatabaseFile(backup.path)).toEqual({ integrity: 'ok', discrepancies: [] });
    expect(await getBackupStatus(backupDirectory)).toMatchObject({
      configured: true,
      lastRun: { status: 'success', file: backup.file, integrity: 'ok', discrepancies: 0 },
      backups: [{ file: backup.file }],
    });

    const restoredPath = join(env.dir, 'restored.db');
    expect(await restoreBackup(backup.path, restoredPath, env.db.name))
      .toEqual({ integrity: 'ok', discrepancies: [] });
    await expect(restoreBackup(backup.path, env.db.name, env.db.name))
      .rejects.toThrow('backup.restore_target_must_be_separate');
    await expect(restoreBackup(env.db.name, join(env.dir, 'working-copy.sqlite'), env.db.name))
      .rejects.toThrow('backup.restore_source_must_be_backup');
  });

  it('отклоняет резервную копию при расхождении кэша с журналом и сохраняет ошибку проверки', async () => {
    const backupDirectory = join(env.dir, 'invalid-backups');
    const productId = addProduct(env.db, 'STAGE9-CACHE-MISMATCH');
    env.db.prepare(
      'INSERT INTO stock_cache (product_id, warehouse_id, qty, reserved) VALUES (?, ?, 1, 0)',
    ).run(productId, env.warehouseId);

    await expect(createBackup(env.db, backupDirectory, adminId))
      .rejects.toThrow('backup.stock_reconciliation_failed');
    expect(await getBackupStatus(backupDirectory)).toMatchObject({
      lastRun: { status: 'error', file: null },
      backups: [],
    });
  });
});
