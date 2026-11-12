import type { Db } from '../db/connection';
import { uuidv7 } from './uuid';
import { nowIso } from './time';

export interface AuditEntry {
  userId?: string | null;
  action: string;          // например: sale.create, price.update, permission.change
  entity: string;          // например: sales, products
  entityId?: string | null;
  before?: unknown;        // было (для изменений)
  after?: unknown;         // стало
  deviceId?: string | null;
}

/** Пишет запись в журнал действий. Вызывается в той же транзакции, что и само действие. */
export function writeAudit(db: Db, entry: AuditEntry): string {
  const id = uuidv7();
  db.prepare(
    `INSERT INTO audit_log (id, at, user_id, action, entity, entity_id, before_json, after_json, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    nowIso(),
    entry.userId ?? null,
    entry.action,
    entry.entity,
    entry.entityId ?? null,
    entry.before === undefined ? null : JSON.stringify(entry.before),
    entry.after === undefined ? null : JSON.stringify(entry.after),
    entry.deviceId ?? null,
  );
  return id;
}
