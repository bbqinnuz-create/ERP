import ExcelJS from 'exceljs';
import type { Db } from '../../db/connection';
import { parseMoney } from '../../core/money';
import { parseQty } from '../../core/qty';
import { inTransaction } from '../../core/tx';
import { AuthError } from '../auth/service';
import { saveImportedProduct, saveReference } from '../references/service';

export const MAX_PRODUCT_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_PRODUCT_IMPORT_ROWS = 5000;
const HEADERS = [
  'sku',
  'name_ru',
  'name_uz',
  'unit',
  'price_sum',
  'category',
  'barcode',
  'min_stock',
  'attributes',
] as const;
const REQUIRED_HEADERS = ['sku', 'name_ru', 'unit', 'price_sum'] as const;

export type ExistingProductMode = 'skip' | 'update';
export type ProductImportLanguage = 'ru' | 'uz';
export type ProductImportAction = 'create' | 'update' | 'skip' | 'error';

export interface ProductImportRowResult {
  line: number;
  sku: string;
  action: ProductImportAction;
  errors: string[];
}

interface ParsedCsvRow {
  line: number;
  values: Record<(typeof HEADERS)[number], string>;
  extraColumns?: boolean;
}

function emptyCsvRecord(): ParsedCsvRow['values'] {
  return {
    sku: '',
    name_ru: '',
    name_uz: '',
    unit: '',
    price_sum: '',
    category: '',
    barcode: '',
    min_stock: '',
    attributes: '',
  };
}

interface PreparedRow extends ProductImportRowResult {
  input?: Record<string, unknown>;
  productId?: string;
  categoryName?: string;
}

export interface ProductImportReport {
  mode: ExistingProductMode;
  counts: { create: number; update: number; skip: number; error: number };
  categoriesToCreate: string[];
  rows: ProductImportRowResult[];
}

export interface ProductImportOptions {
  createMissingCategories: boolean;
  lang: ProductImportLanguage;
}

function assertMode(mode: unknown): asserts mode is ExistingProductMode {
  if (mode !== 'skip' && mode !== 'update') throw new AuthError(400, 'product_import.invalid_mode');
}

function detectDelimiter(text: string): string {
  let quoted = false;
  let comma = 0;
  let semicolon = 0;
  let tab = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (character === '\r' || character === '\n')) {
      break;
    } else if (!quoted && character === ',') comma += 1;
    else if (!quoted && character === ';') semicolon += 1;
    else if (!quoted && character === '\t') tab += 1;
  }
  if (tab > comma && tab > semicolon) return '\t';
  return semicolon > comma ? ';' : ',';
}

function parseCsv(text: string): Array<{ line: number; values: string[] }> {
  if (Buffer.byteLength(text, 'utf8') > MAX_PRODUCT_IMPORT_BYTES) {
    throw new AuthError(413, 'product_import.file_too_large');
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
        if (character === '\n') lineNumber += 1;
        else if (character === '\r' && source[index + 1] !== '\n') lineNumber += 1;
      }
      continue;
    }
    if (afterQuote && character !== delimiter && character !== '\r' && character !== '\n' && character !== ' ' && character !== '\t') {
      throw new AuthError(400, 'product_import.invalid_csv');
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
  if (quoted) throw new AuthError(400, 'product_import.invalid_csv');
  row.push(field.trim());
  if (row.some((cell) => cell !== '')) rows.push({ line: rowStartLine, values: row });
  if (rows.length === 0) throw new AuthError(400, 'product_import.empty_file');
  return rows;
}

function readCsvRows(text: string): ParsedCsvRow[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  const headers = headerRow!.values.map((header) => header.trim().toLowerCase());
  const allowedHeaders = new Set<string>(HEADERS);
  if (headers.some((header) => !allowedHeaders.has(header)) ||
      new Set(headers).size !== headers.length ||
      REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
    throw new AuthError(400, 'product_import.invalid_headers');
  }
  if (dataRows.length === 0) throw new AuthError(400, 'product_import.empty_file');
  if (dataRows.length > MAX_PRODUCT_IMPORT_ROWS) throw new AuthError(413, 'product_import.too_many_rows');
  return dataRows.map(({ line, values }) => {
    const record = emptyCsvRecord();
    for (const header of HEADERS) {
      const position = headers.indexOf(header);
      if (position >= 0) record[header] = values[position] ?? '';
    }
    return { line, values: record, extraColumns: values.length > headers.length };
  });
}

