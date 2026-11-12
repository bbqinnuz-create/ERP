/**
 * Количество: целое число в тысячных долях (3 знака после запятой).
 * 2,5 м = 2500, 51 м = 51000, 50,001 м = 50001. Ошибок округления float нет.
 */
export type Qty = number;

export const QTY_SCALE = 1000;

/** Разбирает ввод вида «2,5», «2.5», «51», «0,001». Больше 3 знаков после запятой: ошибка. */
export function parseQty(input: string | number): Qty {
  if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new Error('Number input must be a whole quantity; pass decimals as a string');
    }
    return input * QTY_SCALE;
  }
  const normalized = input.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  const m = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(normalized);
  if (!m) throw new Error(`Invalid quantity: "${input}"`);
  const sign = m[1] === '-' ? -1 : 1;
  const whole = Number(m[2]);
  const frac = Number((m[3] ?? '').padEnd(3, '0') || '0');
  const value = sign * (whole * QTY_SCALE + frac);
  if (!Number.isSafeInteger(value)) throw new Error('Quantity is out of range');
  return value;
}

/** Показ количества без лишних нулей: 2500 -> «2,5», 51000 -> «51», 50001 -> «50,001». */
export function formatQty(qty: Qty, decimalSeparator: ',' | '.' = ','): string {
  const negative = qty < 0;
  const abs = Math.abs(qty);
  const whole = Math.floor(abs / QTY_SCALE);
  const frac = String(abs % QTY_SCALE).padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '−' : ''}${whole}${frac ? decimalSeparator + frac : ''}`;
}

export function assertPositiveQty(qty: Qty): void {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Quantity must be a positive integer (thousandths), got ${qty}`);
}
