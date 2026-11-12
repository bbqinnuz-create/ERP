import type { Db } from '../db/connection';

export type DocKind = 'sale' | 'return' | 'purchase' | 'writeoff' | 'stocktake' | 'cashop';

/** Продажа: A-000123, возврат: A-R-000045, приход: A-P-000010, списание: A-W-..., инвентаризация: A-I-..., кассовая операция: A-C-... */
const INFIX: Record<DocKind, string> = {
  sale: '',
  return: 'R',
  purchase: 'P',
  writeoff: 'W',
  stocktake: 'I',
  cashop: 'C',
};

/**
 * Выдаёт следующий номер документа. Вызывать ТОЛЬКО внутри транзакции:
 * если транзакция откатится, номер не «сгорает» (нет пропусков), а повторов быть не может.
 */
export function nextDocNumber(db: Db, branchId: string, kind: DocKind): string {
  if (!db.inTransaction) {
    throw new Error('nextDocNumber must be called inside a transaction');
  }
  const branch = db.prepare('SELECT code FROM branches WHERE id = ?').get(branchId) as { code: string } | undefined;
  if (!branch) throw new Error(`Unknown branch: ${branchId}`);

  const row = db
    .prepare(
      `INSERT INTO counters (branch_id, name, last_value) VALUES (?, ?, 1)
       ON CONFLICT (branch_id, name) DO UPDATE SET last_value = last_value + 1
       RETURNING last_value`,
    )
    .get(branchId, kind) as { last_value: number };

  return [branch.code, INFIX[kind], String(row.last_value).padStart(6, '0')].filter(Boolean).join('-');
}
