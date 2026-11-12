import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';

const db = openDb();
try {
  const result = migrate(db);
  if (result.applied.length === 0) {
    console.log('База актуальна, новых миграций нет.');
  } else {
    console.log('Применены миграции:');
    for (const name of result.applied) console.log(`  + ${name}`);
  }
} finally {
  db.close();
}
