import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { bootstrapAdmin, type UserLanguage } from '../modules/auth/service';
import { readSecret } from './secret-input';

async function main(): Promise<void> {
  const prompts = createInterface({ input: stdin, output: stdout });
  let login = '';
  let fullName = '';
  let lang: UserLanguage = 'ru';
  try {
    login = await prompts.question('Логин администратора: ');
    fullName = await prompts.question('Имя администратора: ');
    const language = await prompts.question('Язык (ru/uz, по умолчанию ru): ');
    if (language.trim()) {
      if (language !== 'ru' && language !== 'uz') throw new Error('Язык должен быть ru или uz.');
      lang = language;
    }
  } finally {
    prompts.close();
  }

  const password = await readSecret('Пароль (минимум 5 символов): ');
  const confirmation = await readSecret('Повторите пароль: ');
  if (password !== confirmation) throw new Error('Пароли не совпадают.');

  const db = openDb();
  try {
    migrate(db);
    const admin = await bootstrapAdmin(db, { login, password, fullName, role: 'admin', lang });
    console.log(`Создан администратор «${admin.login}».`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
