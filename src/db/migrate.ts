import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { Db } from './connection';

export const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

const FILE_RE = /^\d{3,}_[\w-]+\.sql$/;

/** Контрольная сумма не зависит от переводов строк (Windows CRLF или Unix LF). */
function checksum(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/**
 * Применяет новые миграции по порядку номеров.
 * Уже применённую миграцию менять нельзя: при расхождении контрольной суммы выбрасывается ошибка.
 */
export function migrate(db: Db, dir: string = DEFAULT_MIGRATIONS_DIR): MigrationResult {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TEXT NOT NULL
    )
  `);

  const files = readdirSync(dir).filter((f) => FILE_RE.test(f)).sort();
  const applied = new Map<string, string>(
    (db.prepare('SELECT name, checksum FROM schema_migrations').all() as { name: string; checksum: string }[]).map(
      (r) => [r.name, r.checksum],
    ),
  );

  for (const name of applied.keys()) {
    if (!files.includes(name)) {
      throw new Error(`Применённая миграция ${name} отсутствует в папке migrations. Файлы миграций нельзя удалять.`);
    }
  }

  const result: MigrationResult = { applied: [], alreadyApplied: [] };
  const insert = db.prepare('INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)');

  for (const name of files) {
    const sql = readFileSync(join(dir, name), 'utf8');
    const sum = checksum(sql);
    const known = applied.get(name);

    if (known !== undefined) {
      if (known !== sum) {
        throw new Error(
          `Миграция ${name} уже применена, но файл был изменён. Применённые миграции менять нельзя: создайте новую миграцию.`,
        );
      }
      result.alreadyApplied.push(name);
      continue;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      insert.run(name, sum, new Date().toISOString());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Ошибка в миграции ${name}: ${(err as Error).message}`);
    }
    result.applied.push(name);
  }
  return result;
}
