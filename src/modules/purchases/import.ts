import ExcelJS from 'exceljs';
import type { Db } from '../../db/connection';
import { parseMoney } from '../../core/money';
import { formatQty, parseQty } from '../../core/qty';
import { AuthError } from '../auth/service';

export const MAX_PURCHASE_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_PURCHASE_IMPORT_ROWS = 200;
const HEADERS = ['sku', 'qty', 'unit_cost_sum'] as const;
const HEADER_ALIASES: Record<(typeof HEADERS)[number], string[]> = {
  sku: ['sku', 'артикул'],
  qty: ['qty', 'количество'],
  unit_cost_sum: ['unit_cost_sum', 'закупочная цена, сум', 'закупочная цена'],
};
const OPTIONAL_HEADERS = ['name', 'unit', 'base_price_sum', 'status'] as const;
const OPTIONAL_HEADER_ALIASES: Record<(typeof OPTIONAL_HEADERS)[number], string[]> = {
  name: ['name', 'название'],
  unit: ['unit', 'единица измерения'],
  base_price_sum: ['base_price_sum', 'цена продажи', 'цена продажи, сум'],
  status: ['status', 'статус'],
};

export interface PurchaseProductPriceUpdate {
  productId: string;
  basePrice: number;
  expectedBasePrice: number;
}

export interface PurchaseImportRow {
  line: number;
  sku: string;
  action: 'ready' | 'error';
  errors: string[];
  productId?: string;
  productName?: string;
  unit?: string;
  qty?: string;
  unitCost?: number;
  currentBasePrice?: number;
  basePrice?: number;
}

export interface PurchaseImportReport {
  counts: { ready: number; error: number };
  updateSalePrice: boolean;
  rows: PurchaseImportRow[];
}

export async function buildPurchaseProductImportTemplate(db: Db, categoryId: string | null): Promise<Buffer> {
  if (categoryId !== null) {
    const category = db.prepare('SELECT 1 FROM categories WHERE id = ? AND active = 1').get(categoryId);
    if (!category) throw new AuthError(400, 'purchase_import.invalid_category');
  }
  const products = db.prepare(
    `SELECT p.sku, p.name_ru AS name, p.unit, p.base_price, p.active
     FROM products p
     ${categoryId === null ? '' : 'WHERE p.category_id = ?'}
     ORDER BY p.name_ru, p.sku`,
  ).all(...(categoryId === null ? [] : [categoryId])) as {
    sku: string;
    name: string;
    unit: string;
    base_price: number;
    active: number;
  }[];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Товары', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Название', key: 'name', width: 32 },
    { header: 'Артикул', key: 'sku', width: 24 },
    { header: 'Единица измерения', key: 'unit', width: 22 },
    { header: 'Цена продажи, сум', key: 'base_price_sum', width: 22, style: { numFmt: '0.00' } },
    { header: 'Статус', key: 'status', width: 16 },
    { header: 'Количество', key: 'qty', width: 18, style: { numFmt: '0.000' } },
    { header: 'Закупочная цена, сум', key: 'unit_cost_sum', width: 26, style: { numFmt: '0.00' } },
  ];
  sheet.autoFilter = { from: 'A1', to: 'G1' };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769AA' } };
  for (const product of products) {
    sheet.addRow({
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      base_price_sum: product.base_price / 100,
      status: product.active ? 'Активен' : 'Неактивен',
      qty: '',
      unit_cost_sum: '',
    });
  }

  const instructions = workbook.addWorksheet('Инструкция');
  instructions.columns = [{ width: 30 }, { width: 105 }];
  instructions.addRows([
    ['Поле', 'Краткое объяснение'],
    ['Название, Артикул, Единица измерения, Статус', 'Справочные данные из карточки товара. Сопоставление выполняется по артикулу; остальные поля не изменяют карточку товара.'],
    ['Цена продажи, сум', 'Справочная текущая цена. По умолчанию сохраняется. Обновить её можно только отметив соответствующий флажок в форме импорта.'],
    ['Количество', 'Обязательное положительное количество для прихода; не более 3 знаков после запятой. Удалите строки товаров, которые не входят в этот приход.'],
    ['Закупочная цена, сум', 'Обязательная закупочная цена за единицу в сумах; неотрицательная, не более 2 знаков после запятой.'],
    ['Статус', 'Неактивные товары показаны для справки и не могут быть включены в приход.'],
    ['Файл', 'Заполните лист «Товары» и сохраните его из Excel как CSV UTF-8. В ERP загружается CSV, не XLSX.'],
    ['Проведение', 'Предпросмотр проверяет строки. При отмеченном обновлении цены продажи новые цены и приход записываются одной транзакцией.'],
  ]);
  instructions.getRow(1).font = { bold: true };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCECF8' } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildPurchaseImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP';
  workbook.created = new Date();
  const purchases = workbook.addWorksheet('Приход', { views: [{ state: 'frozen', ySplit: 1 }] });
  purchases.columns = [
    { header: 'Артикул', key: 'sku', width: 24 },
    { header: 'Количество', key: 'qty', width: 20, style: { numFmt: '0.000' } },
    { header: 'Закупочная цена, сум', key: 'unit_cost_sum', width: 28, style: { numFmt: '0.00' } },
  ];
  purchases.autoFilter = { from: 'A1', to: 'C1' };
  purchases.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  purchases.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769AA' } };
  purchases.addRow({ sku: 'ЗАМЕНИТЕ_АРТИКУЛ', qty: 1, unit_cost_sum: 1000 });

  const instructions = workbook.addWorksheet('Инструкция');
  instructions.columns = [{ width: 28 }, { width: 100 }];
  instructions.addRows([
    ['Поле', 'Краткое объяснение'],
    ['Артикул', 'Артикул существующего активного товара — обязательно. Новые товары этим импортом не создаются.'],
    ['Количество', 'Положительное количество товара; не более 3 знаков после запятой.'],
    ['Закупочная цена, сум', 'Закупочная цена за единицу в сумах; неотрицательная, не более 2 знаков после запятой.'],
    ['Пример', 'Первая строка — пример. Замените артикул на артикул товара из системы или удалите строку.'],
    ['Файл', 'Заполните лист «Приход» и сохраните его из Excel как CSV UTF-8. В ERP загружается CSV, не XLSX.'],
    ['Оформление', 'Склад, дата, поставщик и примечание указываются в форме прихода. Проверьте строки перед проведением документа.'],
  ]);
  instructions.getRow(1).font = { bold: true };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCECF8' } };
  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

