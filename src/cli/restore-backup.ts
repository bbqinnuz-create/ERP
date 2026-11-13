import { restoreBackup } from '../modules/backup/service';

async function main(): Promise<void> {
  const [sourcePath, targetPath, ...extra] = process.argv.slice(2);
  if (!sourcePath || !targetPath || extra.length > 0) {
    throw new Error('Использование: npm run restore-backup -- <файл-копии.sqlite> <новый-путь-к-базе>');
  }
  const verification = await restoreBackup(sourcePath, targetPath, process.env.DB_PATH);
  console.log(`Копия восстановлена в отдельную базу: ${targetPath}`);
  console.log(`Проверка целостности: ${verification.integrity}`);
  console.log(`Расхождения остатков: ${verification.discrepancies.length}`);
}

main().catch((error: unknown) => {
  console.error('Не удалось восстановить резервную копию:', error);
  process.exitCode = 1;
});
