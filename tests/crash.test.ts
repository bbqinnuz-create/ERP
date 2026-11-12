import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { makeEnv, addProduct, type TestEnv } from './helpers';
import { openDb } from '../src/db/connection';
import { inTransaction } from '../src/core/tx';
import { nextDocNumber } from '../src/core/counters';

let env: TestEnv;
beforeEach(() => {
  env = makeEnv();
});
afterEach(() => env.cleanup());

const CHILD = fileURLToPath(new URL('./fixtures/crash-child.cjs', import.meta.url));

describe('сбой питания посреди операции', () => {
  it('убитый процесс не оставляет полузаписанных данных, закоммиченное сохраняется', async () => {
    // закоммиченные данные до сбоя
    addProduct(env.db, 'COMMITTED');
    inTransaction(env.db, () => nextDocNumber(env.db, env.branchId, 'sale')); // A-000001
    env.db.close();

    // второй процесс начинает транзакцию и «теряет питание»
    const child = spawn(process.execPath, [CHILD, join(env.dir, 'test.db')], { stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (d: Buffer) => d.toString().includes('READY') && resolve());
      child.on('error', reject);
      child.on('exit', (code) => reject(new Error(`child exited early: ${code}`)));
    });
    child.removeAllListeners('exit');
    child.kill('SIGKILL');
    await new Promise((r) => child.on('exit', r));

    // открываем базу заново, как после перезагрузки ПК
    const db = openDb({ path: join(env.dir, 'test.db') });
    try {
      const skus = (db.prepare('SELECT sku FROM products ORDER BY sku').all() as { sku: string }[]).map((r) => r.sku);
      expect(skus).toEqual(['COMMITTED']);                       // полузаписанного товара нет
      expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
      // счётчик номеров не сдвинулся: следующий чек A-000002, без пропуска
      expect(inTransaction(db, () => nextDocNumber(db, env.branchId, 'sale'))).toBe('A-000002');
    } finally {
      db.close();
    }
    // чтобы afterEach не закрывал уже закрытую базу повторно с ошибкой
    env.db = openDb({ path: join(env.dir, 'test.db') });
  });
});

describe('два подключения к одной базе (два ПК через сервер)', () => {
  it('номера чётко чередуются без повторов', () => {
    const second = openDb({ path: join(env.dir, 'test.db') });
    try {
      const got: string[] = [];
      for (let i = 0; i < 200; i++) {
        const db = i % 2 === 0 ? env.db : second;
        got.push(inTransaction(db, () => nextDocNumber(db, env.branchId, 'sale')));
      }
      expect(new Set(got).size).toBe(200);
      expect(got[199]).toBe('A-000200');
    } finally {
      second.close();
    }
  });

  it('вторая запись ждёт, пока первая транзакция не завершится', () => {
    const second = openDb({ path: join(env.dir, 'test.db') });
    second.pragma('busy_timeout = 50');
    try {
      env.db.exec('BEGIN IMMEDIATE');
      expect(() => second.exec('BEGIN IMMEDIATE')).toThrow(/locked|busy/i);
      env.db.exec('ROLLBACK');
      expect(() => {
        second.exec('BEGIN IMMEDIATE');
        second.exec('ROLLBACK');
      }).not.toThrow();
    } finally {
      second.close();
    }
  });
});