function detectDelimiter(text: string): string {
  let quoted = false;
  const counts = [0, 0, 0];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (character === '\r' || character === '\n')) {
      break;
    } else if (!quoted && character === ',') counts[0] = counts[0]! + 1;
    else if (!quoted && character === ';') counts[1] = counts[1]! + 1;
    else if (!quoted && character === '\t') counts[2] = counts[2]! + 1;
  }
  const max = Math.max(...counts);
  return max === 0 ? ',' : [',', ';', '\t'][counts.indexOf(max)]!;
}

function parseCsv(text: string): Array<{ line: number; values: string[] }> {
  if (Buffer.byteLength(text, 'utf8') > MAX_PURCHASE_IMPORT_BYTES) {
    throw new AuthError(413, 'purchase_import.file_too_large');
  }
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source);
  const rows: Array<{ line: number; values: string[] }> = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let lineNumber = 1;
  let rowStartLine = 1;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += character;
        if (character === '\n' || (character === '\r' && source[index + 1] !== '\n')) lineNumber += 1;
      }
      continue;
    }
    if (afterQuote && character !== delimiter && character !== '\r' && character !== '\n' &&
        character !== ' ' && character !== '\t') {
      throw new AuthError(400, 'purchase_import.invalid_csv');
    }
    if (character === '"' && field.trim() === '' && !afterQuote) {
      field = '';
      quoted = true;
    } else if (character === delimiter) {
      row.push(field.trim());
      field = '';
      afterQuote = false;
    } else if (character === '\r' || character === '\n') {
      row.push(field.trim());
      if (row.some((cell) => cell !== '')) rows.push({ line: rowStartLine, values: row });
      row = [];
      field = '';
      afterQuote = false;
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      lineNumber += 1;
      rowStartLine = lineNumber;
    } else if (!afterQuote) {
      field += character;
    }
  }
  if (quoted) throw new AuthError(400, 'purchase_import.invalid_csv');
  row.push(field.trim());
  if (row.some((cell) => cell !== '')) rows.push({ line: rowStartLine, values: row });
  if (rows.length === 0) throw new AuthError(400, 'purchase_import.empty_file');
  return rows;
}

