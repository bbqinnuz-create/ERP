import type { Db } from '../../db/connection';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { inTransaction } from '../../core/tx';
import { AuthError } from '../auth/service';

export interface ReceiptProfile {
  storeName: string;
  address: string;
  phone: string;
  footerRu: string;
  footerUz: string;
}

function readProfile(db: Db): ReceiptProfile {
  const branch = db.prepare(
    'SELECT name, address, phone FROM branches WHERE active = 1 ORDER BY created_at, id LIMIT 1',
  ).get() as { name: string; address: string | null; phone: string | null } | undefined;
  if (!branch) throw new AuthError(409, 'print.no_active_branch');
  const settings = db.prepare(
    `SELECT key, value FROM settings WHERE key IN ('receipt_footer_ru', 'receipt_footer_uz')`,
  ).all() as Array<{ key: string; value: string }>;
  const values = Object.fromEntries(settings.map((row) => [row.key, row.value]));
  return {
    storeName: branch.name,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    footerRu: values.receipt_footer_ru ?? '',
    footerUz: values.receipt_footer_uz ?? '',
  };
}

export function getReceiptProfile(db: Db): ReceiptProfile {
  return readProfile(db);
}

function normalizeText(value: unknown, maxLength: number, required = false): string {
  if (typeof value !== 'string' || value.length > maxLength || (required && value.trim().length === 0) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new AuthError(400, 'print.invalid_profile');
  }
  return value.trim();
}

export function updateReceiptProfile(db: Db, userId: string, input: unknown): ReceiptProfile {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthError(400, 'validation.invalid_object');
  }
  const body = input as Record<string, unknown>;
  const allowed = ['storeName', 'address', 'phone', 'footerRu', 'footerUz'];
  if (Object.keys(body).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in body))) {
    throw new AuthError(400, 'print.invalid_profile');
  }
  const values: ReceiptProfile = {
    storeName: normalizeText(body.storeName, 120, true),
    address: normalizeText(body.address, 200),
    phone: normalizeText(body.phone, 40),
    footerRu: normalizeText(body.footerRu, 500),
    footerUz: normalizeText(body.footerUz, 500),
  };

  return inTransaction(db, () => {
    const branch = db.prepare(
      'SELECT id, name, address, phone FROM branches WHERE active = 1 ORDER BY created_at, id LIMIT 1',
    ).get() as { id: string; name: string; address: string | null; phone: string | null } | undefined;
    if (!branch) throw new AuthError(409, 'print.no_active_branch');
    const before = readProfile(db);
    const now = nowIso();
    db.prepare('UPDATE branches SET name = ?, address = ?, phone = ?, updated_at = ? WHERE id = ?')
      .run(values.storeName, values.address || null, values.phone || null, now, branch.id);
    const upsert = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    upsert.run('receipt_footer_ru', values.footerRu, now);
    upsert.run('receipt_footer_uz', values.footerUz, now);
    writeAudit(db, {
      userId,
      action: 'print.profile.update',
      entity: 'branches',
      entityId: branch.id,
      before,
      after: values,
    });
    return values;
  });
}
