import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { ensureBranch } from '../core/setup';

const code = process.env.BRANCH_CODE ?? 'A';
const name = process.env.BRANCH_NAME ?? 'Основная точка';

const db = openDb();
try {
  migrate(db);
  const result = ensureBranch(db, { code, name });
  console.log(result.created ? `Создана точка продажи ${code} («${name}»).` : `Точка продажи ${code} уже существует.`);
  console.log('Основной склад и способы оплаты (наличные, карта, перевод) готовы.');
} finally {
  db.close();
}
