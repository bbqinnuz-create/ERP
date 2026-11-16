import { afterEach, describe, expect, it, vi } from 'vitest';
import iconv from 'iconv-lite';
import { uuidv7 } from '../src/core/uuid';
import { PrintOutcomeUncertainError, type PrintDriver } from '../src/modules/print/driver';
import { renderReceipt } from '../src/modules/print/receipt';
import {
  createCopyJob,
  listPrintJobs,
  processNextPrintJob,
  recoverInterruptedPrintJobs,
} from '../src/modules/print/service';
import { addCartLine } from '../src/modules/carts/service';
import { createPurchase } from '../src/modules/purchases/service';
import { createSale } from '../src/modules/sales/service';
import { translateReceipt } from '../src/modules/i18n/receipt';
import { addProduct, addUser, makeEnv } from './helpers';

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

function makeSale() {
  const env = makeEnv();
  cleanups.push(env.cleanup);
  const ownerId = addUser(env.db, 'print-owner', 'admin');
  const productId = addProduct(env.db, 'PRINT-1', 'шт');
  createPurchase(env.db, ownerId, {
    warehouseId: env.warehouseId,
    date: '2026-11-13',
    lines: [{ productId, qty: '1', unitCost: 1_000_000 }],
  });
  addCartLine(env.db, ownerId, { productId, qty: '1' });
  const cashMethodId = (env.db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
  const result = createSale(env.db, ownerId, 'ru', {
    idempotencyKey: `print-${uuidv7()}`,
    payments: [{ methodId: cashMethodId, amount: 1_500_000 }],
    receiptLang: 'uz',
  });
  const job = env.db.prepare('SELECT id FROM print_jobs WHERE doc_id = ?').get(result.receipt.sale.id) as { id: string };
  return { ...env, ownerId, saleId: result.receipt.sale.id, jobId: job.id };
}

describe('print queue and receipts', () => {
  it('creates a separate language-specific copy without changing the sale', () => {
    const env = makeSale();
    const copy = createCopyJob(env.db, env.ownerId, true, env.jobId, { lang: 'ru' });
    const job = env.db.prepare('SELECT kind, lang, doc_id, status FROM print_jobs WHERE id = ?').get(copy.id) as
      { kind: string; lang: string; doc_id: string; status: string };
    expect(job).toEqual({ kind: 'copy', lang: 'ru', doc_id: env.saleId, status: 'pending' });
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM audit_log WHERE action = ?').get('print.copy.create') as
      { count: number }).count).toBe(1);
  });

  it('uses the receipt snapshot for copies even if catalog names change later', async () => {
    const env = makeSale();
    const productId = (env.db.prepare('SELECT product_id AS id FROM sale_lines WHERE sale_id = ?')
      .get(env.saleId) as { id: string }).id;
    env.db.prepare('UPDATE products SET name_ru = ?, name_uz = ? WHERE id = ?')
      .run('Новое имя', 'Yangi nom', productId);
    env.db.prepare("UPDATE print_jobs SET status = 'printed' WHERE id = ?").run(env.jobId);
    const copy = createCopyJob(env.db, env.ownerId, true, env.jobId, { lang: 'uz' });
    const copyData: Array<{ name: string }> = [];
    await processNextPrintJob(env.db, {
      print: async (receipt) => { copyData.push(receipt.lines[0] ?? { name: '' }); },
    });
    expect(copyData[0]?.name).toBe('Товар PRINT-1');
    expect((env.db.prepare('SELECT snapshot_json FROM print_jobs WHERE id = ?').get(copy.id) as
      { snapshot_json: string | null }).snapshot_json).not.toBeNull();
  });

  it('requires explicit operator confirmation before copying an uncertain job', () => {
    const env = makeSale();
    env.db.prepare("UPDATE print_jobs SET status = 'uncertain' WHERE id = ?").run(env.jobId);
    expect(() => createCopyJob(env.db, env.ownerId, true, env.jobId, { lang: 'uz' }))
      .toThrowError(expect.objectContaining({ errorKey: 'print.confirm_uncertain' }));
    expect(() => createCopyJob(env.db, env.ownerId, true, env.jobId, {
      lang: 'uz',
      confirmUncertain: true,
    })).not.toThrow();
  });

  it('only exposes a cashier own jobs and does not permit copying another user document', () => {
    const env = makeSale();
    const otherId = addUser(env.db, 'print-other');
    expect(listPrintJobs(env.db, otherId, false)).toEqual([]);
    expect(() => createCopyJob(env.db, otherId, false, env.jobId, { lang: 'ru' }))
      .toThrowError(expect.objectContaining({ status: 403 }));
    expect(listPrintJobs(env.db, env.ownerId, false)).toHaveLength(1);
  });

  it('retries a transient driver failure up to three attempts, then records success', async () => {
    const env = makeSale();
    const driver: PrintDriver = {
      print: vi.fn()
        .mockRejectedValueOnce(new Error('paper unavailable'))
        .mockRejectedValueOnce(new Error('paper unavailable'))
        .mockResolvedValueOnce(undefined),
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(processNextPrintJob(env.db, driver)).resolves.toBe(true);
    expect((env.db.prepare('SELECT status, attempts FROM print_jobs WHERE id = ?').get(env.jobId) as
      { status: string; attempts: number })).toEqual({ status: 'pending', attempts: 1 });
    await processNextPrintJob(env.db, driver);
    await processNextPrintJob(env.db, driver);
    expect((env.db.prepare('SELECT status, attempts, error FROM print_jobs WHERE id = ?').get(env.jobId) as
      { status: string; attempts: number; error: string | null }))
      .toEqual({ status: 'printed', attempts: 3, error: null });
    expect(driver.print).toHaveBeenCalledTimes(3);
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
  });

  it('does not send two jobs to one driver concurrently', async () => {
    const env = makeSale();
    createCopyJob(env.db, env.ownerId, true, env.jobId, { lang: 'ru' });
    let active = 0;
    let maximumActive = 0;
    const driver: PrintDriver = {
      print: async () => {
        active++;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;
      },
    };
    const outcomes = await Promise.all([
      processNextPrintJob(env.db, driver),
      processNextPrintJob(env.db, driver),
    ]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(maximumActive).toBe(1);
    await processNextPrintJob(env.db, driver);
    expect((env.db.prepare("SELECT COUNT(*) AS count FROM print_jobs WHERE status = 'printed'").get() as
      { count: number }).count).toBe(2);
  });

  it('marks jobs that were printing during shutdown as uncertain', () => {
    const env = makeSale();
    env.db.prepare("UPDATE print_jobs SET status = 'printing' WHERE id = ?").run(env.jobId);
    expect(recoverInterruptedPrintJobs(env.db)).toBe(1);
    expect((env.db.prepare('SELECT status FROM print_jobs WHERE id = ?').get(env.jobId) as
      { status: string }).status).toBe('uncertain');
  });

  it('does not retry a print whose transport result is uncertain', async () => {
    const env = makeSale();
    const driver: PrintDriver = {
      print: vi.fn().mockRejectedValue(new PrintOutcomeUncertainError('connection timed out')),
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await processNextPrintJob(env.db, driver);
    expect((env.db.prepare('SELECT status, attempts FROM print_jobs WHERE id = ?').get(env.jobId) as
      { status: string; attempts: number })).toEqual({ status: 'uncertain', attempts: 1 });
    expect(driver.print).toHaveBeenCalledTimes(1);
  });

  it('renders raster RU/UZ receipts and text-mode Russian with QR and cutter commands', () => {
    const receipt = {
      number: 'A-000001',
      createdAt: '2026-11-13T10:00:00.000Z',
      cashier: 'Кассир',
      customer: 'A-000001',
      storeName: 'Do‘kon Ўзбекистон',
      address: 'Toshkent, O‘zbekiston',
      phone: '+998 90 000 00 00',
      subtotal: 1_500_000,
      discountTotal: 0,
      total: 1_500_000,
      paidTotal: 1_500_000,
      debtAmount: 0,
      lines: [{ name: 'Ғўза қўшиқ', qty: 1000, unit: 'шт', unitPrice: 1_500_000, lineDiscount: 0, lineTotal: 1_500_000 }],
      payments: [{ methodName: 'Нақд', amount: 1_500_000, tendered: null, change: 0 }],
      footer: 'Rahmat!',
      lang: 'uz' as const,
      copy: true,
    };
    const raster = renderReceipt(receipt, 'raster');
    expect(raster.includes(Buffer.from([0x1d, 0x76, 0x30, 0x00]))).toBe(true);
    expect(raster.includes(Buffer.from([0x1d, 0x56, 0x00]))).toBe(true);
    const textReceipt = {
      ...receipt,
      lang: 'ru' as const,
      storeName: 'Магазин',
      address: null,
      footer: '',
      lines: [{ name: 'Товар', qty: 1000, unit: 'шт', unitPrice: 1_500_000, lineDiscount: 0, lineTotal: 1_500_000 }],
      payments: [{ methodName: 'Наличные', amount: 1_500_000, tendered: null, change: 0 }],
    };
    const textMode = renderReceipt(textReceipt, 'text');
    expect(textMode.includes(iconv.encode('КОПИЯ', 'cp866'))).toBe(true);
    expect(textMode.includes(Buffer.from([0x1d, 0x76, 0x30, 0x00]))).toBe(true);
    const unsupportedTextGlyphs = renderReceipt({
      ...textReceipt,
      lines: [{ ...textReceipt.lines[0]!, name: 'Ғўза қўшиқ' }],
    }, 'text');
    expect(unsupportedTextGlyphs.includes(Buffer.from([0x1d, 0x76, 0x30, 0x00]))).toBe(true);

    const counterOrderReceipt = renderReceipt({
      ...textReceipt,
      documentLabel: 'counter_order',
      reservationHours: 2,
      reservationExpiresAt: '2026-11-13T12:00:00.000Z',
    }, 'text');
    expect(counterOrderReceipt.includes(Buffer.from([0x1d, 0x76, 0x30, 0x00]))).toBe(true);
    expect(translateReceipt('ru', 'reservationDuration')).toBe('Срок брони');
    expect(translateReceipt('uz', 'reservationDuration')).toBe('Band qilish muddati');
  });

  it('leaves the committed sale intact after all printer retries fail', async () => {
    const env = makeSale();
    const driver: PrintDriver = { print: vi.fn().mockRejectedValue(new Error('printer unavailable')) };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await processNextPrintJob(env.db, driver);
    await processNextPrintJob(env.db, driver);
    await processNextPrintJob(env.db, driver);
    expect((env.db.prepare('SELECT status, attempts FROM print_jobs WHERE id = ?').get(env.jobId) as
      { status: string; attempts: number })).toEqual({ status: 'error', attempts: 3 });
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM sales').get() as { count: number }).count).toBe(1);
    expect(driver.print).toHaveBeenCalledTimes(3);
  });
});
