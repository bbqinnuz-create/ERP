import { openDb } from '../db/connection';
import { createBackup } from '../modules/backup/service';

async function main(): Promise<void> {
  const db = openDb();
  try {
    const result = await createBackup(db, process.env.BACKUP_DIR);
    console.log(`Копия создана: ${result.path}`);
    console.log(`Проверка целостности: ${result.verification.integrity}`);
    console.log(`Расхождения остатков: ${result.verification.discrepancies.length}`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error('Не удалось создать резервную копию:', error);
  process.exitCode = 1;
});
