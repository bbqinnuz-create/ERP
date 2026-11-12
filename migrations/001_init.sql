-- 001_init.sql  (ТЗ v2.0)
-- Начальная схема. ПРИМЕНЁННЫЕ МИГРАЦИИ НЕ МЕНЯТЬ: любое изменение структуры только новой миграцией.
--
-- Соглашения:
--   * id = UUID v7 (TEXT), создаётся приложением.
--   * Деньги: целое число в тийинах (1 сум = 100 тийин).
--   * Количество: целое число в тысячных долях (2,5 м = 2500).
--   * Проценты: целое число в базисных пунктах (1% = 100, 5,5% = 550).
--   * Время: UTC, ISO 8601 (TEXT).
--   * Логические поля: 0 или 1.
--   * Кассовых смен нет: ни таблицы shifts, ни полей shift_id (раздел 7.9 ТЗ).

-- ============================================================
-- 5. СПРАВОЧНИКИ И НАСТРОЙКИ
-- ============================================================

CREATE TABLE branches (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,               -- префикс чека, например A
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Несколько складов внутри одного филиала допускаются.
CREATE TABLE warehouses (
  id          TEXT PRIMARY KEY,
  branch_id   TEXT NOT NULL REFERENCES branches(id),
  name        TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  login          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  lang           TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'uz')),
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- Индивидуальные права и лимиты. value: 1/0 для «вкл/выкл» или число (например, лимит скидки в базисных пунктах).
CREATE TABLE user_permissions (
  user_id     TEXT NOT NULL REFERENCES users(id),
  permission  TEXT NOT NULL,
  value       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name_ru     TEXT NOT NULL,
  name_uz     TEXT,
  parent_id   TEXT REFERENCES categories(id),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Какие характеристики есть у товаров категории (толщина, размер, вес, цвет...).
CREATE TABLE attribute_defs (
  id           TEXT PRIMARY KEY,
  category_id  TEXT NOT NULL REFERENCES categories(id),
  key          TEXT NOT NULL,
  name_ru      TEXT NOT NULL,
  name_uz      TEXT,
  type         TEXT NOT NULL CHECK (type IN ('number', 'text', 'list')),
  unit         TEXT,
  options      TEXT,                               -- JSON-массив значений для type = list
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at   TEXT NOT NULL,
  UNIQUE (category_id, key)
);

CREATE TABLE products (
  id           TEXT PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,
  name_ru      TEXT NOT NULL,
  name_uz      TEXT,
  category_id  TEXT REFERENCES categories(id),
  unit         TEXT NOT NULL,                      -- одна базовая единица: приход, остаток и продажа в ней
  attributes   TEXT NOT NULL DEFAULT '{}',         -- JSON: толщина, размер, вес ...
  base_price   INTEGER NOT NULL DEFAULT 0 CHECK (base_price >= 0),   -- тийины за единицу
  min_stock    INTEGER CHECK (min_stock IS NULL OR min_stock >= 0),  -- тысячные; NULL = не контролировать
  barcode      TEXT UNIQUE,                        -- необязательный, уникальный
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_ru ON products(name_ru);

CREATE TABLE customers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  note          TEXT,
  discount_bp   INTEGER NOT NULL DEFAULT 0 CHECK (discount_bp BETWEEN 0 AND 10000),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE TABLE payment_methods (
  id          TEXT PRIMARY KEY,
  name_ru     TEXT NOT NULL,
  name_uz     TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('cash', 'card', 'transfer', 'online')),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL
);

-- Цены по количеству, акции, цены клиентов.
CREATE TABLE price_rules (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('qty', 'promo', 'customer')),
  product_id     TEXT REFERENCES products(id),
  category_id    TEXT REFERENCES categories(id),
  customer_id    TEXT REFERENCES customers(id),
  min_qty        INTEGER,                          -- тысячные
  min_inclusive  INTEGER NOT NULL DEFAULT 1 CHECK (min_inclusive IN (0, 1)),
  max_qty        INTEGER,
  price          INTEGER CHECK (price IS NULL OR price >= 0),              -- тийины за единицу
  percent_bp     INTEGER CHECK (percent_bp IS NULL OR percent_bp BETWEEN 0 AND 10000),
  date_from      TEXT,                             -- YYYY-MM-DD, включительно (Asia/Tashkent)
  date_to        TEXT,
  priority       INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  CHECK (price IS NOT NULL OR percent_bp IS NOT NULL),
  CHECK (product_id IS NOT NULL OR category_id IS NOT NULL)
);
CREATE INDEX idx_price_rules_product ON price_rules(product_id);
CREATE INDEX idx_price_rules_category ON price_rules(category_id);

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Нумерация документов: последний выданный номер по точке и виду документа.
CREATE TABLE counters (
  branch_id   TEXT NOT NULL REFERENCES branches(id),
  name        TEXT NOT NULL,
  last_value  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (branch_id, name)
);

