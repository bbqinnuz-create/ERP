import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { ensureConfiguredAdmin } from '../modules/auth/service';
import { createWebServer } from './app-server';

function readBootstrapFlag(): boolean {
  const value = (process.env.DEFADMINLOGIN ?? 'false').trim().toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new Error('DEFADMINLOGIN должен быть true или false.');
  }
  return value === 'true';
}

async function main(): Promise<void> {
  const db = openDb();
  try {
    migrate(db);
    const bootstrapEnabled = readBootstrapFlag();
    let admin = db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get();
    if (!admin && bootstrapEnabled) {
      if (!process.env.ADMIN || !process.env.PASS) {
        throw new Error('При DEFADMINLOGIN=true задайте ADMIN и PASS в .env.');
      }
      if (await ensureConfiguredAdmin(db, { login: process.env.ADMIN, password: process.env.PASS })) {
        console.log(`Создан администратор «${process.env.ADMIN}» из настроек .env.`);
      }
      admin = db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get();
    }
    if (!admin) {
      throw new Error('Нет активного администратора. Создайте его командой npm run create-admin или включите DEFADMINLOGIN=true в .env.');
    }

    const portValue = process.env.PORT ?? '3000';
    if (!/^\d+$/.test(portValue)) throw new Error('PORT должен быть целым числом.');
    const port = Number(portValue);
    if (port < 1 || port > 65_535) throw new Error('PORT должен быть в диапазоне 1–65535.');
    const host = process.env.HOST ?? '0.0.0.0';
    const server = createWebServer(db);
    server.listen(port, host, () => {
      console.log(`Kassa слушает ${host}:${port} (доступ только из локальной сети).`);
    });

    const stop = () => {
      server.close(() => {
        db.close();
        process.exit(0);
      });
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    db.close();
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
