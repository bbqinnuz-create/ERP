import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { ensureConfiguredAdmin } from '../modules/auth/service';
import { createWebServer } from './app-server';
import { CupsEscPosDriver } from '../modules/print/driver';
import { recoverInterruptedPrintJobs, startPrintWorker } from '../modules/print/service';

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
    const printerName = process.env.PRINTER_NAME?.trim();
    const printerMode = process.env.PRINTER_MODE ?? 'raster';
    if (printerMode !== 'text' && printerMode !== 'raster') {
      throw new Error('PRINTER_MODE должен быть text или raster.');
    }
    let stopPrintWorker: () => Promise<void>;
    if (printerName) {
      stopPrintWorker = await startPrintWorker(db, new CupsEscPosDriver(printerName, printerMode));
      console.log(`Очередь печати подключена к CUPS «${printerName}» (${printerMode}).`);
    } else {
      const recovered = recoverInterruptedPrintJobs(db);
      if (recovered > 0) console.warn(`После перезапуска ${recovered} заданий печати переведены в uncertain.`);
      console.warn('Печать отключена: задайте PRINTER_NAME для очереди CUPS. Продажи продолжат сохраняться.');
      stopPrintWorker = async () => {};
    }
    const server = createWebServer(db, { printEnabled: Boolean(printerName) });
    server.listen(port, host, () => {
      console.log(`Kassa слушает ${host}:${port} (доступ только из локальной сети).`);
    });

    const stop = () => {
      server.close(() => {
        void stopPrintWorker().then(() => {
          db.close();
          process.exit(0);
        }).catch((error: unknown) => {
          console.error('Ошибка остановки очереди печати:', error);
          db.close();
          process.exitCode = 1;
        });
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
