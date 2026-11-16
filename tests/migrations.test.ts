import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
import { openDb } from '../src/db/connection';
import { migrate, DEFAULT_MIGRATIONS_DIR } from '../src/db/migrate';
import { ensureBranch } from '../src/core/setup';
import { addUser, makeEnv } from './helpers';

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function tempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'kassa-mig-'));
  const db = openDb({ path: join(dir, 'm.db') });
  cleanups.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, dir };
}

const EXPECTED_TABLES = [
  // справочники и настройки
  'branches', 'warehouses', 'users', 'user_permissions', 'categories', 'attribute_defs', 'products',
  'user_page_permissions', 'user_sales_warehouses',
  'customers', 'payment_methods', 'price_rules', 'settings', 'counters',
  // ядро: партии, движения, кэш, аллокации FIFO
  'batches', 'stock_movements', 'stock_cache', 'sale_line_batch_allocations',
  // приход, списание, инвентаризация и блокировки
  'purchases', 'purchase_lines', 'write_offs', 'write_off_lines', 'stocktakes', 'stocktake_lines', 'stocktake_locks',
  // сессии, корзины, резервы
  'sessions', 'carts', 'cart_lines', 'held_carts', 'held_cart_lines', 'reservations',
  // продажи и возвраты
  'sales', 'sale_lines', 'sale_discounts', 'returns', 'return_lines',
  // деньги, долги, общая касса
  'payments', 'debt_ledger', 'debt_payment_allocations', 'cash_ledger', 'cash_operations', 'idempotency_keys',
  // служебные
  'audit_log', 'print_jobs', 'sync_outbox', 'schema_migrations',
];

