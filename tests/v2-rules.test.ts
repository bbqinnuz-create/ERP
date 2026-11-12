import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeEnv, addUser, addProduct, addBatch, addMovement, addPaymentMethod, addCustomer, type TestEnv } from './helpers';
import { openDb, type Db } from '../src/db/connection';
import { ensureBranch } from '../src/core/setup';
import { uuidv7 } from '../src/core/uuid';
import { nowIso } from '../src/core/time';
import { inTransaction } from '../src/core/tx';

let env: TestEnv;
let userId: string;
let otherUserId: string;
let productId: string;
let cashId: string;

beforeEach(() => {
  env = makeEnv();
  userId = addUser(env.db, 'cashier1');
  otherUserId = addUser(env.db, 'cashier2');
  productId = addProduct(env.db, 'P-1');
  cashId = addPaymentMethod(env.db);
});
afterEach(() => env.cleanup());

const methodOfKind = (db: Db, kind: string) =>
  (db.prepare('SELECT id FROM payment_methods WHERE kind = ?').get(kind) as { id: string }).id;

function startStocktake(db: Db, warehouseId: string, mode: 'selected' | 'all' = 'selected', number = `A-I-${uuidv7().slice(-6)}`) {
  const id = uuidv7();
  db.prepare(
    `INSERT INTO stocktakes (id, number, warehouse_id, mode, status, user_id, started_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
  ).run(id, number, warehouseId, mode, userId, nowIso());
  return id;
}

function lock(db: Db, stocktakeId: string, warehouseId: string, productIdOrNull: string | null) {
  const id = uuidv7();
  db.prepare(
    'INSERT INTO stocktake_locks (id, stocktake_id, warehouse_id, product_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, stocktakeId, warehouseId, productIdOrNull, nowIso());
  return id;
}

function movement(db: Db, docType: string, type = 'ADJUST_PLUS', qty = 1000, wh = env.warehouseId, product = productId) {
  return db
    .prepare(
      `INSERT INTO stock_movements (id, created_at, branch_id, warehouse_id, product_id, type, qty, doc_type, doc_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(uuidv7(), nowIso(), env.branchId, wh, product, type, qty, docType, uuidv7());
}

describe('ТЗ v2: кассовых смен нет', () => {
  it('нет таблицы shifts и ни одного поля shift_id', () => {
    const tables = (env.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (t) => t.name,
    );
    expect(tables).not.toContain('shifts');
    for (const t of tables) {
      const cols = (env.db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
      expect(cols, `в таблице ${t} не должно быть shift_id`).not.toContain('shift_id');
    }
    const setting = env.db.prepare("SELECT 1 FROM settings WHERE key = 'require_shift'").get();
    expect(setting).toBeUndefined();
  });
});

describe('сессии: одна активная на пользователя', () => {
  const addSession = (db: Db, uid: string, revoked = false) =>
    db
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, created_at, absolute_expires_at, last_activity_at, revoked_at, revoke_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(uuidv7(), uid, uuidv7(), nowIso(), nowIso(), nowIso(), revoked ? nowIso() : null, revoked ? 'login_elsewhere' : null);

  it('вторая активная сессия того же кассира отклоняется на уровне БД', () => {
    addSession(env.db, userId);
    expect(() => addSession(env.db, userId)).toThrow(/UNIQUE/);
  });

  it('после отзыва старой можно создать новую; у разных кассиров сессии независимы', () => {
    addSession(env.db, userId);
    addSession(env.db, otherUserId);
    env.db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'login_elsewhere' WHERE user_id = ?").run(nowIso(), userId);
    expect(() => addSession(env.db, userId)).not.toThrow();
  });

  it('вход «отзови старую и создай новую» атомарен', () => {
    addSession(env.db, userId);
    inTransaction(env.db, () => {
      env.db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'login_elsewhere' WHERE user_id = ? AND revoked_at IS NULL").run(
        nowIso(),
        userId,
      );
      addSession(env.db, userId);
    });
    const active = env.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND revoked_at IS NULL').get(userId) as { n: number };
    expect(active.n).toBe(1);
  });
});

describe('корзины', () => {
  const addCart = (db: Db, uid: string, status = 'active') => {
    const id = uuidv7();
    db.prepare('INSERT INTO carts (id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, uid, status, nowIso(), nowIso());
    return id;
  };

  it('у кассира одна текущая обычная корзина, у разных кассиров свои', () => {
    addCart(env.db, userId);
    addCart(env.db, otherUserId);
    expect(() => addCart(env.db, userId)).toThrow(/UNIQUE/);
    env.db.prepare("UPDATE carts SET status = 'closed' WHERE user_id = ?").run(userId);
    expect(() => addCart(env.db, userId)).not.toThrow();
  });

  it('одинаковый товар не может занимать две строки корзины (объединяется)', () => {
    const cartId = addCart(env.db, userId);
    const ins = () =>
      env.db.prepare('INSERT INTO cart_lines (id, cart_id, product_id, qty, updated_at) VALUES (?, ?, ?, 1000, ?)').run(uuidv7(), cartId, productId, nowIso());
    ins();
    expect(ins).toThrow(/UNIQUE/);
    // объединение делается через UPSERT
    env.db
      .prepare(
        `INSERT INTO cart_lines (id, cart_id, product_id, qty, updated_at) VALUES (?, ?, ?, 2000, ?)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET qty = qty + excluded.qty`,
      )
      .run(uuidv7(), cartId, productId, nowIso());
    const row = env.db.prepare('SELECT qty FROM cart_lines WHERE cart_id = ?').get(cartId) as { qty: number };
    expect(row.qty).toBe(3000);
  });

  it('корзина и строки сохраняются после перезапуска (закрыть и открыть базу)', () => {
    const cartId = addCart(env.db, userId);
    env.db.prepare('INSERT INTO cart_lines (id, cart_id, product_id, qty, updated_at) VALUES (?, ?, ?, 2500, ?)').run(uuidv7(), cartId, productId, nowIso());
    env.db.close();
    const reopened = openDb({ path: join(env.dir, 'test.db') });
    try {
      const row = reopened.prepare('SELECT qty FROM cart_lines WHERE cart_id = ?').get(cartId) as { qty: number };
      expect(row.qty).toBe(2500);
    } finally {
      reopened.close();
    }
    env.db = openDb({ path: join(env.dir, 'test.db') });
  });
});

describe('инвентаризация: одна активная на склад', () => {
  it('вторая активная инвентаризация на том же складе отклоняется (даже выборочная на другие товары)', () => {
    startStocktake(env.db, env.warehouseId, 'selected');
    expect(() => startStocktake(env.db, env.warehouseId, 'selected')).toThrow(/UNIQUE/);
    expect(() => startStocktake(env.db, env.warehouseId, 'all')).toThrow(/UNIQUE/);
  });

  it('на разных складах инвентаризации независимы', () => {
    const second = ensureBranch(env.db, { code: 'B', name: 'Другой' });
    startStocktake(env.db, env.warehouseId);
    expect(() => startStocktake(env.db, second.warehouseId)).not.toThrow();
  });

  it('две параллельные попытки через два подключения: успешна только одна', () => {
    const second = openDb({ path: join(env.dir, 'test.db') });
    try {
      const results = [env.db, second].map((db) => {
        try {
          inTransaction(db, () => startStocktake(db, env.warehouseId));
          return 'ok';
        } catch {
          return 'fail';
        }
      });
      expect(results.sort()).toEqual(['fail', 'ok']);
    } finally {
      second.close();
    }
  });

  it('после завершения или отмены можно начать новую', () => {
    const id = startStocktake(env.db, env.warehouseId);
    env.db.prepare("UPDATE stocktakes SET status = 'completed', finished_at = ? WHERE id = ?").run(nowIso(), id);
    expect(() => startStocktake(env.db, env.warehouseId)).not.toThrow();
  });

  it('отмена требует причину', () => {
    const id = startStocktake(env.db, env.warehouseId);
    expect(() => env.db.prepare("UPDATE stocktakes SET status = 'cancelled' WHERE id = ?").run(id)).toThrow();
    expect(() => env.db.prepare("UPDATE stocktakes SET status = 'cancelled', cancel_reason = ' ' WHERE id = ?").run(id)).toThrow();
    expect(() =>
      env.db.prepare("UPDATE stocktakes SET status = 'cancelled', cancel_reason = 'Начали по ошибке', finished_at = ? WHERE id = ?").run(nowIso(), id),
    ).not.toThrow();
  });

  it('активная инвентаризация и блокировки переживают перезапуск', () => {
    const id = startStocktake(env.db, env.warehouseId);
    lock(env.db, id, env.warehouseId, productId);
    env.db.close();
    const reopened = openDb({ path: join(env.dir, 'test.db') });
    try {
      const st = reopened.prepare("SELECT status FROM stocktakes WHERE id = ?").get(id) as { status: string };
      expect(st.status).toBe('active');
      const locks = reopened.prepare('SELECT COUNT(*) AS n FROM stocktake_locks WHERE stocktake_id = ? AND released_at IS NULL').get(id) as { n: number };
      expect(locks.n).toBe(1);
      expect(() => movement(reopened, 'sale', 'SALE', -1000)).toThrow(/locked/);
    } finally {
      reopened.close();
    }
    env.db = openDb({ path: join(env.dir, 'test.db') });
  });
});

describe('блокировки инвентаризации на уровне БД', () => {
  it('заблокированный товар: продажа, приход, возврат, списание и корректировка отклоняются', () => {
    const st = startStocktake(env.db, env.warehouseId);
    lock(env.db, st, env.warehouseId, productId);
    expect(() => movement(env.db, 'sale', 'SALE', -1000)).toThrow(/locked/);
    expect(() => movement(env.db, 'purchase', 'PURCHASE', 1000)).toThrow(/locked/);
    expect(() => movement(env.db, 'return', 'RETURN', 1000)).toThrow(/locked/);
    expect(() => movement(env.db, 'write_off', 'WRITE_OFF', -1000)).toThrow(/locked/);
    expect(() => movement(env.db, 'adjust', 'ADJUST_PLUS', 1000)).toThrow(/locked/);
  });

  it('другие товары того же склада не блокируются при выборочной инвентаризации', () => {
    const other = addProduct(env.db, 'P-2');
    const st = startStocktake(env.db, env.warehouseId);
    lock(env.db, st, env.warehouseId, productId);
    expect(() => movement(env.db, 'purchase', 'PURCHASE', 1000, env.warehouseId, other)).not.toThrow();
  });

  it('полная инвентаризация блокирует весь склад, но не соседний', () => {
    const other = ensureBranch(env.db, { code: 'B', name: 'Другой' });
    const st = startStocktake(env.db, env.warehouseId, 'all');
    lock(env.db, st, env.warehouseId, null);
    const anyProduct = addProduct(env.db, 'P-ANY');
    expect(() => movement(env.db, 'purchase', 'PURCHASE', 1000, env.warehouseId, anyProduct)).toThrow(/locked/);
    expect(() => {
      env.db
        .prepare(
          `INSERT INTO stock_movements (id, created_at, branch_id, warehouse_id, product_id, type, qty, doc_type, doc_id)
           VALUES (?, ?, ?, ?, ?, 'PURCHASE', 1000, 'purchase', ?)`,
        )
        .run(uuidv7(), nowIso(), other.branchId, other.warehouseId, anyProduct, uuidv7());
    }).not.toThrow();
  });

  it('корректировки самой инвентаризации проходят, а после снятия блокировки обычные движения снова разрешены', () => {
    const st = startStocktake(env.db, env.warehouseId);
    lock(env.db, st, env.warehouseId, productId);
    expect(() => movement(env.db, 'stocktake', 'ADJUST_PLUS', 500)).not.toThrow();
    inTransaction(env.db, () => {
      env.db.prepare("UPDATE stocktakes SET status = 'completed', finished_at = ? WHERE id = ?").run(nowIso(), st);
      env.db.prepare('UPDATE stocktake_locks SET released_at = ? WHERE stocktake_id = ?').run(nowIso(), st);
    });
    expect(() => movement(env.db, 'sale', 'ADJUST_PLUS', 1000)).not.toThrow();
  });

  it('отклонённое движение не оставляет частичных записей в транзакции', () => {
    const st = startStocktake(env.db, env.warehouseId);
    lock(env.db, st, env.warehouseId, productId);
    const before = (env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n;
    expect(() =>
      inTransaction(env.db, () => {
        movement(env.db, 'sale', 'SALE', -1000);
      }),
    ).toThrow();
    const after = (env.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n;
    expect(after).toBe(before);
  });

  it('на один товар нельзя поставить две активные блокировки', () => {
    const st = startStocktake(env.db, env.warehouseId);
    lock(env.db, st, env.warehouseId, productId);
    expect(() => lock(env.db, st, env.warehouseId, productId)).toThrow(/UNIQUE/);
  });
});

describe('общая касса: только наличные', () => {
  const cashLedger = (methodId: string, amount: number) =>
    env.db
      .prepare('INSERT INTO cash_ledger (id, method_id, amount, doc_type, doc_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv7(), methodId, amount, 'sale', uuidv7(), userId, nowIso());

  it('безналичные способы в cash_ledger не попадают', () => {
    expect(() => cashLedger(cashId, 10_000)).not.toThrow();
    expect(() => cashLedger(methodOfKind(env.db, 'card'), 10_000)).toThrow(/only cash/);
    expect(() => cashLedger(methodOfKind(env.db, 'transfer'), 10_000)).toThrow(/only cash/);
  });

  const cashOp = (type: string, amount: number, reason: string | null, methodId = cashId) =>
    env.db
      .prepare('INSERT INTO cash_operations (id, number, type, amount, method_id, reason, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv7(), `A-C-${uuidv7().slice(-8)}`, type, amount, methodId, reason, userId, nowIso());

  it('внесение, изъятие, расход, инкассация: нужны сумма > 0 и причина', () => {
    for (const type of ['cash_in', 'cash_out', 'expense', 'collection']) {
      expect(() => cashOp(type, 50_000, 'Причина')).not.toThrow();
    }
    expect(() => cashOp('expense', 0, 'Причина')).toThrow();
    expect(() => cashOp('expense', 100, null)).toThrow();
    expect(() => cashOp('expense', 100, '  ')).toThrow();
    expect(() => cashOp('refund', 100, 'x')).toThrow();
    expect(() => cashOp('cash_in', 100, 'x', methodOfKind(env.db, 'card'))).toThrow(/only cash/);
  });

  it('кассовые операции неизменяемы', () => {
    cashOp('cash_in', 1000, 'Размен');
    expect(() => env.db.prepare('UPDATE cash_operations SET amount = 1').run()).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM cash_operations').run()).toThrow(/append-only/);
  });
});

describe('платежи, долги и аллокации', () => {
  function makeSale(db: Db, debt = 0, total = 1000) {
    const id = uuidv7();
    const customerId = debt > 0 ? addCustomer(db, 'Должник') : null;
    db.prepare(
      `INSERT INTO sales (id, number, branch_id, user_id, customer_id, subtotal, total, paid_total, debt_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, `A-${uuidv7().slice(-6)}`, env.branchId, userId, customerId, total, total, total - debt, debt, nowIso());
    return { id, customerId };
  }

  const pay = (fields: Record<string, unknown>) => {
    const row = { id: uuidv7(), method_id: cashId, amount: 100, user_id: userId, created_at: nowIso(), ...fields };
    const keys = Object.keys(row);
    env.db.prepare(`INSERT INTO payments (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
    return row.id as string;
  };

  it('назначение платежа согласовано с его ссылками и направлением', () => {
    const { id: saleId } = makeSale(env.db);
    const customerId = addCustomer(env.db);
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'in' })).not.toThrow();
    expect(() => pay({ purpose: 'sale', direction: 'in' })).toThrow();                         // нет чека
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'out' })).toThrow();       // направление
    expect(() => pay({ purpose: 'return', direction: 'out' })).toThrow();                      // нет возврата
    expect(() => pay({ purpose: 'debt_payment', customer_id: customerId, direction: 'in' })).not.toThrow();
    expect(() => pay({ purpose: 'debt_payment', direction: 'in' })).toThrow();                 // нет клиента
  });

  it('повтор запроса с тем же ключом не создаёт вторую оплату', () => {
    const { id: saleId } = makeSale(env.db);
    pay({ purpose: 'sale', sale_id: saleId, direction: 'in', idempotency_key: 'req-1' });
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'in', idempotency_key: 'req-1' })).toThrow(/UNIQUE/);
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'in', idempotency_key: 'req-2' })).not.toThrow();
  });

  it('принято от клиента не меньше засчитанной суммы (сдача считается)', () => {
    const { id: saleId } = makeSale(env.db);
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'in', amount: 800, tendered: 1000 })).not.toThrow();
    expect(() => pay({ purpose: 'sale', sale_id: saleId, direction: 'in', amount: 800, tendered: 500 })).toThrow();
  });

  it('долг в чеке возможен только с клиентом', () => {
    expect(() =>
      env.db
        .prepare(
          `INSERT INTO sales (id, number, branch_id, user_id, subtotal, total, paid_total, debt_amount, created_at)
           VALUES (?, 'A-DEBT-NOCUST', ?, ?, 1000, 1000, 400, 600, ?)`,
        )
        .run(uuidv7(), env.branchId, userId, nowIso()),
    ).toThrow();
    expect(() => makeSale(env.db, 600)).not.toThrow();
  });

  it('распределение оплаты долга по чекам хранится и защищено от правок', () => {
    const sale1 = makeSale(env.db, 600);
    const customerId = sale1.customerId!;
    const sale2Id = uuidv7();
    env.db
      .prepare(
        `INSERT INTO sales (id, number, branch_id, user_id, customer_id, subtotal, total, paid_total, debt_amount, created_at)
         VALUES (?, 'A-DEBT-2', ?, ?, ?, 500, 500, 0, 500, ?)`,
      )
      .run(sale2Id, env.branchId, userId, customerId, nowIso());

    const addDebt = (saleId: string, type: string, amount: number, extra: Record<string, unknown> = {}) => {
      const id = uuidv7();
      env.db
        .prepare(
          'INSERT INTO debt_ledger (id, customer_id, sale_id, type, amount, payment_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(id, customerId, saleId, type, amount, (extra.payment_id as string) ?? null, userId, nowIso());
      return id;
    };
    addDebt(sale1.id, 'DEBT_ADD', 600);
    addDebt(sale2Id, 'DEBT_ADD', 500);

    // платёж 700: старый чек закрывается полностью (600), остаток 100 идёт на следующий
    const paymentId = pay({ purpose: 'debt_payment', customer_id: customerId, direction: 'in', amount: 700 });
    const d1 = addDebt(sale1.id, 'DEBT_PAY', -600, { payment_id: paymentId });
    const d2 = addDebt(sale2Id, 'DEBT_PAY', -100, { payment_id: paymentId });
    const alloc = env.db.prepare(
      'INSERT INTO debt_payment_allocations (id, payment_id, debt_ledger_id, sale_id, amount) VALUES (?, ?, ?, ?, ?)',
    );
    alloc.run(uuidv7(), paymentId, d1, sale1.id, 600);
    alloc.run(uuidv7(), paymentId, d2, sale2Id, 100);

    const sum = (env.db.prepare('SELECT SUM(amount) AS s FROM debt_payment_allocations WHERE payment_id = ?').get(paymentId) as { s: number }).s;
    expect(sum).toBe(700);
    const balance = (id: string) =>
      (env.db.prepare('SELECT SUM(amount) AS s FROM debt_ledger WHERE sale_id = ?').get(id) as { s: number }).s;
    expect(balance(sale1.id)).toBe(0);
    expect(balance(sale2Id)).toBe(400);

    expect(() => env.db.prepare('UPDATE debt_payment_allocations SET amount = 1').run()).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM debt_payment_allocations').run()).toThrow(/append-only/);
  });

  it('аллокации FIFO неизменяемы; хранят партию и себестоимость', () => {
    const batchId = addBatch(env.db, productId, env.warehouseId, 10_000, 1_000_000);
    const movementId = addMovement(env.db, {
      branchId: env.branchId, warehouseId: env.warehouseId, productId, batchId, type: 'SALE', qty: -5000,
    });
    const { id: saleId } = makeSale(env.db);
    const lineId = uuidv7();
    env.db
      .prepare('INSERT INTO sale_lines (id, sale_id, product_id, qty, base_price, unit_price, line_total) VALUES (?, ?, ?, 5000, 100, 100, 500)')
      .run(lineId, saleId, productId);
    env.db
      .prepare(
        'INSERT INTO sale_line_batch_allocations (id, sale_line_id, batch_id, qty, unit_cost, stock_movement_id) VALUES (?, ?, ?, 5000, 1000000, ?)',
      )
      .run(uuidv7(), lineId, batchId, movementId);
    expect(() => env.db.prepare('UPDATE sale_line_batch_allocations SET qty = 1').run()).toThrow(/append-only/);
    expect(() => env.db.prepare('DELETE FROM sale_line_batch_allocations').run()).toThrow(/append-only/);
  });

  it('причина возврата обязательна', () => {
    const { id: saleId } = makeSale(env.db);
    const ret = (reason: string) =>
      env.db
        .prepare('INSERT INTO returns (id, number, sale_id, user_id, reason, total_refund, created_at) VALUES (?, ?, ?, ?, ?, 100, ?)')
        .run(uuidv7(), `A-R-${uuidv7().slice(-6)}`, saleId, userId, reason, nowIso());
    expect(() => ret('')).toThrow();
    expect(() => ret('   ')).toThrow();
    expect(() => ret('Брак')).not.toThrow();
  });
});

