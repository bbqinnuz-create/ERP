CREATE TABLE user_page_permissions (
  user_id TEXT NOT NULL REFERENCES users(id),
  page TEXT NOT NULL CHECK (page IN (
    'sales', 'heldCarts', 'reservations', 'print', 'returns', 'writeoffs', 'stocktakes', 'reports',
    'products', 'stock', 'warehouses', 'purchases', 'movements', 'debts', 'cash', 'users', 'connection'
  )),
  value INTEGER NOT NULL DEFAULT 1 CHECK (value IN (0, 1)),
  PRIMARY KEY (user_id, page)
);

CREATE TABLE user_sales_warehouses (
  user_id TEXT NOT NULL REFERENCES users(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  PRIMARY KEY (user_id, warehouse_id)
);

CREATE INDEX idx_user_sales_warehouses_warehouse ON user_sales_warehouses(warehouse_id);

INSERT INTO user_sales_warehouses (user_id, warehouse_id)
SELECT u.id, w.id
FROM users u
JOIN settings s ON s.key = 'default_warehouse_id'
JOIN warehouses w ON w.id = s.value AND w.active = 1
JOIN branches b ON b.id = w.branch_id AND b.active = 1
WHERE u.role = 'cashier';

INSERT INTO user_page_permissions (user_id, page, value)
SELECT users.id, pages.page, 1
FROM users
CROSS JOIN (
  SELECT 'sales' AS page UNION ALL SELECT 'heldCarts' UNION ALL SELECT 'reservations'
  UNION ALL SELECT 'print' UNION ALL SELECT 'returns' UNION ALL SELECT 'writeoffs'
  UNION ALL SELECT 'stocktakes' UNION ALL SELECT 'reports' UNION ALL SELECT 'products'
  UNION ALL SELECT 'stock' UNION ALL SELECT 'warehouses' UNION ALL SELECT 'purchases'
  UNION ALL SELECT 'movements' UNION ALL SELECT 'debts' UNION ALL SELECT 'cash'
  UNION ALL SELECT 'users' UNION ALL SELECT 'connection'
) AS pages;