-- ============================================================
-- 6.1 ПАРТИИ И ДВИЖЕНИЯ (ЯДРО)
-- ============================================================

-- Партия прихода. qty_left это кэш: правда = qty_in + движения по batch_id.
-- Начальные остатки не загружаются (ТЗ раздел 4): партии появляются только из прихода
-- (или из излишка инвентаризации).
CREATE TABLE batches (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL REFERENCES products(id),
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  source_type   TEXT NOT NULL CHECK (source_type IN ('purchase', 'stocktake')),
  source_id     TEXT,                              -- id документа прихода / инвентаризации
  received_at   TEXT NOT NULL,
  qty_in        INTEGER NOT NULL CHECK (qty_in > 0),
  qty_left      INTEGER NOT NULL CHECK (qty_left >= 0),
  unit_cost     INTEGER NOT NULL CHECK (unit_cost >= 0),   -- тийины за единицу
  supplier      TEXT,
  created_at    TEXT NOT NULL,
  CHECK (qty_left <= qty_in)
);
-- Выбор партий по FIFO: самые старые с остатком.
CREATE INDEX idx_batches_fifo ON batches(product_id, warehouse_id, received_at, id) WHERE qty_left > 0;

-- Журнал движений товара: главный источник правды. Только добавление.
-- seq даёт локальный порядок; id (UUID) нужен для слияния филиалов.
CREATE TABLE stock_movements (
  seq           INTEGER PRIMARY KEY AUTOINCREMENT,
  id            TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL,
  branch_id     TEXT NOT NULL REFERENCES branches(id),
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  product_id    TEXT NOT NULL REFERENCES products(id),
  batch_id      TEXT REFERENCES batches(id),
  type          TEXT NOT NULL CHECK (type IN
                  ('PURCHASE', 'SALE', 'RETURN', 'WRITE_OFF', 'ADJUST_PLUS', 'ADJUST_MINUS', 'REVERSAL')),
  qty           INTEGER NOT NULL,                  -- со знаком, тысячные
  unit_cost     INTEGER,                           -- себестоимость единицы в тийинах
  unit_price    INTEGER,                           -- цена продажи единицы в тийинах (для SALE/RETURN)
  doc_type      TEXT NOT NULL,                     -- purchase / sale / return / write_off / stocktake ...
  doc_id        TEXT NOT NULL,
  user_id       TEXT REFERENCES users(id),
  reverses_id   TEXT REFERENCES stock_movements(id),
  note          TEXT,
  device_id     TEXT,
  CHECK (
    (type IN ('PURCHASE', 'RETURN', 'ADJUST_PLUS') AND qty > 0) OR
    (type IN ('SALE', 'WRITE_OFF', 'ADJUST_MINUS') AND qty < 0) OR
    (type = 'REVERSAL' AND qty <> 0)
  ),
  CHECK (type <> 'REVERSAL' OR reverses_id IS NOT NULL)
);
CREATE INDEX idx_movements_product ON stock_movements(product_id, warehouse_id);
CREATE INDEX idx_movements_batch ON stock_movements(batch_id);
CREATE INDEX idx_movements_doc ON stock_movements(doc_type, doc_id);
CREATE INDEX idx_movements_created ON stock_movements(created_at);

