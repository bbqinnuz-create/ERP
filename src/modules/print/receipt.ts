import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import iconv from 'iconv-lite';
import QRCode from 'qrcode';
import { translateReceipt, type ReceiptMessageKey } from '../i18n/receipt';

export type ReceiptLanguage = 'ru' | 'uz';
export type ReceiptMode = 'text' | 'raster';

export interface ReceiptLine {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface ReceiptPayment {
  methodName: string;
  amount: number;
  tendered: number | null;
  change: number;
}

export interface ReceiptData {
  number: string;
  documentLabel?: 'return' | 'counter_order' | null;
  reservationHours?: number | null;
  reservationExpiresAt?: string | null;
  createdAt: string;
  cashier: string;
  customer: string;
  storeName: string;
  address: string | null;
  phone: string | null;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  debtAmount: number;
  lines: ReceiptLine[];
  payments: ReceiptPayment[];
  footer: string;
  lang: ReceiptLanguage;
  copy: boolean;
}

export interface ReceiptSnapshot {
  number: string;
  documentLabel?: 'return' | 'counter_order' | null;
  reservationHours?: number | null;
  reservationExpiresAt?: string | null;
  createdAt: string;
  cashier: string;
  customer: string;
  storeName: string;
  address: string | null;
  phone: string | null;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  debtAmount: number;
  lines: Array<{
    nameRu: string;
    nameUz: string | null;
    qty: number;
    unit: string;
    unitPrice: number;
    lineDiscount: number;
    lineTotal: number;
  }>;
  payments: Array<{
    methodNameRu: string;
    methodNameUz: string | null;
    amount: number;
    tendered: number | null;
    change: number;
  }>;
}

export function receiptDataFromSnapshot(
  snapshot: ReceiptSnapshot,
  lang: ReceiptLanguage,
  footer: string,
  copy: boolean,
): ReceiptData {
  return {
    number: snapshot.number,
    documentLabel: snapshot.documentLabel ?? null,
    reservationHours: snapshot.reservationHours ?? null,
    reservationExpiresAt: snapshot.reservationExpiresAt ?? null,
    createdAt: snapshot.createdAt,
    cashier: snapshot.cashier,
    customer: snapshot.customer,
    storeName: snapshot.storeName,
    address: snapshot.address,
    phone: snapshot.phone,
    subtotal: snapshot.subtotal,
    discountTotal: snapshot.discountTotal,
    total: snapshot.total,
    paidTotal: snapshot.paidTotal,
    debtAmount: snapshot.debtAmount,
    lines: snapshot.lines.map((line) => ({
      name: lang === 'uz' && line.nameUz ? line.nameUz : line.nameRu,
      qty: line.qty,
      unit: line.unit,
      unitPrice: line.unitPrice,
      lineDiscount: line.lineDiscount,
      lineTotal: line.lineTotal,
    })),
    payments: snapshot.payments.map((payment) => ({
      methodName: lang === 'uz' && payment.methodNameUz ? payment.methodNameUz : payment.methodNameRu,
      amount: payment.amount,
      tendered: payment.tendered,
      change: payment.change,
    })),
    footer,
    lang,
    copy,
  };
}

const WIDTH_DOTS = 576;
const MARGIN = 20;
const TEXT_WIDTH = WIDTH_DOTS - MARGIN * 2;
const FONT = 'DejaVu Sans';
let fontRegistered = false;

function money(value: number, lang: ReceiptLanguage): string {
  if (!Number.isSafeInteger(value)) throw new TypeError('receipt_money_must_be_integer');
  const negative = value < 0;
  const absolute = BigInt(Math.abs(value));
  const sums = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const tiyin = absolute % 100n;
  return `${negative ? '-' : ''}${sums}${tiyin ? `.${tiyin.toString().padStart(2, '0')}` : ''} ${translateReceipt(lang, 'currency')}`;
}

function quantity(value: number, lang: ReceiptLanguage): string {
  if (!Number.isSafeInteger(value)) throw new TypeError('receipt_quantity_must_be_integer');
  const negative = value < 0;
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 1000);
  const fraction = String(absolute % 1000).padStart(3, '0').replace(/0+$/, '');
  const separator = lang === 'ru' ? ',' : '.';
  return `${negative ? '-' : ''}${whole}${fraction ? `${separator}${fraction}` : ''}`;
}

