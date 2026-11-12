import type { Db } from '../db/connection';

/**
 * Выполняет функцию в одной транзакции SQLite: либо записано всё, либо ничего.
 * BEGIN IMMEDIATE сразу берёт блокировку записи, поэтому два одновременных чека не пересекутся.
 * Если транзакция уже открыта, функция работает внутри неё (внешняя транзакция решает: сохранить или откатить).
 */
export function inTransaction<T>(db: Db, fn: () => T): T {
  if (db.inTransaction) return fn();
  return db.transaction(fn).immediate();
}