-- Кэш остатка (для скорости). Пересчитывается из журнала в любой момент; при расхождении права журнал.
-- reserved: сумма активных резервов; доступный остаток = qty - reserved.
-- После инвентаризации reserved может временно превышать qty (дефицит резерва, раздел 7.5).
CREATE TABLE stock_cache (
  product_id    TEXT NOT NULL REFERENCES products(id),
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  qty           INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),   -- продажа в минус запрещена
  reserved      INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  PRIMARY KEY (product_id, warehouse_id)
);

-- ============================================================
-- 6.2 ПРИХОД, СПИСАНИЯ, ИНВЕНТАРИЗАЦИЯ
-- ============================================================

CREATE TABLE purchases (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  supplier      TEXT,
  date          TEXT NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id),
  total_cost    INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  created_at    TEXT NOT NULL
);

CREATE TABLE purchase_lines (
  id           TEXT PRIMARY KEY,
  purchase_id  TEXT NOT NULL REFERENCES purchases(id),
  product_id   TEXT NOT NULL REFERENCES products(id),
  qty          INTEGER NOT NULL CHECK (qty > 0),
  unit_cost    INTEGER NOT NULL CHECK (unit_cost >= 0)
);
CREATE INDEX idx_purchase_lines_purchase ON purchase_lines(purchase_id);

