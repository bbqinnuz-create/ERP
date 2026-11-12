import { describe, it, expect } from 'vitest';
import { parseMoney, mulQty, roundToSum, roundDiv, formatMoney } from '../src/core/money';
import { parseQty, formatQty, assertPositiveQty } from '../src/core/qty';

describe('деньги', () => {
  it('2,5 м × 14 000 сум = 35 000 сум без ошибок округления', () => {
    const price = parseMoney(14000);          // 1 400 000 тийин
    const qty = parseQty('2,5');              // 2500
    expect(price).toBe(1_400_000);
    expect(qty).toBe(2500);
    expect(mulQty(qty, price)).toBe(3_500_000); // 35 000 сум в тийинах
  });

  it('классические проблемы float не воспроизводятся', () => {
    // 0.1 + 0.2 и 1.005 * 1000 в float дают неточные результаты; у нас целые
    expect(mulQty(parseQty('0,1'), parseMoney('0,2'))).toBe(2); // 0,1 × 0,20 сум = 0,02 сум = 2 тийина
    expect(mulQty(parseQty('1,005'), parseMoney(1000))).toBe(100_500);
    expect(mulQty(parseQty('3'), parseMoney('33,33'))).toBe(9_999);
  });

  it('границы порогов цены: 50, 50,001 и 51 м', () => {
    const price = parseMoney(14000);
    expect(mulQty(parseQty('50'), parseMoney(15000))).toBe(75_000_000);       // 750 000 сум
    expect(mulQty(parseQty('50,001'), price)).toBe(70_001_400);               // 700 014 сум
    expect(mulQty(parseQty('51'), price)).toBe(71_400_000);                   // 714 000 сум
    expect(mulQty(parseQty('60'), price)).toBe(84_000_000);                   // 840 000 сум
  });

  it('округление до тийина: от нуля при ровно 0,5', () => {
    // 0,001 × 50 тийин = 0,05 тийина -> 0
    expect(mulQty(1, 50)).toBe(0);
    // 0,5 тийина: 500 × 1 / 1000 -> 0,5 -> 1
    expect(mulQty(500, 1)).toBe(1);
    expect(mulQty(-500, 1)).toBe(-1);
    expect(mulQty(499, 1)).toBe(0);
  });

  it('roundDiv: округление от нуля для положительных и отрицательных', () => {
    expect(roundDiv(5n, 10n)).toBe(1n);
    expect(roundDiv(-5n, 10n)).toBe(-1n);
    expect(roundDiv(4n, 10n)).toBe(0n);
    expect(roundDiv(15n, 10n)).toBe(2n);
    expect(roundDiv(7n, -2n)).toBe(-4n);
    expect(() => roundDiv(1n, 0n)).toThrow();
  });

  it('roundToSum округляет до целого сума', () => {
    expect(roundToSum(12_349)).toBe(12_300);
    expect(roundToSum(12_350)).toBe(12_400);
    expect(roundToSum(12_300)).toBe(12_300);
    expect(roundToSum(0)).toBe(0);
  });

  it('разбор денег из строк', () => {
    expect(parseMoney('14 000')).toBe(1_400_000);
    expect(parseMoney('14\u00A0000,50')).toBe(1_400_050);
    expect(parseMoney('14000.5')).toBe(1_400_050);
    expect(parseMoney('0,05')).toBe(5);
    expect(parseMoney(0)).toBe(0);
    expect(() => parseMoney('12,345')).toThrow();
    expect(() => parseMoney('abc')).toThrow();
    expect(() => parseMoney(1.5)).toThrow();
  });

  it('безопасно считает крупные суммы (миллиарды сум)', () => {
    const big = mulQty(parseQty('100000'), parseMoney('50 000 000')); // 100 000 м × 50 млн сум
    expect(big).toBe(100_000 * 50_000_000 * 100);
    expect(Number.isSafeInteger(big)).toBe(true);
  });

  it('форматирование денег', () => {
    expect(formatMoney(3_500_000)).toBe('35\u00A0000\u00A0сум');
    expect(formatMoney(3_500_050)).toBe('35\u00A0000,50\u00A0сум');
    expect(formatMoney(3_500_000, 'uz')).toBe('35\u00A0000\u00A0soʻm');
    expect(formatMoney(0)).toBe('0\u00A0сум');
    expect(formatMoney(-150_000)).toBe('−1\u00A0500\u00A0сум');
  });
});

describe('количество', () => {
  it('разбор и показ', () => {
    expect(parseQty('2,5')).toBe(2500);
    expect(parseQty('2.5')).toBe(2500);
    expect(parseQty('51')).toBe(51_000);
    expect(parseQty('50,001')).toBe(50_001);
    expect(parseQty('0,001')).toBe(1);
    expect(parseQty(3)).toBe(3000);
    expect(formatQty(2500)).toBe('2,5');
    expect(formatQty(51_000)).toBe('51');
    expect(formatQty(50_001)).toBe('50,001');
    expect(formatQty(2500, '.')).toBe('2.5');
    expect(formatQty(-1500)).toBe('−1,5');
    expect(formatQty(0)).toBe('0');
  });

  it('больше трёх знаков и мусор отклоняются', () => {
    expect(() => parseQty('1,0001')).toThrow();
    expect(() => parseQty('abc')).toThrow();
    expect(() => parseQty('')).toThrow();
    expect(() => parseQty(1.5)).toThrow();
  });

  it('туда и обратно без потерь', () => {
    for (const v of ['0,001', '0,01', '0,1', '1', '12,345', '999,999']) {
      expect(formatQty(parseQty(v))).toBe(v);
    }
  });

  it('assertPositiveQty', () => {
    expect(() => assertPositiveQty(1)).not.toThrow();
    expect(() => assertPositiveQty(0)).toThrow();
    expect(() => assertPositiveQty(-5)).toThrow();
    expect(() => assertPositiveQty(1.5)).toThrow();
  });
});
