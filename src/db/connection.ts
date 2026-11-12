import Database from 'better-sqlite3';
import { resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

export type Db = Database.Database;

export interface OpenOptions {
  /** Путь к файлу базы. По умолчанию берётся из переменной DB_PATH. */
  path?: string;
}

/**
 * Защита рабочей базы: в режиме тестов разрешены только временные базы
 * (папка tmp или :memory:). Так тест не может случайно открыть рабочие данные.
 */
function guardTestPath(path: string): void {
  const underTest = Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test';
  if (!underTest || path === ':memory:') return;
  const resolved = resolve(path);
  const tmp = resolve(tmpdir());
  if (!resolved.startsWith(tmp + sep)) {
    throw new Error(`Refusing to open a non-temporary database in test mode: ${resolved}`);
  }
}

/** Открывает базу с безопасными настройками SQLite. */
export function openDb(options: OpenOptions = {}): Db {
  const path = options.path ?? process.env.DB_PATH;
  if (!path) {
    throw new Error('DB_PATH is not set. Укажите путь к базе в переменной DB_PATH (см. .env.example).');
  }
  guardTestPath(path);

  const db = new Database(path);
  db.pragma('journal_mode = WAL');   // чтение не блокирует запись, устойчиво к сбоям питания
  db.pragma('synchronous = FULL');   // данные сброшены на диск до подтверждения транзакции
  db.pragma('foreign_keys = ON');    // связи между таблицами проверяются всегда
  db.pragma('busy_timeout = 5000');  // ждать до 5 с, если база занята другим запросом
  return db;
}