function cleanText(value: string, field: string, maxLength: number, required = false): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    if (required) throw new AuthError(400, `product_import.required_${field}`);
    return undefined;
  }
  if (normalized.length > maxLength) throw new AuthError(400, `product_import.invalid_${field}`);
  return normalized;
}

function parseProductAttributes(value: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (Buffer.byteLength(value, 'utf8') > 8192) {
    throw new AuthError(400, 'product_import.invalid_attributes');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AuthError(400, 'product_import.invalid_attributes');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AuthError(400, 'product_import.invalid_attributes');
  }
  return parsed as Record<string, unknown>;
}

function resolveCategory(
  db: Db,
  value: string,
  createMissingCategories: boolean,
): { id?: string; createName?: string } | undefined {
  if (!value) return undefined;
  const rows = db.prepare(
    `SELECT id FROM categories WHERE active = 1 AND (name_ru = ? OR name_uz = ?)`,
  ).all(value, value) as Array<{ id: string }>;
  if (rows.length > 1) throw new AuthError(400, 'product_import.category_ambiguous');
  if (rows.length === 1) return { id: rows[0]!.id };
  const inactive = db.prepare(
    `SELECT id FROM categories WHERE active = 0 AND (name_ru = ? OR name_uz = ?)`,
  ).get(value, value);
  if (inactive) throw new AuthError(400, 'product_import.category_inactive');
  if (!createMissingCategories) throw new AuthError(400, 'product_import.category_not_found');
  return { createName: value };
}

function rowInput(
  db: Db,
  row: ParsedCsvRow,
  existing: boolean,
  createMissingCategories: boolean,
): { input: Record<string, unknown>; categoryName?: string } {
  const input: Record<string, unknown> = { sku: cleanText(row.values.sku, 'sku', 200, true) };
  const nameRu = cleanText(row.values.name_ru, 'name_ru', 120, !existing);
  if (nameRu !== undefined) input.name_ru = nameRu;
  const nameUz = cleanText(row.values.name_uz, 'name_uz', 120);
  if (nameUz !== undefined) input.name_uz = nameUz;
  const unit = cleanText(row.values.unit, 'unit', 32, !existing);
  if (unit !== undefined) input.unit = unit;
  if (row.values.price_sum) {
    try {
      const price = parseMoney(row.values.price_sum);
      if (price < 0) throw new Error('negative');
      input.base_price = price;
    } catch {
      throw new AuthError(400, 'product_import.invalid_price');
    }
  } else if (!existing) {
    throw new AuthError(400, 'product_import.required_price_sum');
  }
  const categoryName = cleanText(row.values.category, 'category', 120);
  const category = resolveCategory(db, categoryName ?? '', createMissingCategories);
  if (category?.id !== undefined) input.category_id = category.id;
  const barcode = cleanText(row.values.barcode, 'barcode', 128);
  if (barcode !== undefined) input.barcode = barcode;
  if (row.values.min_stock) {
    try {
      const minimum = parseQty(row.values.min_stock);
      if (minimum < 0) throw new Error('negative');
      input.min_stock = minimum;
    } catch {
      throw new AuthError(400, 'product_import.invalid_min_stock');
    }
  }
  const attributes = parseProductAttributes(row.values.attributes);
  if (attributes !== undefined) input.attributes = attributes;
  if (existing && Object.keys(input).length === 1) {
    throw new AuthError(400, 'product_import.no_update_fields');
  }
  return { input, categoryName: category?.createName };
}

