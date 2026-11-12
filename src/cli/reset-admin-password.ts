import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { resetAdminPassword } from '../modules/auth/service';
import { readSecret } from './secret-input';

async function main(): Promise<void> {
  const prompts = createInterface({ input: stdin, output: stdout });
  let login = '';
  try {
    login = await prompts.question('Логин активного администратора: ');
  } finally {
    prompts.close();
  }

  const password = await readSecret('Новый пароль (минимум 5 символов): ');
  const confirmation = await readSecret('Повторите пароль: ');
  if (password !== confirmation) throw new Error('Пароли не совпадают.');

  const db = openDb();
  try {
    migrate(db);
    const admin = await resetAdminPassword(db, login, password);
    console.log(`Пароль администратора «${admin.login}» изменён; его активные сессии отозваны.`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
