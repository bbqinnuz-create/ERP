/**
 * Деньги: только целые числа в тийинах (1 сум = 100 тийин). Дробных денег в программе нет.
 */
export type Tiyin = number;

export const TIYIN_PER_SUM = 100;

/** Деление с округлением «от нуля» (0,5 округляется вверх по модулю), без ошибок float. */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (2n * n + d) / (2n * d);
  return negative ? -q : q;
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('Money/quantity value is out of the safe integer range');
  }
  return Number(value);
}

/**
 * Преобразует ввод в тийины.
 *  - число: должно быть целым количеством сумов (14000 -> 1_400_000);
 *  - строка: «14 000», «14000,50», «14000.5» (до 2 знаков после запятой).
 */
export function parseMoney(input: string | number): Tiyin {
  if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new Error('Number input must be a whole amount of sums; pass decimals as a string');
    }
    return toSafeNumber(BigInt(input) * 100n);
  }
  const normalized = input.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!m) throw new Error(`Invalid money value: "${input}"`);
  const sign = m[1] === '-' ? -1n : 1n;
  const whole = BigInt(m[2]!);
  const frac = BigInt((m[3] ?? '').padEnd(2, '0') || '0');
  return toSafeNumber(sign * (whole * 100n + frac));
}

/** Стоимость: количество (в тысячных) × цена единицы (в тийинах), округление до тийина. */
export function mulQty(qtyMilli: number, unitPrice: Tiyin): Tiyin {
  return toSafeNumber(roundDiv(BigInt(qtyMilli) * BigInt(unitPrice), 1000n));
}

/** Округление суммы до целого сума (настройка rounding = sum). */
export function roundToSum(amount: Tiyin): Tiyin {
  return toSafeNumber(roundDiv(BigInt(amount), 100n) * 100n);
}

/** «35 000 сум» / «35 000,50 сум». Пробел между разрядами неразрывный. */
export function formatMoney(amount: Tiyin, lang: 'ru' | 'uz' = 'ru'): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const sums = Math.floor(abs / 100);
  const tiyin = abs % 100;
  const grouped = String(sums).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const frac = tiyin === 0 ? '' : `,${String(tiyin).padStart(2, '0')}`;
  const unit = lang === 'uz' ? 'soʻm' : 'сум';
  return `${negative ? '−' : ''}${grouped}${frac}\u00A0${unit}`;
}