export function previewPurchaseImport(
  db: Db,
  text: string,
  updateSalePrice = false,
): PurchaseImportReport {
  if (typeof text !== 'string') throw new AuthError(400, 'purchase_import.invalid_file');
  const [header, ...data] = parseCsv(text);
  const headers = header!.values.map((value) => {
    const normalized = value.trim().toLowerCase();
    return HEADERS.find((key) => HEADER_ALIASES[key].includes(normalized)) ??
      OPTIONAL_HEADERS.find((key) => OPTIONAL_HEADER_ALIASES[key].includes(normalized)) ?? normalized;
  });
  const allowedHeaders = new Set<string>([...HEADERS, ...OPTIONAL_HEADERS]);
  if (updateSalePrice && !headers.includes('base_price_sum')) {
    throw new AuthError(400, 'purchase_import.sale_price_column_required');
  }
  if (headers.length < HEADERS.length || headers.length > allowedHeaders.size ||
      new Set(headers).size !== headers.length ||
      headers.some((value) => !allowedHeaders.has(value)) ||
      HEADERS.some((value) => !headers.includes(value))) {
    throw new AuthError(400, 'purchase_import.invalid_headers');
  }
  if (data.length === 0) throw new AuthError(400, 'purchase_import.empty_file');
  if (data.length > MAX_PURCHASE_IMPORT_ROWS) throw new AuthError(413, 'purchase_import.too_many_rows');

  const skuCounts = new Map<string, number>();
  for (const row of data) {
    const sku = (row.values[headers.indexOf('sku')] ?? '').trim();
    if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
  }

  const rows = data.map(({ line, values }) => {
    const sku = (values[headers.indexOf('sku')] ?? '').trim();
    const result: PurchaseImportRow = { line, sku, action: 'error', errors: [] };
    if (values.length > headers.length) result.errors.push('purchase_import.extra_columns');
    if (!sku) result.errors.push('purchase_import.required_sku');
    else if (sku.length > 200) result.errors.push('purchase_import.invalid_sku');
    if ((skuCounts.get(sku) ?? 0) > 1) result.errors.push('purchase_import.duplicate_sku');

    const product = sku && sku.length <= 200
      ? db.prepare('SELECT id, name_ru AS name, unit, base_price FROM products WHERE sku = ? AND active = 1')
        .get(sku) as { id: string; name: string; unit: string; base_price: number } | undefined
      : undefined;
    if (!product && sku && sku.length <= 200) {
      const inactive = db.prepare('SELECT 1 FROM products WHERE sku = ? AND active = 0').get(sku);
      result.errors.push(inactive ? 'purchase_import.product_inactive' : 'purchase_import.product_not_found');
    }

    const qtyInput = (values[headers.indexOf('qty')] ?? '').trim();
    if (!qtyInput) result.errors.push('purchase_import.required_qty');
    else {
      try {
        const qty = parseQty(qtyInput);
        if (qty <= 0) throw new Error('non_positive');
        result.qty = formatQty(qty, '.');
      } catch {
        result.errors.push('purchase_import.invalid_qty');
      }
    }

    const costInput = (values[headers.indexOf('unit_cost_sum')] ?? '').trim();
    if (!costInput) result.errors.push('purchase_import.required_unit_cost');
    else {
      try {
        const unitCost = parseMoney(costInput);
        if (unitCost < 0) throw new Error('negative');
        result.unitCost = unitCost;
      } catch {
        result.errors.push('purchase_import.invalid_unit_cost');
      }
    }

    if (product) {
      result.productId = product.id;
      result.productName = product.name;
      result.unit = product.unit;
      if (updateSalePrice) {
        const priceInput = (values[headers.indexOf('base_price_sum')] ?? '').trim();
        if (!priceInput) result.errors.push('purchase_import.required_sale_price');
        else {
          try {
            const basePrice = parseMoney(priceInput);
            if (basePrice < 0) throw new Error('negative');
            result.currentBasePrice = product.base_price;
            result.basePrice = basePrice;
          } catch {
            result.errors.push('purchase_import.invalid_sale_price');
          }
        }
      }
    }
    result.action = result.errors.length === 0 ? 'ready' : 'error';
    return result;
  });

  return {
    counts: {
      ready: rows.filter((row) => row.action === 'ready').length,
      error: rows.filter((row) => row.action === 'error').length,
    },
    updateSalePrice,
    rows,
  };
}
