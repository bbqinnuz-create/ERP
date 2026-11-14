import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { parseQty } from '../../core/qty';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { hasPermission } from '../auth/permissions';

export interface HeldCart {
  id: string;
  customerId: string | null;
  customerName: string | null;
  userId: string;
  userName: string;
  status: 'open' | 'closed' | 'cancelled';
  saleId: string | null;
  createdAt: string;
  lines: Array<{ productId: string; sku: string; name: string; unit: string; basePrice: number; qty: number }>;
  reservations: Array<{ id: string; productId: string; warehouseId: string; qty: number; expiresAt: string | null }>;
}

function assertPermission(db: Db, userId: string, permission: 'hold_cart' | 'reserve_cart'): void {
  if (!hasPermission(db, userId, permission)) throw new AuthError(403, 'auth.permission_denied');
}

function assertOwner(db: Db, userId: string, cartId: string): { user_id: string; status: string } {
  const cart = db.prepare('SELECT user_id, status FROM held_carts WHERE id = ?').get(cartId) as
    { user_id: string; status: string } | undefined;
  if (!cart) throw new AuthError(404, 'cart.held_not_found');
  const role = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
  if (cart.user_id !== userId && role?.role !== 'admin') throw new AuthError(403, 'auth.permission_denied');
  return cart;
}

function updateReservedCache(db: Db, productId: string, warehouseId: string): void {
  const stock = db.prepare(
    `SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements
     WHERE product_id = ? AND warehouse_id = ?`,
  ).get(productId, warehouseId) as { qty: number };
  const reserved = db.prepare(
    `SELECT COALESCE(SUM(qty), 0) AS qty FROM reservations
     WHERE product_id = ? AND warehouse_id = ? AND status = 'active'`,
  ).get(productId, warehouseId) as { qty: number };
  if (!Number.isSafeInteger(stock.qty) || !Number.isSafeInteger(reserved.qty) || stock.qty < 0 || reserved.qty < 0) {
    throw new Error('reservation.balance_invalid');
  }
  db.prepare(
    `INSERT INTO stock_cache (product_id, warehouse_id, qty, reserved) VALUES (?, ?, ?, ?)
     ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty = excluded.qty, reserved = excluded.reserved`,
  ).run(productId, warehouseId, stock.qty, reserved.qty);
}

export function expireReservations(db: Db, now = nowIso()): number {
  if (!db.inTransaction) throw new Error('expireReservations must run inside a transaction.');
  const expired = db.prepare(
    `SELECT id, product_id, warehouse_id, qty, user_id
     FROM reservations WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?`,
  ).all(now) as Array<{
    id: string; product_id: string; warehouse_id: string; qty: number; user_id: string;
  }>;
  const affected = new Map<string, { productId: string; warehouseId: string }>();
  const update = db.prepare(
    `UPDATE reservations SET status = 'released', released_at = ?
     WHERE id = ? AND status = 'active'`,
  );
  for (const reservation of expired) {
    update.run(now, reservation.id);
    affected.set(`${reservation.product_id}\u0000${reservation.warehouse_id}`, {
      productId: reservation.product_id,
      warehouseId: reservation.warehouse_id,
    });
    writeAudit(db, {
      userId: null,
      action: 'reservation.expire',
      entity: 'reservations',
      entityId: reservation.id,
      before: { status: 'active', qty: reservation.qty },
      after: { status: 'released', reason: 'expired' },
    });
  }
  for (const pair of affected.values()) updateReservedCache(db, pair.productId, pair.warehouseId);
  return expired.length;
}

