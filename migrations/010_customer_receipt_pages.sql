CREATE TABLE user_page_permissions_new (
  user_id TEXT NOT NULL REFERENCES users(id),
  page TEXT NOT NULL CHECK (page IN (
    'sales', 'heldCarts', 'reservations', 'print', 'returns', 'writeoffs', 'stocktakes', 'reports',
    'customers', 'receiptSearch',
    'products', 'stock', 'warehouses', 'purchases', 'movements', 'debts', 'cash', 'users', 'connection'
  )),
  value INTEGER NOT NULL DEFAULT 1 CHECK (value IN (0, 1)),
  PRIMARY KEY (user_id, page)
);

INSERT INTO user_page_permissions_new (user_id, page, value)
SELECT user_id, page, value FROM user_page_permissions;

DROP TABLE user_page_permissions;
ALTER TABLE user_page_permissions_new RENAME TO user_page_permissions;

INSERT INTO user_page_permissions (user_id, page, value)
SELECT users.id, pages.page, 1
FROM users
CROSS JOIN (
  SELECT 'customers' AS page UNION ALL SELECT 'receiptSearch'
) AS pages;
