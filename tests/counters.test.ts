import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeEnv, type TestEnv } from './helpers';
import { nextDocNumber } from '../src/core/counters';
import { inTransaction } from '../src/core/tx';
import { ensureBranch } from '../src/core/setup';

let env: TestEnv;
beforeEach(() => {
  env = makeEnv();
});
afterEach(() => env.cleanup());

describe('номера документов', () => {
  it('1000 номеров подряд без повторов и пропусков', () => {
    const numbers: string[] = [];
    for (let i = 0; i < 1000; i++) {
      numbers.push(inTransaction(env.db, () => nextDocNumber(env.db, env.branchId, 'sale')));
    }
    expect(new Set(numbers).size).toBe(1000);
    expect(numbers[0]).toBe('A-000001');
    expect(numbers[999]).toBe('A-001000');
    numbers.forEach((n, i) => expect(n).toBe(`A-${String(i + 1).padStart(6, '0')}`));
  });

  it('форматы номеров: чек, возврат, приход, списание, инвентаризация, касса', () => {
    inTransaction(env.db, () => {
      expect(nextDocNumber(env.db, env.branchId, 'sale')).toBe('A-000001');
      expect(nextDocNumber(env.db, env.branchId, 'return')).toBe('A-R-000001');
      expect(nextDocNumber(env.db, env.branchId, 'purchase')).toBe('A-P-000001');
      expect(nextDocNumber(env.db, env.branchId, 'writeoff')).toBe('A-W-000001');
      expect(nextDocNumber(env.db, env.branchId, 'stocktake')).toBe('A-I-000001');
      expect(nextDocNumber(env.db, env.branchId, 'cashop')).toBe('A-C-000001');
      expect(nextDocNumber(env.db, env.branchId, 'sale')).toBe('A-000002');
    });
  });

  it('у каждой точки продажи своя нумерация и свой префикс', () => {
    const other = ensureBranch(env.db, { code: 'B', name: 'Филиал' });
    inTransaction(env.db, () => {
      expect(nextDocNumber(env.db, env.branchId, 'sale')).toBe('A-000001');
      expect(nextDocNumber(env.db, other.branchId, 'sale')).toBe('B-000001');
      expect(nextDocNumber(env.db, env.branchId, 'sale')).toBe('A-000002');
    });
  });

  it('вне транзакции вызвать нельзя', () => {
    expect(() => nextDocNumber(env.db, env.branchId, 'sale')).toThrow(/inside a transaction/);
  });

  it('неизвестная точка продажи отклоняется', () => {
    expect(() => inTransaction(env.db, () => nextDocNumber(env.db, 'no-such-branch', 'sale'))).toThrow(/Unknown branch/);
  });

  it('при откате транзакции номер не сгорает (нет пропусков)', () => {
    expect(inTransaction(env.db, () => nextDocNumber(env.db, env.branchId, 'sale'))).toBe('A-000001');
    expect(() =>
      inTransaction(env.db, () => {
        expect(nextDocNumber(env.db, env.branchId, 'sale')).toBe('A-000002');
        throw new Error('сбой посреди операции');
      }),
    ).toThrow(/сбой/);
    // номер A-000002 вернулся в пул вместе с откатом
    expect(inTransaction(env.db, () => nextDocNumber(env.db, env.branchId, 'sale'))).toBe('A-000002');
  });
});