describe('миграции', () => {
  it('строят пустую базу с нуля: все таблицы из ТЗ созданы', () => {
    const { db } = tempDb();
    const result = migrate(db);
    expect(result.applied).toContain('001_init.sql');
    expect(result.applied).toContain('002_print_receipts.sql');
    expect(result.applied).toContain('004_optional_held_cart_customer.sql');
    expect(result.applied).toContain('005_user_page_and_warehouse_access.sql');
    expect(result.applied).toContain('006_sale_payment_permissions.sql');
    expect(result.applied).toContain('008_remove_counter_payment.sql');
    expect(result.applied).toContain('009_immutable_sales.sql');

    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (r) => r.name,
    );
    for (const t of EXPECTED_TABLES) expect(tables, `нет таблицы ${t}`).toContain(t);
    const printColumns = db.pragma('table_info(print_jobs)') as Array<{ name: string }>;
    expect(printColumns.map((column) => column.name)).toContain('lang');
    expect(printColumns.map((column) => column.name)).toContain('snapshot_json');
    const heldCartCustomer = (db.pragma('table_info(held_carts)') as Array<{ name: string; notnull: number }>)
      .find((column) => column.name === 'customer_id');
    expect(heldCartCustomer?.notnull).toBe(0);
    expect(db.prepare('SELECT 1 FROM settings WHERE key = ?').get('counter_reservation_hours')).toBeUndefined();
    expect(db.prepare('SELECT 1 FROM user_permissions WHERE permission = ?').get('pay_at_counter')).toBeUndefined();
    const saleTriggers = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_sales_no_%' ORDER BY name",
    ).all() as Array<{ name: string }>;
    expect(saleTriggers.map((trigger) => trigger.name)).toEqual([
      'trg_sales_no_delete',
      'trg_sales_no_update',
    ]);
  });

  it('повторный запуск ничего не меняет', () => {
    const { db } = tempDb();
    migrate(db);
    const second = migrate(db);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toContain('001_init.sql');
    expect(second.alreadyApplied).toContain('002_print_receipts.sql');
    expect(second.alreadyApplied).toContain('004_optional_held_cart_customer.sql');
    expect(second.alreadyApplied).toContain('005_user_page_and_warehouse_access.sql');
    expect(second.alreadyApplied).toContain('006_sale_payment_permissions.sql');
    expect(second.alreadyApplied).toContain('008_remove_counter_payment.sql');
    expect(second.alreadyApplied).toContain('009_immutable_sales.sql');
  });

  it('загружает настройки по умолчанию', () => {
    const { db } = tempDb();
    migrate(db);
    const get = (k: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(k) as { value: string }).value;
    expect(get('allow_negative_stock')).toBe('0');
    expect(get('price_rules_mode')).toBe('lowest');
    expect(get('session_absolute_hours')).toBe('12');
    expect(get('session_idle_minutes')).toBe('120');
    expect(get('timezone')).toBe('Asia/Tashkent');
  });

  it('новые миграции добавляются поверх старых', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    for (const f of readdirSync(DEFAULT_MIGRATIONS_DIR)) copyFileSync(join(DEFAULT_MIGRATIONS_DIR, f), join(migDir, f));
    migrate(db, migDir);
    writeFileSync(join(migDir, '002_extra.sql'), 'CREATE TABLE extra_test (id TEXT PRIMARY KEY);');
    const r = migrate(db, migDir);
    expect(r.applied).toEqual(['002_extra.sql']);
  });

  it('сохраняет прежний доступ кассира и общий склад при миграции прав', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    for (const file of readdirSync(DEFAULT_MIGRATIONS_DIR)
      .filter((name) => ![
        '005_user_page_and_warehouse_access.sql',
        '006_sale_payment_permissions.sql',
        '008_remove_counter_payment.sql',
        '009_immutable_sales.sql',
      ].includes(name))) {
      copyFileSync(join(DEFAULT_MIGRATIONS_DIR, file), join(migDir, file));
    }
    migrate(db, migDir);
    const { warehouseId } = ensureBranch(db, { code: 'A', name: 'Тест' });
    db.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
    ).run('default_warehouse_id', warehouseId, new Date().toISOString());
    const cashierId = addUser(db, 'legacy-cashier');

    copyFileSync(
      join(DEFAULT_MIGRATIONS_DIR, '005_user_page_and_warehouse_access.sql'),
      join(migDir, '005_user_page_and_warehouse_access.sql'),
    );
    migrate(db, migDir);

    expect(db.prepare('SELECT page, value FROM user_page_permissions WHERE user_id = ?')
      .all(cashierId)).toHaveLength(17);
    expect(db.prepare('SELECT warehouse_id FROM user_sales_warehouses WHERE user_id = ?').get(cashierId))
      .toEqual({ warehouse_id: warehouseId });

    copyFileSync(
      join(DEFAULT_MIGRATIONS_DIR, '006_sale_payment_permissions.sql'),
      join(migDir, '006_sale_payment_permissions.sql'),
    );
    migrate(db, migDir);
    expect(db.prepare(
      'SELECT permission, value FROM user_permissions WHERE user_id = ? AND permission LIKE \'pay_%\' ORDER BY permission',
    ).all(cashierId)).toEqual([
      { permission: 'pay_at_counter', value: 0 },
      { permission: 'pay_card', value: 1 },
      { permission: 'pay_cash', value: 1 },
      { permission: 'pay_transfer', value: 1 },
    ]);

    for (const file of ['008_remove_counter_payment.sql', '009_immutable_sales.sql']) {
      copyFileSync(join(DEFAULT_MIGRATIONS_DIR, file), join(migDir, file));
    }
    migrate(db, migDir);
    expect(db.prepare('SELECT 1 FROM user_permissions WHERE user_id = ? AND permission = ?')
      .get(cashierId, 'pay_at_counter')).toBeUndefined();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'counter_orders'")
      .get()).toEqual({ name: 'counter_orders' });
  });

  it('изменённая применённая миграция отклоняется', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    writeFileSync(join(migDir, '001_a.sql'), 'CREATE TABLE a (id TEXT);');
    migrate(db, migDir);
    writeFileSync(join(migDir, '001_a.sql'), 'CREATE TABLE a (id TEXT, extra TEXT);');
    expect(() => migrate(db, migDir)).toThrow(/уже применена/);
  });

  it('удалённый файл применённой миграции отклоняется', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    writeFileSync(join(migDir, '001_a.sql'), 'CREATE TABLE a (id TEXT);');
    migrate(db, migDir);
    rmSync(join(migDir, '001_a.sql'));
    expect(() => migrate(db, migDir)).toThrow(/отсутствует/);
  });

  it('ошибка в миграции откатывает её целиком', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    writeFileSync(join(migDir, '001_bad.sql'), 'CREATE TABLE ok_table (id TEXT); CREATE TABLE broken (;');
    expect(() => migrate(db, migDir)).toThrow(/001_bad/);
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE name = 'ok_table'").get();
    expect(exists).toBeUndefined();
    const recorded = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number };
    expect(recorded.n).toBe(0);
  });

  it('контрольная сумма не зависит от CRLF/LF', () => {
    const { db, dir } = tempDb();
    const migDir = join(dir, 'migrations');
    mkdirSync(migDir);
    writeFileSync(join(migDir, '001_a.sql'), 'CREATE TABLE a (id TEXT);\n-- comment\n');
    migrate(db, migDir);
    writeFileSync(join(migDir, '001_a.sql'), 'CREATE TABLE a (id TEXT);\r\n-- comment\r\n');
    expect(() => migrate(db, migDir)).not.toThrow();
  });
});

describe('соединение с базой', () => {
  it('включает безопасные режимы SQLite', () => {
    const env = makeEnv();
    cleanups.push(env.cleanup);
    expect(env.db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(env.db.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(env.db.pragma('synchronous', { simple: true })).toBe(2); // FULL
  });

  it('в тестах отказывается открывать нетемпорарную базу', () => {
    // путь заведомо вне временной папки (корень диска), независимо от того, где лежит проект
    const outside = join(parse(tmpdir()).root, 'kassa-production', 'kassa.db');
    expect(() => openDb({ path: outside })).toThrow(/non-temporary/);
    expect(() => openDb({ path: join(parse(tmpdir()).root, 'other.db') })).toThrow(/non-temporary/);
  });

  it('без DB_PATH не запускается', () => {
    const saved = process.env.DB_PATH;
    delete process.env.DB_PATH;
    try {
      expect(() => openDb()).toThrow(/DB_PATH/);
    } finally {
      if (saved !== undefined) process.env.DB_PATH = saved;
    }
  });
});
