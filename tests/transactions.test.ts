import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeEnv, addUser, addProduct, type TestEnv } from './helpers';
import { inTransaction } from '../src/core/tx';
import { writeAudit } from '../src/core/audit';
import { nextDocNumber } from '../src/core/counters';
import { uuidv7, UUID_V7_RE } from '../src/core/uuid';
import { ensureBranch } from '../src/core/setup';

let env: TestEnv;
beforeEach(() => {
  env = makeEnv();
});
afterEach(() => env.cleanup());

const count = (table: string) => (env.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('транзакции', () => {
  it('ошибка внутри транзакции откатывает все записи', () => {
    const userId = addUser(env.db);
    const before = { products: count('products'), audit: count('audit_log') };

    expect(() =>
      inTransaction(env.db, () => {
        addProduct(env.db, 'ROLLBACK-1');
        addProduct(env.db, 'ROLLBACK-2');
        writeAudit(env.db, { userId, action: 'test', entity: 'products' });
        nextDocNumber(env.db, env.branchId, 'sale');
        throw new Error('отключили свет');
      }),
    ).toThrow(/отключили свет/);

    expect(count('products')).toBe(before.products);
    expect(count('audit_log')).toBe(before.audit);
    // и счётчик номеров тоже откатился
    expect(inTransaction(env.db, () => nextDocNumber(env.db, env.branchId, 'sale'))).toBe('A-000001');
  });

  it('успешная транзакция сохраняет всё сразу', () => {
    inTransaction(env.db, () => {
      addProduct(env.db, 'OK-1');
      addProduct(env.db, 'OK-2');
    });
    expect(count('products')).toBe(2);
  });

  it('нарушение ограничения в середине откатывает уже сделанное', () => {
    expect(() =>
      inTransaction(env.db, () => {
        addProduct(env.db, 'DUP');
        addProduct(env.db, 'DUP'); // артикул не уникален: ошибка
      }),
    ).toThrow(/UNIQUE/);
    expect(count('products')).toBe(0);
  });

  it('вложенный вызов работает внутри внешней транзакции', () => {
    expect(() =>
      inTransaction(env.db, () => {
        inTransaction(env.db, () => addProduct(env.db, 'INNER'));
        throw new Error('внешняя ошибка');
      }),
    ).toThrow();
    expect(count('products')).toBe(0);
  });

  it('возвращает результат функции', () => {
    expect(inTransaction(env.db, () => 42)).toBe(42);
  });
});

describe('журнал действий', () => {
  it('сохраняет «было → стало»', () => {
    const userId = addUser(env.db);
    writeAudit(env.db, {
      userId,
      action: 'price.update',
      entity: 'products',
      entityId: 'p1',
      before: { base_price: 100 },
      after: { base_price: 150 },
    });
    const row = env.db.prepare("SELECT * FROM audit_log WHERE action = 'price.update'").get() as Record<string, string>;
    expect(row.action).toBe('price.update');
    expect(JSON.parse(row.before_json!)).toEqual({ base_price: 100 });
    expect(JSON.parse(row.after_json!)).toEqual({ base_price: 150 });
    expect(row.user_id).toBe(userId);
    expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('запись без пользователя (системное действие) допустима', () => {
    expect(() => writeAudit(env.db, { action: 'system.start', entity: 'system' })).not.toThrow();
  });
});

describe('UUID v7', () => {
  it('формат и версия корректны', () => {
    for (let i = 0; i < 100; i++) expect(uuidv7()).toMatch(UUID_V7_RE);
  });

  it('уникальны и растут во времени (сортируются по порядку создания)', () => {
    const ids = Array.from({ length: 20_000 }, () => uuidv7());
    expect(new Set(ids).size).toBe(ids.length);
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });

  it('первые 48 бит содержат время', () => {
    const ms = 1_800_000_000_000;
    const id = uuidv7(ms + 10_000_000); // заведомо больше предыдущих
    const hex = id.replace(/-/g, '').slice(0, 12);
    expect(parseInt(hex, 16)).toBeGreaterThanOrEqual(ms);
  });
});

describe('первичная настройка', () => {
  it('создаёт склад и способы оплаты, повторный вызов не дублирует', () => {
    const again = ensureBranch(env.db, { code: 'A', name: 'Тест' });
    expect(again.created).toBe(false);
    expect(again.branchId).toBe(env.branchId);
    expect(count('branches')).toBe(1);
    expect(count('warehouses')).toBe(1);
    expect(count('payment_methods')).toBe(3);
  });

  it('новая точка получает свой склад', () => {
    const b = ensureBranch(env.db, { code: 'B', name: 'Филиал' });
    expect(b.created).toBe(true);
    expect(count('branches')).toBe(2);
    expect(count('warehouses')).toBe(2);
    expect(count('payment_methods')).toBe(3); // способы оплаты общие
  });
});