function prepareRows(
  db: Db,
  text: string,
  mode: ExistingProductMode,
  options: ProductImportOptions,
): PreparedRow[] {
  assertMode(mode);
  if (typeof options.createMissingCategories !== 'boolean' ||
      (options.lang !== 'ru' && options.lang !== 'uz')) {
    throw new AuthError(400, 'product_import.invalid_options');
  }
  const rows = readCsvRows(text);
  const skuCounts = new Map<string, number>();
  const barcodeCounts = new Map<string, number>();
  for (const row of rows) {
    const sku = row.values.sku.trim();
    const barcode = row.values.barcode.trim();
    if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
    if (barcode) barcodeCounts.set(barcode, (barcodeCounts.get(barcode) ?? 0) + 1);
  }
  return rows.map((row) => {
    const sku = row.values.sku.trim();
    const result: PreparedRow = {
      line: row.line,
      sku,
      action: 'error',
      errors: [],
    };
    if (row.extraColumns) result.errors.push('product_import.extra_columns');
    if (!sku) result.errors.push('product_import.required_sku');
    if ((skuCounts.get(sku) ?? 0) > 1) result.errors.push('product_import.duplicate_file_sku');
    if ((barcodeCounts.get(row.values.barcode.trim()) ?? 0) > 1 && row.values.barcode.trim()) {
      result.errors.push('product_import.duplicate_file_barcode');
    }
    const existing = sku
      ? db.prepare('SELECT * FROM products WHERE sku = ?').get(sku) as Record<string, unknown> | undefined
      : undefined;
    if (result.errors.length > 0) return result;
    if (existing && mode === 'skip') {
      result.action = 'skip';
      return result;
    }
    try {
      const preparedInput = rowInput(db, row, Boolean(existing), options.createMissingCategories);
      result.input = preparedInput.input;
      result.categoryName = preparedInput.categoryName;
      result.action = existing ? 'update' : 'create';
      if (row.values.barcode) {
        const conflict = db.prepare('SELECT sku FROM products WHERE barcode = ? AND sku <> ?')
          .get(row.values.barcode.trim(), sku) as { sku: string } | undefined;
        if (conflict) throw new AuthError(400, 'product_import.barcode_in_use');
      }
      if (existing) result.productId = String(existing.id);
    } catch (error) {
      result.action = 'error';
      result.input = undefined;
      result.errors.push(error instanceof AuthError ? error.errorKey : 'product_import.invalid_row');
    }
    return result;
  });
}

function report(mode: ExistingProductMode, rows: PreparedRow[]): ProductImportReport {
  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  for (const row of rows) counts[row.action] += 1;
  const categoriesToCreate = [...new Set(rows
    .filter((row) => row.action === 'create' || row.action === 'update')
    .map((row) => row.categoryName)
    .filter((name): name is string => name !== undefined))];
  return {
    mode,
    counts,
    categoriesToCreate,
    rows: rows.map(({ line, sku, action, errors }) => ({ line, sku, action, errors })),
  };
}

export function previewProductImport(
  db: Db,
  text: string,
  mode: ExistingProductMode,
  options: ProductImportOptions = { createMissingCategories: false, lang: 'ru' },
): ProductImportReport {
  if (typeof text !== 'string') throw new AuthError(400, 'product_import.invalid_file');
  return report(mode, prepareRows(db, text, mode, options));
}

export function commitProductImport(
  db: Db,
  userId: string,
  text: string,
  mode: ExistingProductMode,
  options: ProductImportOptions = { createMissingCategories: false, lang: 'ru' },
): ProductImportReport {
  return inTransaction(db, () => {
    const rows = prepareRows(db, text, mode, options);
    const categories = new Map<string, string>();
    for (const categoryName of report(mode, rows).categoriesToCreate) {
      const categoryInput = options.lang === 'uz'
        ? { name_ru: categoryName, name_uz: categoryName }
        : { name_ru: categoryName };
      const saved = saveReference(db, userId, 'categories', categoryInput);
      categories.set(categoryName, String(saved.id));
    }
    for (const row of rows) {
      if ((row.action !== 'create' && row.action !== 'update') || !row.input) continue;
      if (row.categoryName) row.input.category_id = categories.get(row.categoryName)!;
      const saved = saveImportedProduct(db, userId, row.input, row.productId);
      row.productId = String(saved.id);
    }
    return report(mode, rows);
  });
}