function readHeldCart(db: Db, cartId: string): HeldCart {
  const row = db.prepare(
    `SELECT hc.id, hc.customer_id AS customerId, c.name AS customerName,
            hc.user_id AS userId, u.full_name AS userName, hc.status,
            hc.sale_id AS saleId, hc.created_at AS createdAt
     FROM held_carts hc
     LEFT JOIN customers c ON c.id = hc.customer_id
     JOIN users u ON u.id = hc.user_id
     WHERE hc.id = ?`,
  ).get(cartId) as Omit<HeldCart, 'lines' | 'reservations'> | undefined;
  if (!row) throw new AuthError(404, 'cart.held_not_found');
  const lines = db.prepare(
    `SELECT hcl.product_id AS productId, p.sku, p.name_ru AS name, p.unit,
            p.base_price AS basePrice, hcl.qty
     FROM held_cart_lines hcl JOIN products p ON p.id = hcl.product_id
     WHERE hcl.cart_id = ? ORDER BY hcl.rowid`,
  ).all(cartId) as HeldCart['lines'];
  const reservations = db.prepare(
    `SELECT id, product_id AS productId, warehouse_id AS warehouseId, qty, expires_at AS expiresAt
     FROM reservations WHERE cart_id = ? AND status = 'active' ORDER BY created_at`,
  ).all(cartId) as HeldCart['reservations'];
  return { ...row, lines, reservations };
}

function normalizeOptionalCustomerId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 64) {
    throw new AuthError(400, 'validation.invalid_customer');
  }
  return value;
}

export function holdActiveCart(db: Db, userId: string, customerIdInput?: unknown): HeldCart {
  const customerId = normalizeOptionalCustomerId(customerIdInput);
  return inTransaction(db, () => {
    assertPermission(db, userId, 'hold_cart');
    if (customerId && !db.prepare('SELECT id FROM customers WHERE id = ? AND active = 1').get(customerId)) {
      throw new AuthError(400, 'validation.invalid_customer');
    }
    const cart = db.prepare("SELECT id FROM carts WHERE user_id = ? AND status = 'active'").get(userId) as
      { id: string } | undefined;
    if (!cart) throw new AuthError(409, 'cart.not_active');
    const lines = db.prepare('SELECT product_id, qty FROM cart_lines WHERE cart_id = ? ORDER BY rowid')
      .all(cart.id) as Array<{ product_id: string; qty: number }>;
    if (lines.length === 0) throw new AuthError(409, 'cart.empty');
    const now = nowIso();
    const heldId = uuidv7();
    db.prepare(
      `INSERT INTO held_carts (id, customer_id, user_id, status, created_at)
       VALUES (?, ?, ?, 'open', ?)`,
    ).run(heldId, customerId, userId, now);
    const insertLine = db.prepare(
      'INSERT INTO held_cart_lines (id, cart_id, product_id, qty) VALUES (?, ?, ?, ?)',
    );
    for (const line of lines) insertLine.run(uuidv7(), heldId, line.product_id, line.qty);
    const closed = db.prepare(
      "UPDATE carts SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'active'",
    ).run(now, cart.id);
    if (closed.changes !== 1) throw new AuthError(409, 'cart.not_active');
    db.prepare('INSERT INTO carts (id, user_id, status, created_at, updated_at) VALUES (?, ?, \'active\', ?, ?)')
      .run(uuidv7(), userId, now, now);
    writeAudit(db, {
      userId,
      action: 'cart.hold',
      entity: 'held_carts',
      entityId: heldId,
      after: { customerId, lines: lines.length },
    });
    return readHeldCart(db, heldId);
  });
}

export function listHeldCarts(db: Db, userId: string, isAdmin: boolean): HeldCart[] {
  expireReservations(db);
  const rows = db.prepare(
    `SELECT id FROM held_carts WHERE status = 'open' ${isAdmin ? '' : 'AND user_id = ?'}
     ORDER BY created_at DESC, id DESC`,
  ).all(...(isAdmin ? [] : [userId])) as Array<{ id: string }>;
  return rows.map(({ id }) => readHeldCart(db, id));
}

export function getHeldCart(db: Db, userId: string, cartId: string): HeldCart {
  const held = assertOwner(db, userId, cartId);
  if (held.status !== 'open') throw new AuthError(409, 'cart.held_not_open');
  if (db.inTransaction) expireReservations(db);
  return readHeldCart(db, cartId);
}

export function loadHeldCartForSale(db: Db, userId: string, cartId: string): {
  cart: HeldCart;
  customerId: string | null;
} {
  assertPermission(db, userId, 'hold_cart');
  const held = assertOwner(db, userId, cartId);
  if (held.status !== 'open') throw new AuthError(409, 'cart.held_not_open');
  expireReservations(db);
  const cart = readHeldCart(db, cartId);
  return { cart, customerId: cart.customerId };
}

