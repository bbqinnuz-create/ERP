INSERT INTO settings (key, value, updated_at)
VALUES ('counter_reservation_hours', '2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE counter_orders (
  id              TEXT PRIMARY KEY,
  number          TEXT NOT NULL UNIQUE,
  branch_id       TEXT NOT NULL REFERENCES branches(id),
  warehouse_id    TEXT NOT NULL REFERENCES warehouses(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  customer_id     TEXT REFERENCES customers(id),
  customer_name   TEXT,
  held_cart_id    TEXT NOT NULL UNIQUE REFERENCES held_carts(id),
  subtotal        INTEGER NOT NULL CHECK (subtotal >= 0),
  discount_total  INTEGER NOT NULL CHECK (discount_total >= 0),
  total           INTEGER NOT NULL CHECK (total >= 0),
  quote_json      TEXT NOT NULL,
  lang            TEXT NOT NULL CHECK (lang IN ('ru', 'uz')),
  idempotency_key TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  sale_id         TEXT UNIQUE REFERENCES sales(id),
  paid_by         TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  paid_at         TEXT,
  CHECK ((status = 'paid' AND sale_id IS NOT NULL AND paid_by IS NOT NULL AND paid_at IS NOT NULL) OR
         (status <> 'paid' AND sale_id IS NULL AND paid_by IS NULL AND paid_at IS NULL))
);
CREATE INDEX idx_counter_orders_status_expiry ON counter_orders(status, expires_at);
CREATE INDEX idx_counter_orders_warehouse ON counter_orders(warehouse_id, status, created_at);