export async function buildProductImportTemplate(lang: ProductImportLanguage = 'ru'): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP';
  workbook.created = new Date();
  const isUzbek = lang === 'uz';
  const productsSheetName = isUzbek ? 'Tovarlar' : 'Товары';
  const instructionsSheetName = isUzbek ? 'Yo‘riqnoma' : 'Инструкция';
  const products = workbook.addWorksheet(productsSheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  products.columns = [
    { header: 'sku', key: 'sku', width: 22 },
    { header: 'name_ru', key: 'name_ru', width: 30 },
    { header: 'name_uz', key: 'name_uz', width: 30 },
    { header: 'unit', key: 'unit', width: 16 },
    { header: 'price_sum', key: 'price_sum', width: 18, style: { numFmt: '0.00' } },
    { header: 'category', key: 'category', width: 24 },
    { header: 'barcode', key: 'barcode', width: 24 },
    { header: 'min_stock', key: 'min_stock', width: 18, style: { numFmt: '0.000' } },
    { header: 'attributes', key: 'attributes', width: 36 },
  ];
  products.autoFilter = { from: 'A1', to: 'I1' };
  products.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  products.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769AA' } };
  products.addRow({
    sku: 'ARM-12',
    name_ru: 'Арматура 12 мм',
    name_uz: '12 mm armatura',
    unit: 'м',
    price_sum: 15000,
    category: '',
    barcode: '',
    min_stock: 5,
    attributes: isUzbek ? '{"diametr_mm":12}' : '{"диаметр_мм":12}',
  });

  const instructions = workbook.addWorksheet(instructionsSheetName);
  instructions.columns = [{ width: 24 }, { width: 100 }];
  instructions.addRows(isUzbek ? [
    ['Maydon', 'Qisqa izoh'],
    ['sku', 'Tovarning takrorlanmaydigan artikuli — majburiy.'],
    ['name_ru', 'Rus tilidagi tovar nomi — majburiy.'],
    ['name_uz', 'O‘zbek tilidagi tovar nomi — ixtiyoriy.'],
    ['unit', 'Hisob birligi, masalan dona, kg yoki m — majburiy.'],
    ['price_sum', 'So‘mdagi asosiy narx; verguldan keyin 2 raqamgacha — majburiy.'],
    ['category', 'Faol toifaning ruscha yoki o‘zbekcha aniq nomi — ixtiyoriy.'],
    ['barcode', 'Takrorlanmaydigan shtrix-kod — ixtiyoriy.'],
    ['min_stock', 'Minimal qoldiq; verguldan keyin 3 raqamgacha — ixtiyoriy.'],
    ['attributes', 'JSON obyektidagi qo‘shimcha xususiyatlar, masalan {"diametr_mm":12}.'],
    ['Namuna', '1-qator armatura 12 mm misolidir. Importdan oldin uni o‘zingizning mahsulotingizga moslang yoki o‘chirib tashlang.'],
    ['Toifalar', 'Import sozlamasida mavjud bo‘lmagan toifalarni yaratish yoqilsa, yangi toifa joriy sahifa tilida yaratiladi; o‘zbekcha nom majburiy ruscha maydonga ham yoziladi. Nofaol toifalar avtomatik yoqilmaydi.'],
    ['Fayl', `«${productsSheetName}» varag‘ini to‘ldiring va Excel’da CSV UTF-8 formatida saqlang. ERP’ga XLSX emas, CSV yuklanadi.`],
    ['Mavjud tovarlar', 'Odatiy rejimda bir xil artikulli tovar o‘tkazib yuboriladi. Yangilash rejimida faqat to‘ldirilgan kataklar o‘zgaradi; bo‘sh kataklar eski qiymatlarni o‘chirmaydi.'],
    ['Qoldiqlar', 'Import faqat tovar kartalarini yaratadi yoki yangilaydi. Qoldiq, partiya va ombor harakatlari yaratilmaydi.'],
  ] : [
    ['Поле', 'Краткое объяснение'],
    ['sku', 'Уникальный артикул товара — обязательно.'],
    ['name_ru', 'Название товара на русском — обязательно.'],
    ['name_uz', 'Название товара на узбекском — необязательно.'],
    ['unit', 'Единица учёта, например шт, кг или м — обязательно.'],
    ['price_sum', 'Базовая цена в сумах, до 2 знаков после запятой — обязательно.'],
    ['category', 'Точное название активной категории на русском или узбекском — необязательно.'],
    ['barcode', 'Уникальный штрихкод — необязательно.'],
    ['min_stock', 'Минимальный остаток, до 3 знаков после запятой — необязательно.'],
    ['attributes', 'Дополнительные характеристики в формате JSON-объекта, например {"диаметр_мм":12}.'],
    ['Пример', 'Первая строка — пример арматуры 12 мм. Перед импортом замените её на свой товар или удалите.'],
    ['Категории', 'Если включить создание отсутствующих категорий в настройках импорта, новая категория будет создана на языке страницы. Для узбекского названия из-за обязательного русского поля название запишется в оба языка. Отключённые категории автоматически не включаются.'],
    ['Файл', `Заполните лист «${productsSheetName}» и сохраните его из Excel как CSV UTF-8. В ERP загружается CSV, не XLSX.`],
    ['Совпадения', 'По умолчанию товар с тем же артикулом пропускается. В режиме обновления меняются только заполненные ячейки; пустые ячейки не очищают старые значения.'],
    ['Остатки', 'Импорт создаёт или обновляет только карточки товара. Остатки, партии и складские движения не создаются.'],
  ]);
  instructions.getRow(1).font = { bold: true };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCECF8' } };
  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