function formatReceiptLines(receipt: ReceiptData): string[] {
  const label = (key: ReceiptMessageKey) => translateReceipt(receipt.lang, key);
  const lines: string[] = [];
  if (receipt.copy) lines.push(label('copy'), '');
  if (receipt.documentLabel === 'return') lines.push(label('return'));
  if (receipt.documentLabel === 'counter_order') lines.push(label('counterOrder'));
  lines.push(receipt.storeName);
  if (receipt.address) lines.push(receipt.address);
  if (receipt.phone) lines.push(receipt.phone);
  lines.push(receipt.number, new Intl.DateTimeFormat(receipt.lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    timeZone: 'Asia/Tashkent',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(receipt.createdAt)));
  lines.push(`${label('cashier')}: ${receipt.cashier}`);
  lines.push(`${label('customer')}: ${receipt.customer}`);
  if (receipt.reservationHours !== null && receipt.reservationHours !== undefined) {
    lines.push(`${label('reservationDuration')}: ${receipt.reservationHours} ${label('hours')}`);
    if (receipt.reservationExpiresAt) {
      lines.push(`${label('reservationExpires')}: ${new Intl.DateTimeFormat(
        receipt.lang === 'ru' ? 'ru-RU' : 'uz-UZ',
        { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' },
      ).format(new Date(receipt.reservationExpiresAt))}`);
    }
  }
  lines.push('-'.repeat(42));
  for (const line of receipt.lines) {
    lines.push(line.name);
    lines.push(`${quantity(line.qty, receipt.lang)} ${line.unit} × ${money(line.unitPrice, receipt.lang)}`);
    if (line.lineDiscount > 0) lines.push(`${label('discount')}: -${money(line.lineDiscount, receipt.lang)}`);
    lines.push(money(line.lineTotal, receipt.lang));
  }
  lines.push('-'.repeat(42));
  lines.push(`${label('subtotal')}: ${money(receipt.subtotal, receipt.lang)}`);
  if (receipt.discountTotal > 0) lines.push(`${label('discount')}: -${money(receipt.discountTotal, receipt.lang)}`);
  lines.push(`${label('total')}: ${money(receipt.total, receipt.lang)}`);
  for (const payment of receipt.payments) {
    lines.push(`${payment.methodName}: ${money(payment.amount, receipt.lang)}`);
    if (payment.change > 0) lines.push(`${label('change')}: ${money(payment.change, receipt.lang)}`);
  }
  lines.push(`${label('paid')}: ${money(receipt.paidTotal, receipt.lang)}`);
  if (receipt.debtAmount > 0) lines.push(`${label('debt')}: ${money(receipt.debtAmount, receipt.lang)}`);
  if (receipt.footer) lines.push(...receipt.footer.split(/\r?\n/));
  return lines;
}

function registerFont(): void {
  if (fontRegistered) return;
  const paths = [
    process.env.PRINTER_FONT_PATH,
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  ].filter((path): path is string => Boolean(path));
  for (const path of paths) {
    if (GlobalFonts.registerFromPath(path, FONT)) {
      fontRegistered = true;
      return;
    }
  }
  throw new Error('receipt_font_not_found: install DejaVu Sans or set PRINTER_FONT_PATH.');
}

