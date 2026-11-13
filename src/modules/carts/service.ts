import type { Db } from '../../db/connection';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { uuidv7 } from '../../core/uuid';
import { parseQty } from '../../core/qty';
import { AuthError } from '../auth/service';

export interface CartLine {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  basePrice: number;
  qty: number;
  active: boolean;
}

export interface Cart {
  id: string;
  updatedAt: string;
  lines: CartLine[];
}

interface CartRow {
  id: string;
  updated_at: string;
}

interface CartLineRow extends Omit<CartLine, 'active'> {
  active: number;
}

function assertProductId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 64) {
    throw new AuthError(400, 'validation.invalid_product');
  }
  return value;
}

function normalizeQty(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AuthError(400, 'validation.invalid_quantity');
  }
  let qty: number;
  try {
    qty = parseQty(value);
  } catch {
    throw new AuthError(400, 'validation.invalid_quantity');
  }
  if (!Number.isSafeInteger(qty) || qty <= 0) {
    throw new AuthError(400, 'validation.invalid_quantity');
  }
  return qty;
}

function getOrCreateCartId(db: Db, userId: string): string {
  if (!db.inTransaction) throw new Error('Cart operations must run inside a transaction.');
  const existing = db.prepare(
    "SELECT id FROM carts WHERE user_id = ? AND status = 'active'",
  ).get(userId) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = uuidv7();
  const now = nowIso();
  db.prepare(
    `INSERT INTO carts (id, user_id, status, created_at, updated_at)
     VALUES (?, ?, 'active', ?, ?)`,
  ).run(id, userId, now, now);
  return id;
}

function readCart(db: Db, cartId: string): Cart {
  const cart = db.prepare('SELECT id, updated_at FROM carts WHERE id = ?').get(cartId) as CartRow | undefined;
  if (!cart) throw new Error(`Missing active cart: ${cartId}`);
  const lines = db.prepare(
    `SELECT cl.id, cl.product_id AS productId, p.sku, p.name_ru AS name, p.unit,
            p.base_price AS basePrice, cl.qty, p.active
     FROM cart_lines cl JOIN products p ON p.id = cl.product_id
     WHERE cl.cart_id = ? ORDER BY cl.rowid`,
  ).all(cartId) as CartLineRow[];
  return {
    id: cart.id,
    updatedAt: cart.updated_at,
    lines: lines.map((line) => ({ ...line, active: line.active === 1 })),
  };
}

export function getActiveCart(db: Db, userId: string): Cart {
  return inTransaction(db, () => readCart(db, getOrCreateCartId(db, userId)));
}

export function addCartLine(db: Db, userId: string, input: unknown): Cart {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'productId' && key !== 'qty')) {
    throw new AuthError(400, 'validation.unknown_field');
  }
  const productId = assertProductId(row.productId);
  const qty = normalizeQty(row.qty);

  return inTransaction(db, () => {
    const product = db.prepare('SELECT 1 FROM products WHERE id = ? AND active = 1').get(productId);
    if (!product) throw new AuthError(400, 'validation.invalid_product');
    const cartId = getOrCreateCartId(db, userId);
    const existing = db.prepare(
      'SELECT qty FROM cart_lines WHERE cart_id = ? AND product_id = ?',
    ).get(cartId, productId) as { qty: number } | undefined;
    const nextQty = existing ? Number(BigInt(existing.qty) + BigInt(qty)) : qty;
    if (!Number.isSafeInteger(nextQty)) throw new AuthError(400, 'validation.invalid_quantity');
    const now = nowIso();
    if (existing) {
      db.prepare(
        'UPDATE cart_lines SET qty = ?, updated_at = ? WHERE cart_id = ? AND product_id = ?',
      ).run(nextQty, now, cartId, productId);
    } else {
      db.prepare(
        'INSERT INTO cart_lines (id, cart_id, product_id, qty, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(uuidv7(), cartId, productId, qty, now);
    }
    db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?').run(now, cartId);
    return readCart(db, cartId);
  });
}

export function setCartLineQty(db: Db, userId: string, productIdInput: unknown, qtyInput: unknown): Cart {
  const productId = assertProductId(productIdInput);
  const qty = normalizeQty(qtyInput);
  return inTransaction(db, () => {
    const cartId = getOrCreateCartId(db, userId);
    const result = db.prepare(
      `UPDATE cart_lines SET qty = ?, updated_at = ?
       WHERE cart_id = ? AND product_id = ?`,
    ).run(qty, nowIso(), cartId, productId);
    if (result.changes !== 1) throw new AuthError(404, 'cart.line_not_found');
    const now = nowIso();
    db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?').run(now, cartId);
    return readCart(db, cartId);
  });
}

export function removeCartLine(db: Db, userId: string, productIdInput: unknown): Cart {
  const productId = assertProductId(productIdInput);
  return inTransaction(db, () => {
    const cartId = getOrCreateCartId(db, userId);
    const result = db.prepare(
      'DELETE FROM cart_lines WHERE cart_id = ? AND product_id = ?',
    ).run(cartId, productId);
    if (result.changes !== 1) throw new AuthError(404, 'cart.line_not_found');
    const now = nowIso();
    db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?').run(now, cartId);
    return readCart(db, cartId);
  });
}