CREATE TABLE write_offs (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  reason        TEXT NOT NULL CHECK (reason IN ('damaged', 'lost', 'expired', 'other')),
  user_id       TEXT NOT NULL REFERENCES users(id),
  note          TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE write_off_lines (
  id            TEXT PRIMARY KEY,
  write_off_id  TEXT NOT NULL REFERENCES write_offs(id),
  product_id    TEXT NOT NULL REFERENCES products(id),
  qty           INTEGER NOT NULL CHECK (qty > 0),
  cost_total    INTEGER NOT NULL CHECK (cost_total >= 0)
);

-- Инвентаризация: выборочная (selected) или полная по складу (all).
CREATE TABLE stocktakes (
  id             TEXT PRIMARY KEY,
  number         TEXT NOT NULL UNIQUE,
  warehouse_id   TEXT NOT NULL REFERENCES warehouses(id),
  mode           TEXT NOT NULL CHECK (mode IN ('selected', 'all')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  user_id        TEXT NOT NULL REFERENCES users(id),
  started_at     TEXT NOT NULL,
  finished_at    TEXT,
  cancel_reason  TEXT,
  note           TEXT,
  CHECK (status <> 'cancelled' OR (cancel_reason IS NOT NULL AND length(trim(cancel_reason)) > 0))
);
-- Не более одной активной инвентаризации на склад: гарантия на уровне БД (раздел 6.2 ТЗ).
CREATE UNIQUE INDEX idx_stocktakes_one_active ON stocktakes(warehouse_id) WHERE status = 'active';

CREATE TABLE stocktake_lines (
  id                TEXT PRIMARY KEY,
  stocktake_id      TEXT NOT NULL REFERENCES stocktakes(id),
  product_id        TEXT NOT NULL REFERENCES products(id),
  qty_system        INTEGER NOT NULL,              -- остаток на момент старта
  qty_counted       INTEGER CHECK (qty_counted IS NULL OR qty_counted >= 0),  -- NULL = ещё не посчитано
  diff              INTEGER,
  manual_unit_cost  INTEGER CHECK (manual_unit_cost IS NULL OR manual_unit_cost >= 0),  -- для излишка без цены прихода
  UNIQUE (stocktake_id, product_id)
);

-- Блокировки товара/склада на время инвентаризации. product_id = NULL означает «весь склад».
CREATE TABLE stocktake_locks (
  id            TEXT PRIMARY KEY,
  stocktake_id  TEXT NOT NULL REFERENCES stocktakes(id),
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  product_id    TEXT REFERENCES products(id),
  created_at    TEXT NOT NULL,
  released_at   TEXT
);
CREATE UNIQUE INDEX idx_locks_active_product ON stocktake_locks(warehouse_id, product_id)
  WHERE released_at IS NULL AND product_id IS NOT NULL;
CREATE UNIQUE INDEX idx_locks_active_warehouse ON stocktake_locks(warehouse_id)
  WHERE released_at IS NULL AND product_id IS NULL;
CREATE INDEX idx_locks_stocktake ON stocktake_locks(stocktake_id);

-- ============================================================
-- 6.5 СЕССИИ (раздел 10.1 ТЗ)
-- ============================================================

-- Одна активная сессия на пользователя. Новый вход отзывает старую.
-- Срок жизни: 12 ч от входа и 2 ч бездействия (проверяет сервер).
CREATE TABLE sessions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  token_hash            TEXT NOT NULL UNIQUE,       -- хэш токена, сам токен в базе не хранится
  device_id             TEXT,
  created_at            TEXT NOT NULL,
  absolute_expires_at   TEXT NOT NULL,
  last_activity_at      TEXT NOT NULL,
  revoked_at            TEXT,
  revoke_reason         TEXT                        -- login_elsewhere / logout / expired / admin
);
CREATE UNIQUE INDEX idx_sessions_one_active ON sessions(user_id) WHERE revoked_at IS NULL;

-- ============================================================
-- 6.4 КОРЗИНЫ И РЕЗЕРВЫ
-- ============================================================

-- Постоянная обычная корзина: одна текущая на пользователя. Хранится в БД, переживает выход и перезапуск.
CREATE TABLE carts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  sale_id     TEXT,                                -- чек, в который закрыта корзина
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_carts_one_active ON carts(user_id) WHERE status = 'active';

-- Одинаковый товар объединяется в одну строку (UNIQUE), цена по количеству считается по суммарному qty.
CREATE TABLE cart_lines (
  id          TEXT PRIMARY KEY,
  cart_id     TEXT NOT NULL REFERENCES carts(id),
  product_id  TEXT NOT NULL REFERENCES products(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  updated_at  TEXT NOT NULL,
  UNIQUE (cart_id, product_id)
);

CREATE TABLE held_carts (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES customers(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  sale_id      TEXT,                               -- чек, в который закрыта корзина
  created_at   TEXT NOT NULL,
  closed_at    TEXT
);
CREATE INDEX idx_held_carts_user ON held_carts(user_id, status);

CREATE TABLE held_cart_lines (
  id          TEXT PRIMARY KEY,
  cart_id     TEXT NOT NULL REFERENCES held_carts(id),
  product_id  TEXT NOT NULL REFERENCES products(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE reservations (
  id            TEXT PRIMARY KEY,
  cart_id       TEXT NOT NULL REFERENCES held_carts(id),
  product_id    TEXT NOT NULL REFERENCES products(id),
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  qty           INTEGER NOT NULL CHECK (qty > 0),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'consumed')),
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL,
  expires_at    TEXT,
  released_at   TEXT,
  released_by   TEXT REFERENCES users(id)
);
CREATE INDEX idx_reservations_active ON reservations(product_id, warehouse_id) WHERE status = 'active';

-- ============================================================
-- 6.3 ПРОДАЖИ И ВОЗВРАТЫ
-- ============================================================

CREATE TABLE sales (
  id             TEXT PRIMARY KEY,
  number         TEXT NOT NULL UNIQUE,
  branch_id      TEXT NOT NULL REFERENCES branches(id),
  user_id        TEXT NOT NULL REFERENCES users(id),
  customer_id    TEXT REFERENCES customers(id),
  customer_name  TEXT,                             -- имя, введённое кассиром; пусто = на чеке номер чека
  subtotal       INTEGER NOT NULL CHECK (subtotal >= 0),
  discount_total INTEGER NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total          INTEGER NOT NULL CHECK (total >= 0),
  paid_total     INTEGER NOT NULL DEFAULT 0 CHECK (paid_total >= 0),   -- засчитанная в оплату сумма (без сдачи)
  debt_amount    INTEGER NOT NULL DEFAULT 0 CHECK (debt_amount >= 0),
  cost_total     INTEGER NOT NULL DEFAULT 0,
  profit         INTEGER NOT NULL DEFAULT 0,
  lang           TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'uz')),
  cart_id        TEXT,                             -- обычная или отложенная корзина-источник
  created_at     TEXT NOT NULL,
  device_id      TEXT,
  CHECK (paid_total + debt_amount = total),
  CHECK (debt_amount = 0 OR customer_id IS NOT NULL)   -- долг только с выбранным клиентом
);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_user ON sales(user_id, created_at);

CREATE TABLE sale_lines (
  id              TEXT PRIMARY KEY,
  sale_id         TEXT NOT NULL REFERENCES sales(id),
  product_id      TEXT NOT NULL REFERENCES products(id),
  qty             INTEGER NOT NULL CHECK (qty > 0),
  base_price      INTEGER NOT NULL CHECK (base_price >= 0),
  unit_price      INTEGER NOT NULL CHECK (unit_price >= 0),    -- после правил цены
  price_rule_id   TEXT REFERENCES price_rules(id),
  line_discount   INTEGER NOT NULL DEFAULT 0 CHECK (line_discount >= 0),  -- доля скидок чека и ручных, распределённая на строку
  line_total      INTEGER NOT NULL CHECK (line_total >= 0),
  cost_total      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sale_lines_sale ON sale_lines(sale_id);
CREATE INDEX idx_sale_lines_product ON sale_lines(product_id);

-- Распределение строки чека по партиям FIFO. Основа возврата в исходные партии с исходной себестоимостью.
CREATE TABLE sale_line_batch_allocations (
  id                  TEXT PRIMARY KEY,
  sale_line_id        TEXT NOT NULL REFERENCES sale_lines(id),
  batch_id            TEXT NOT NULL REFERENCES batches(id),
  qty                 INTEGER NOT NULL CHECK (qty > 0),
  unit_cost           INTEGER NOT NULL CHECK (unit_cost >= 0),
  stock_movement_id   TEXT NOT NULL REFERENCES stock_movements(id)
);
CREATE INDEX idx_allocations_line ON sale_line_batch_allocations(sale_line_id);
CREATE INDEX idx_allocations_batch ON sale_line_batch_allocations(batch_id);

CREATE TABLE sale_discounts (
  id            TEXT PRIMARY KEY,
  sale_id       TEXT NOT NULL REFERENCES sales(id),
  sale_line_id  TEXT REFERENCES sale_lines(id),
  kind          TEXT NOT NULL CHECK (kind IN ('qty', 'promo', 'customer', 'check', 'manual')),
  rule_id       TEXT REFERENCES price_rules(id),
  amount        INTEGER NOT NULL CHECK (amount >= 0),
  percent_bp    INTEGER,
  user_id       TEXT REFERENCES users(id),
  approved_by   TEXT REFERENCES users(id)
);
CREATE INDEX idx_sale_discounts_sale ON sale_discounts(sale_id);

CREATE TABLE returns (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  sale_id       TEXT NOT NULL REFERENCES sales(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  reason        TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  total_refund  INTEGER NOT NULL CHECK (total_refund >= 0),
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_returns_sale ON returns(sale_id);

CREATE TABLE return_lines (
  id             TEXT PRIMARY KEY,
  return_id      TEXT NOT NULL REFERENCES returns(id),
  sale_line_id   TEXT NOT NULL REFERENCES sale_lines(id),
  qty            INTEGER NOT NULL CHECK (qty > 0),
  refund_amount  INTEGER NOT NULL CHECK (refund_amount >= 0),
  cost_total     INTEGER NOT NULL CHECK (cost_total >= 0)
);

-- ============================================================
-- 6.4 ДЕНЬГИ И ДОЛГИ (ЖУРНАЛЫ, ТОЛЬКО ДОБАВЛЕНИЕ)
-- ============================================================

-- Поступления и выплаты по способам оплаты: оплата чека, выплата по возврату, оплата долга.
-- В одном чеке может быть несколько строк (смешанная оплата).
CREATE TABLE payments (
  id               TEXT PRIMARY KEY,
  purpose          TEXT NOT NULL CHECK (purpose IN ('sale', 'return', 'debt_payment')),
  sale_id          TEXT REFERENCES sales(id),
  return_id        TEXT REFERENCES returns(id),
  customer_id      TEXT REFERENCES customers(id),
  method_id        TEXT NOT NULL REFERENCES payment_methods(id),
  amount           INTEGER NOT NULL CHECK (amount > 0),        -- засчитанная сумма
  tendered         INTEGER CHECK (tendered IS NULL OR tendered >= amount),  -- принято от клиента (для сдачи на чеке)
  direction        TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  user_id          TEXT NOT NULL REFERENCES users(id),
  idempotency_key  TEXT UNIQUE,                                -- повтор запроса не создаёт повторную оплату
  created_at       TEXT NOT NULL,
  CHECK (
    (purpose = 'sale'         AND sale_id IS NOT NULL     AND direction = 'in') OR
    (purpose = 'return'       AND return_id IS NOT NULL   AND direction = 'out') OR
    (purpose = 'debt_payment' AND customer_id IS NOT NULL AND direction = 'in')
  )
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_return ON payments(return_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Долги клиентов по конкретным чекам: баланс чека и клиента = сумма amount.
--   DEBT_ADD     : долг по чеку (сумма > 0);
--   DEBT_PAY     : погашение (сумма < 0): оплатой (payment_id) либо зачётом при возврате (return_id);
--   DEBT_FORGIVE : прощение (сумма < 0), только администратор, причина обязательна.
CREATE TABLE debt_ledger (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES customers(id),
  sale_id      TEXT NOT NULL REFERENCES sales(id),
  type         TEXT NOT NULL CHECK (type IN ('DEBT_ADD', 'DEBT_PAY', 'DEBT_FORGIVE')),
  amount       INTEGER NOT NULL,                   -- со знаком, тийины
  payment_id   TEXT REFERENCES payments(id),
  return_id    TEXT REFERENCES returns(id),
  method_id    TEXT REFERENCES payment_methods(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  note         TEXT,
  created_at   TEXT NOT NULL,
  CHECK (
    (type = 'DEBT_ADD' AND amount > 0) OR
    (type IN ('DEBT_PAY', 'DEBT_FORGIVE') AND amount < 0)
  ),
  CHECK (type <> 'DEBT_FORGIVE' OR (note IS NOT NULL AND length(trim(note)) > 0))
);
CREATE INDEX idx_debt_customer ON debt_ledger(customer_id);
CREATE INDEX idx_debt_sale ON debt_ledger(sale_id);

-- Распределение платежа по долгу между конкретными чеками. Сумма распределений равна платежу.
CREATE TABLE debt_payment_allocations (
  id               TEXT PRIMARY KEY,
  payment_id       TEXT NOT NULL REFERENCES payments(id),
  debt_ledger_id   TEXT NOT NULL REFERENCES debt_ledger(id),
  sale_id          TEXT NOT NULL REFERENCES sales(id),
  amount           INTEGER NOT NULL CHECK (amount > 0)
);
CREATE INDEX idx_debt_alloc_payment ON debt_payment_allocations(payment_id);
CREATE INDEX idx_debt_alloc_sale ON debt_payment_allocations(sale_id);

-- Документы общей кассы: внесение, изъятие, расход, инкассация. Исправление только встречной записью.
CREATE TABLE cash_operations (
  id           TEXT PRIMARY KEY,
  number       TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out', 'expense', 'collection')),
  amount       INTEGER NOT NULL CHECK (amount > 0),
  method_id    TEXT NOT NULL REFERENCES payment_methods(id),   -- наличные
  reason       TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  category     TEXT,                                -- для расходов
  reference    TEXT,                                -- подтверждающие данные (номер акта, квитанции)
  reverses_id  TEXT REFERENCES cash_operations(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL,
  device_id    TEXT
);
CREATE INDEX idx_cash_ops_created ON cash_operations(created_at);

-- Физическая наличность ОДНОЙ общей кассы: только движение наличных.
-- Карта, перевод и онлайн в этот журнал не попадают (хранятся в payments).
CREATE TABLE cash_ledger (
  id          TEXT PRIMARY KEY,
  method_id   TEXT NOT NULL REFERENCES payment_methods(id),
  amount      INTEGER NOT NULL CHECK (amount <> 0),   -- со знаком, тийины
  doc_type    TEXT NOT NULL,                          -- sale / return / debt_payment / cash_operation
  doc_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_cash_created ON cash_ledger(created_at);
CREATE INDEX idx_cash_doc ON cash_ledger(doc_type, doc_id);

-- Защита от повторных запросов (двойной клик, повтор после сбоя сети).
CREATE TABLE idempotency_keys (
  key          TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  operation    TEXT NOT NULL,
  result_type  TEXT,
  result_id    TEXT,
  created_at   TEXT NOT NULL
);

-- ============================================================
-- 6.5 СЛУЖЕБНЫЕ
-- ============================================================

CREATE TABLE audit_log (
  id           TEXT PRIMARY KEY,
  at           TEXT NOT NULL,
  user_id      TEXT REFERENCES users(id),
  action       TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    TEXT,
  before_json  TEXT,
  after_json   TEXT,
  device_id    TEXT
);
CREATE INDEX idx_audit_at ON audit_log(at);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);

-- Очередь печати. printing: задание отправлено на принтер. uncertain: после сбоя питания неизвестно,
-- напечатан ли чек (оператор проверяет принтер перед повтором, раздел 7.8).
CREATE TABLE print_jobs (
  id          TEXT PRIMARY KEY,
  doc_type    TEXT NOT NULL,
  doc_id      TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'original' CHECK (kind IN ('original', 'copy')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'printing', 'printed', 'error', 'uncertain')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);

-- Очередь отправки в облако. Статус отправки хранится ТОЛЬКО здесь:
-- журналы менять нельзя, поэтому в них нет поля synced_at.
CREATE TABLE sync_outbox (
  id          TEXT PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  sent_at     TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (table_name, record_id)
);
CREATE INDEX idx_outbox_pending ON sync_outbox(created_at) WHERE sent_at IS NULL;

-- ============================================================
-- ЗАЩИТА ЖУРНАЛОВ: запрет UPDATE и DELETE
-- Ошибка исправляется встречной записью, а не правкой.
-- ============================================================

CREATE TRIGGER trg_stock_movements_no_update BEFORE UPDATE ON stock_movements
BEGIN SELECT RAISE(ABORT, 'stock_movements is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_stock_movements_no_delete BEFORE DELETE ON stock_movements
BEGIN SELECT RAISE(ABORT, 'stock_movements is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_payments_no_update BEFORE UPDATE ON payments
BEGIN SELECT RAISE(ABORT, 'payments is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_payments_no_delete BEFORE DELETE ON payments
BEGIN SELECT RAISE(ABORT, 'payments is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_debt_ledger_no_update BEFORE UPDATE ON debt_ledger
BEGIN SELECT RAISE(ABORT, 'debt_ledger is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_debt_ledger_no_delete BEFORE DELETE ON debt_ledger
BEGIN SELECT RAISE(ABORT, 'debt_ledger is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_cash_ledger_no_update BEFORE UPDATE ON cash_ledger
BEGIN SELECT RAISE(ABORT, 'cash_ledger is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_cash_ledger_no_delete BEFORE DELETE ON cash_ledger
BEGIN SELECT RAISE(ABORT, 'cash_ledger is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only: DELETE is forbidden'); END;

-- Связанные записи журналов тоже неизменяемы: на них держатся возвраты и сверка долгов.
CREATE TRIGGER trg_sale_allocations_no_update BEFORE UPDATE ON sale_line_batch_allocations
BEGIN SELECT RAISE(ABORT, 'sale_line_batch_allocations is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_sale_allocations_no_delete BEFORE DELETE ON sale_line_batch_allocations
BEGIN SELECT RAISE(ABORT, 'sale_line_batch_allocations is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_debt_allocations_no_update BEFORE UPDATE ON debt_payment_allocations
BEGIN SELECT RAISE(ABORT, 'debt_payment_allocations is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_debt_allocations_no_delete BEFORE DELETE ON debt_payment_allocations
BEGIN SELECT RAISE(ABORT, 'debt_payment_allocations is append-only: DELETE is forbidden'); END;

CREATE TRIGGER trg_cash_operations_no_update BEFORE UPDATE ON cash_operations
BEGIN SELECT RAISE(ABORT, 'cash_operations is append-only: UPDATE is forbidden'); END;
CREATE TRIGGER trg_cash_operations_no_delete BEFORE DELETE ON cash_operations
BEGIN SELECT RAISE(ABORT, 'cash_operations is append-only: DELETE is forbidden'); END;

-- ============================================================
-- ЗАЩИТА НА УРОВНЕ БД (кроме проверок сервера)
-- ============================================================

-- В cash_ledger попадают только наличные.
CREATE TRIGGER trg_cash_ledger_cash_only BEFORE INSERT ON cash_ledger
WHEN (SELECT kind FROM payment_methods WHERE id = NEW.method_id) <> 'cash'
BEGIN SELECT RAISE(ABORT, 'cash_ledger accepts only cash payment methods'); END;

CREATE TRIGGER trg_cash_operations_cash_only BEFORE INSERT ON cash_operations
WHEN (SELECT kind FROM payment_methods WHERE id = NEW.method_id) <> 'cash'
BEGIN SELECT RAISE(ABORT, 'cash_operations accepts only cash payment methods'); END;

-- Товар, заблокированный активной инвентаризацией, нельзя продавать, принимать, возвращать,
-- списывать и корректировать. Исключение: движения самой инвентаризации (doc_type = 'stocktake'),
-- которые создаются при её завершении до снятия блокировок. Сервер проверяет то же самое в коде,
-- а этот триггер страхует от ошибок в коде.
CREATE TRIGGER trg_stock_movements_stocktake_lock BEFORE INSERT ON stock_movements
WHEN NEW.doc_type <> 'stocktake' AND EXISTS (
  SELECT 1 FROM stocktake_locks l
  WHERE l.released_at IS NULL
    AND l.warehouse_id = NEW.warehouse_id
    AND (l.product_id IS NULL OR l.product_id = NEW.product_id)
)
BEGIN SELECT RAISE(ABORT, 'stock movement rejected: product is locked by an active stocktake'); END;

-- ============================================================
-- НАСТРОЙКИ ПО УМОЛЧАНИЮ
-- ============================================================

INSERT INTO settings (key, value, updated_at) VALUES
  ('allow_negative_stock',     '0',             strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('allow_sell_below_cost',    '0',             strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('price_rules_mode',         'lowest',        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('rounding',                 'sum',           strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('reserve_days',             '0',             strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('min_stock_alerts',         '1',             strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('receipt_lang_default',     'ru',            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('return_without_receipt',   '0',             strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('session_absolute_hours',   '12',            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('session_idle_minutes',     '120',           strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('timezone',                 'Asia/Tashkent', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