export function consumeHeldCartReservations(db: Db, userId: string, cartId: string, warehouseId: string): void {
  if (!db.inTransaction) throw new Error('consumeHeldCartReservations must run inside a transaction.');
  const held = assertOwner(db, userId, cartId);
  if (held.status !== 'open') throw new AuthError(409, 'cart.held_not_open');
  expireReservations(db);
  const active = db.prepare(
    `SELECT id, product_id, warehouse_id, qty FROM reservations
     WHERE cart_id = ? AND status = 'active'`,
  ).all(cartId) as Array<{
    id: string; product_id: string; warehouse_id: string; qty: number;
  }>;
  if (active.length === 0) return;
  const heldLines = db.prepare('SELECT product_id, qty FROM held_cart_lines WHERE cart_id = ?')
    .all(cartId) as Array<{ product_id: string; qty: number }>;
  const reservedByProduct = new Map<string, number>();
  for (const reservation of active) {
    if (reservation.warehouse_id !== warehouseId) throw new AuthError(409, 'reservation.warehouse_mismatch');
    reservedByProduct.set(
      reservation.product_id,
      (reservedByProduct.get(reservation.product_id) ?? 0) + reservation.qty,
    );
  }
  if (heldLines.some((line) => (reservedByProduct.get(line.product_id) ?? 0) > line.qty) ||
      [...reservedByProduct.keys()].some((productId) => !heldLines.some((line) => line.product_id === productId))) {
    throw new AuthError(409, 'reservation.cart_mismatch');
  }
  const now = nowIso();
  db.prepare(
    `UPDATE reservations SET status = 'consumed', released_at = ?, released_by = ?
     WHERE cart_id = ? AND status = 'active'`,
  ).run(now, userId, cartId);
  for (const reservation of active) updateReservedCache(db, reservation.product_id, reservation.warehouse_id);
  writeAudit(db, {
    userId,
    action: 'reservation.consume',
    entity: 'held_carts',
    entityId: cartId,
    before: { reservations: active.map(({ id, qty }) => ({ id, qty })) },
    after: { status: 'consumed' },
  });
}