describe('остаток и повторные запросы', () => {
  it('stock_cache не может уйти в минус', () => {
    env.db.prepare('INSERT INTO stock_cache (product_id, warehouse_id, qty) VALUES (?, ?, 1000)').run(productId, env.warehouseId);
    expect(() => env.db.prepare('UPDATE stock_cache SET qty = -1 WHERE product_id = ?').run(productId)).toThrow();
  });

  it('резерв может временно превышать остаток (дефицит после инвентаризации), но не быть отрицательным', () => {
    env.db.prepare('INSERT INTO stock_cache (product_id, warehouse_id, qty, reserved) VALUES (?, ?, 1000, 500)').run(productId, env.warehouseId);
    expect(() => env.db.prepare('UPDATE stock_cache SET qty = 200 WHERE product_id = ?').run(productId)).not.toThrow();
    expect(() => env.db.prepare('UPDATE stock_cache SET reserved = -1 WHERE product_id = ?').run(productId)).toThrow();
  });

  it('ключ идемпотентности уникален', () => {
    const ins = () =>
      env.db.prepare('INSERT INTO idempotency_keys (key, user_id, operation, created_at) VALUES (?, ?, ?, ?)').run('k-1', userId, 'sale.create', nowIso());
    ins();
    expect(ins).toThrow(/UNIQUE|PRIMARY/);
  });

  it('начальные остатки не загружаются: партия только из прихода или инвентаризации', () => {
    const ins = (src: string) =>
      env.db
        .prepare(
          `INSERT INTO batches (id, product_id, warehouse_id, source_type, received_at, qty_in, qty_left, unit_cost, created_at)
           VALUES (?, ?, ?, ?, ?, 1000, 1000, 100, ?)`,
        )
        .run(uuidv7(), productId, env.warehouseId, src, nowIso(), nowIso());
    expect(() => ins('opening')).toThrow();
    expect(() => ins('purchase')).not.toThrow();
    expect(() => ins('stocktake')).not.toThrow();
  });

  it('статусы очереди печати включают printing и uncertain', () => {
    const ins = (status: string) =>
      env.db
        .prepare("INSERT INTO print_jobs (id, doc_type, doc_id, status, created_at, updated_at) VALUES (?, 'sale', ?, ?, ?, ?)")
        .run(uuidv7(), uuidv7(), status, nowIso(), nowIso());
    for (const s of ['pending', 'printing', 'printed', 'error', 'uncertain']) expect(() => ins(s)).not.toThrow();
    expect(() => ins('done')).toThrow();
  });
});