function wrapLine(value: string, context: ReturnType<ReturnType<typeof createCanvas>['getContext']>, maxWidth: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function rasterCommand(width: number, height: number, pixels: Uint8ClampedArray): Buffer {
  const widthBytes = Math.ceil(width / 8);
  const bitmap = Buffer.alloc(widthBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (pixels[offset]! < 128) bitmap[y * widthBytes + Math.floor(x / 8)]! |= 0x80 >> (x % 8);
    }
  }
  const xBytes = Buffer.from([widthBytes & 0xff, (widthBytes >> 8) & 0xff]);
  const yBytes = Buffer.from([height & 0xff, (height >> 8) & 0xff]);
  return Buffer.concat([Buffer.from([0x1d, 0x76, 0x30, 0x00]), xBytes, yBytes, bitmap]);
}

function renderTextRaster(lines: string[], qrValue: string): Buffer {
  registerFont();
  const measure = createCanvas(WIDTH_DOTS, 1).getContext('2d');
  measure.font = `22px "${FONT}"`;
  const wrapped = lines.flatMap((line) => wrapLine(line, measure, TEXT_WIDTH));
  const lineHeight = 30;
  const qrSize = 192;
  const height = Math.max(1, wrapped.length * lineHeight + qrSize + 48);
  const canvas = createCanvas(WIDTH_DOTS, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, WIDTH_DOTS, height);
  context.fillStyle = '#000';
  context.font = `22px "${FONT}"`;
  context.textBaseline = 'top';
  let y = 16;
  for (const line of wrapped) {
    const centered = line === translateReceipt('ru', 'copy') || line === translateReceipt('uz', 'copy') ||
      line === translateReceipt('ru', 'total') || line === translateReceipt('uz', 'total');
    context.fillText(line, centered ? Math.max(MARGIN, (WIDTH_DOTS - context.measureText(line).width) / 2) : MARGIN, y);
    y += lineHeight;
  }

  const qr = QRCode.create(qrValue, { errorCorrectionLevel: 'M' });
  const moduleSize = Math.floor(qrSize / qr.modules.size);
  const actualSize = moduleSize * qr.modules.size;
  const qrLeft = Math.floor((WIDTH_DOTS - actualSize) / 2);
  const qrTop = y + 8;
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        context.fillRect(qrLeft + column * moduleSize, qrTop + row * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  const pixels = context.getImageData(0, 0, WIDTH_DOTS, height).data;
  return rasterCommand(WIDTH_DOTS, height, pixels);
}

function renderQrOnly(value: string): Buffer {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const moduleSize = Math.max(2, Math.floor(240 / qr.modules.size));
  const size = moduleSize * qr.modules.size;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) context.fillRect(column * moduleSize, row * moduleSize, moduleSize, moduleSize);
    }
  }
  return rasterCommand(size, size, context.getImageData(0, 0, size, size).data);
}

function encodeText(lines: string[]): Buffer {
  const output: Buffer[] = [Buffer.from([0x1b, 0x40, 0x1b, 0x74, 0x11])];
  for (const line of lines) output.push(iconv.encode(line.replaceAll('×', 'x'), 'cp866'), Buffer.from([0x0a]));
  return Buffer.concat(output);
}

function canEncodeText(lines: string[]): boolean {
  return lines.every((line) => {
    const compatible = line.replaceAll('×', 'x');
    return iconv.decode(iconv.encode(compatible, 'cp866'), 'cp866') === compatible;
  });
}

export function renderReceipt(receipt: ReceiptData, mode: ReceiptMode): Buffer {
  const content = formatReceiptLines(receipt);
  const useRaster = mode === 'raster' || receipt.lang === 'uz' || !canEncodeText(content);
  const body = useRaster ? renderTextRaster(content, receipt.number) : encodeText(content);
  const qr = useRaster ? Buffer.alloc(0) : renderQrOnly(receipt.number);
  return Buffer.concat([
    Buffer.from([0x1b, 0x40]),
    body,
    qr,
    Buffer.from([0x0a, 0x0a, 0x1d, 0x56, 0x00]),
  ]);
}