export function reserveHeldCart(
  db: Db,
  userId: string,
  cartId: string,
  warehouseId: unknown,
  customerIdInput?: unknown,
): HeldCart {
  let selectedWarehouseId: string | null = typeof warehouseId === 'string' && warehouseId ? warehouseId : null;
  const requestedCustomerId = customerIdInput === undefined
    ? undefined
    : normalizeOptionalCustomerId(customerIdInput);
  return inTransaction(db, () => {
    assertPermission(db, userId, 'reserve_cart');
    if (!selectedWarehouseId) {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_warehouse_id'").get() as
        { value: string } | undefined;
      selectedWarehouseId = setting?.value ?? null;
    }
    if (!selectedWarehouseId) throw new AuthError(400, 'settings.default_warehouse_required');
    const held = assertOwner(db, userId, cartId);
    if (held.status !== 'open') throw new AuthError(409, 'cart.held_not_open');
    const customer = db.prepare(
      'SELECT customer_id AS customerId FROM held_carts WHERE id = ?',
    ).get(cartId) as { customerId: string | null } | undefined;
    const customerId = requestedCustomerId === undefined ? customer?.customerId ?? null : requestedCustomerId;
    if (!customerId || !db.prepare(
      'SELECT id FROM customers WHERE id = ? AND active = 1',
    ).get(customerId)) {
      throw new AuthError(400, 'validation.invalid_customer');
    }
    if (customerId !== customer?.customerId) {
      db.prepare('UPDATE held_carts SET customer_id = ? WHERE id = ? AND status = \'open\'')
        .run(customerId, cartId);
    }
    expireReservations(db);
    if (db.prepare("SELECT 1 FROM reservations WHERE cart_id = ? AND status = 'active'").get(cartId)) {
      throw new AuthError(409, 'reservation.already_active');
    }
    const warehouse = db.prepare(
      `SELECT w.id FROM warehouses w JOIN branches b ON b.id = w.branch_id
       WHERE w.id = ? AND w.active = 1 AND b.active = 1`,
    ).get(selectedWarehouseId);
    if (!warehouse) throw new AuthError(400, 'validation.invalid_warehouse');
    const lines = db.prepare('SELECT product_id, qty FROM held_cart_lines WHERE cart_id = ?')
      .all(cartId) as Array<{ product_id: string; qty: number }>;
    if (lines.length === 0) throw new AuthError(409, 'cart.empty');
    const daysRow = db.prepare("SELECT value FROM settings WHERE key = 'reserve_days'").get() as
      { value: string } | undefined;
    const days = Number(daysRow?.value ?? '0');
    if (!Number.isSafeInteger(days) || days < 0) throw new Error('Invalid reserve_days setting.');
    const now = nowIso();
    const expiresAt = days === 0 ? null : new Date(Date.parse(now) + days * 86_400_000).toISOString();
    for (const line of lines) {
      if (!db.prepare('SELECT 1 FROM products WHERE id = ? AND active = 1').get(line.product_id)) {
        throw new AuthError(409, 'validation.invalid_product');
      }
      if (db.prepare(
        `SELECT 1 FROM stocktake_locks WHERE warehouse_id = ? AND released_at IS NULL
         AND (product_id IS NULL OR product_id = ?)`,
      ).get(selectedWarehouseId, line.product_id)) throw new AuthError(409, 'stock.locked_by_stocktake');
      const stock = db.prepare(
        `SELECT COALESCE(SUM(qty), 0) AS qty FROM stock_movements
         WHERE product_id = ? AND warehouse_id = ?`,
      ).get(line.product_id, selectedWarehouseId) as { qty: number };
      const reserved = db.prepare(
        `SELECT COALESCE(SUM(qty), 0) AS qty FROM reservations
         WHERE product_id = ? AND warehouse_id = ? AND status = 'active'`,
      ).get(line.product_id, selectedWarehouseId) as { qty: number };
      if (!Number.isSafeInteger(stock.qty) || !Number.isSafeInteger(reserved.qty) ||
          stock.qty - reserved.qty < line.qty) throw new AuthError(409, 'stock.insufficient');
      db.prepare(
        `INSERT INTO reservations
         (id, cart_id, product_id, warehouse_id, qty, status, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ).run(uuidv7(), cartId, line.product_id, selectedWarehouseId, line.qty, userId, now, expiresAt);
      updateReservedCache(db, line.product_id, selectedWarehouseId);
    }
    writeAudit(db, {
      userId,
      action: 'reservation.create',
      entity: 'held_carts',
      entityId: cartId,
      before: { customerId: customer?.customerId ?? null },
      after: { warehouseId: selectedWarehouseId, customerId, lines: lines.length, expiresAt },
    });
    return readHeldCart(db, cartId);
  });
}

export function reserveActiveCart(
  db: Db,
  userId: string,
  customerId: unknown,
  warehouseId: unknown,
): HeldCart {
  if (normalizeOptionalCustomerId(customerId) === null) {
    throw new AuthError(400, 'validation.invalid_customer');
  }
  return inTransaction(db, () => {
    const held = holdActiveCart(db, userId, customerId);
    return reserveHeldCart(db, userId, held.id, warehouseId);
  });
}

export function listActiveReservations(db: Db, userId: string, isAdmin: boolean) {
  return inTransaction(db, () => {
    expireReservations(db);
    return db.prepare(
      `SELECT r.id, r.cart_id AS cartId, r.product_id AS productId,
              p.sku, p.name_ru AS name, p.unit, r.warehouse_id AS warehouseId,
              w.name AS warehouseName, r.qty, r.created_at AS createdAt,
              r.expires_at AS expiresAt, hc.customer_id AS customerId, c.name AS customerName
       FROM reservations r
       JOIN held_carts hc ON hc.id = r.cart_id
       LEFT JOIN customers c ON c.id = hc.customer_id
       JOIN products p ON p.id = r.product_id
       JOIN warehouses w ON w.id = r.warehouse_id
       WHERE r.status = 'active' ${isAdmin ? '' : 'AND hc.user_id = ?'}
       ORDER BY r.created_at DESC, r.id`,
    ).all(...(isAdmin ? [] : [userId])) as Array<{
      id: string;
      cartId: string;
      productId: string;
      sku: string;
      name: string;
      unit: string;
      warehouseId: string;
      warehouseName: string;
      qty: number;
      createdAt: string;
      expiresAt: string | null;
      customerId: string | null;
      customerName: string | null;
    }>;
  });
}

export function releaseHeldCart(db: Db, userId: string, cartId: string, cancel = false): HeldCart {
  return inTransaction(db, () => {
    assertPermission(db, userId, cancel ? 'hold_cart' : 'reserve_cart');
    expireReservations(db);
    const held = assertOwner(db, userId, cartId);
    if (held.status !== 'open') throw new AuthError(409, 'cart.held_not_open');
    const now = nowIso();
    const reservations = db.prepare(
      `SELECT id, product_id, warehouse_id, qty FROM reservations
       WHERE cart_id = ? AND status = 'active'`,
    ).all(cartId) as Array<{ id: string; product_id: string; warehouse_id: string; qty: number }>;
    db.prepare(
      `UPDATE reservations SET status = 'released', released_at = ?, released_by = ?
       WHERE cart_id = ? AND status = 'active'`,
    ).run(now, userId, cartId);
    for (const item of reservations) updateReservedCache(db, item.product_id, item.warehouse_id);
    if (cancel) {
      db.prepare(
        "UPDATE held_carts SET status = 'cancelled', closed_at = ? WHERE id = ? AND status = 'open'",
      ).run(now, cartId);
    }
    writeAudit(db, {
      userId,
      action: cancel ? 'cart.hold.cancel' : 'reservation.release_cart',
      entity: 'held_carts',
      entityId: cartId,
      before: { status: 'open', reservations: reservations.map((item) => ({ id: item.id, qty: item.qty })) },
      after: { status: cancel ? 'cancelled' : 'open', reservations: 'released' },
    });
    return readHeldCart(db, cartId);
  });
}

export function setReservationQuantity(db: Db, userId: string, reservationId: string, value: unknown): {
  id: string; qty: number; status: string;
} {
  let qty: number;
  try { qty = parseQty(value as string | number); } catch {
    throw new AuthError(400, 'validation.invalid_quantity');
  }
  if (!Number.isSafeInteger(qty) || qty < 0) throw new AuthError(400, 'validation.invalid_quantity');
  return inTransaction(db, () => {
    assertPermission(db, userId, 'reserve_cart');
    expireReservations(db);
    const reservation = db.prepare(
      `SELECT r.id, r.qty, r.product_id, r.warehouse_id, r.status, r.cart_id
       FROM reservations r WHERE r.id = ?`,
    ).get(reservationId) as {
      id: string; qty: number; product_id: string; warehouse_id: string; status: string; cart_id: string;
    } | undefined;
    if (!reservation) throw new AuthError(404, 'reservation.not_found');
    const held = db.prepare('SELECT status FROM held_carts WHERE id = ?').get(reservation.cart_id) as
      { status: string } | undefined;
    if (!held || held.status !== 'open' || reservation.status !== 'active') {
      throw new AuthError(409, 'reservation.not_active');
    }
    if (qty > reservation.qty) throw new AuthError(400, 'reservation.cannot_increase');
    const now = nowIso();
    if (qty === 0) {
      db.prepare(
        `UPDATE reservations SET status = 'released', released_at = ?, released_by = ?
         WHERE id = ? AND status = 'active'`,
      ).run(now, userId, reservationId);
    } else {
      db.prepare('UPDATE reservations SET qty = ? WHERE id = ? AND status = \'active\'').run(qty, reservationId);
    }
    updateReservedCache(db, reservation.product_id, reservation.warehouse_id);
    writeAudit(db, {
      userId,
      action: qty === 0 ? 'reservation.release' : 'reservation.reduce',
      entity: 'reservations',
      entityId: reservationId,
      before: { qty: reservation.qty, status: reservation.status },
      after: { qty, status: qty === 0 ? 'released' : 'active' },
    });
    return { id: reservationId, qty, status: qty === 0 ? 'released' : 'active' };
  });
}
