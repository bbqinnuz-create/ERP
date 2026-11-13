import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import type { Db } from '../../db/connection';
import { inTransaction } from '../../core/tx';
import { writeAudit } from '../../core/audit';
import { nowIso } from '../../core/time';
import { uuidv7 } from '../../core/uuid';
import { AuthError } from '../auth/service';
import { reconcileStockCaches, type StockDiscrepancy } from '../stock/ledger';

const BACKUP_FILE_RE = /^kassa-backup-\d{8}T\d{6}Z-[0-9a-f-]{36}\.sqlite$/;
const STATUS_FILE = 'backup-status.json';
const RETENTION_DAYS = 30;

export interface BackupVerification {
  integrity: string;
  discrepancies: StockDiscrepancy[];
}

export interface BackupStatus {
  configured: boolean;
  directory: string | null;
  lastRun: {
    status: 'success' | 'error';
    completedAt: string;
    file: string | null;
    integrity: string | null;
    discrepancies: number | null;
    error: string | null;
  } | null;
  backups: Array<{ file: string; createdAt: string; bytes: number }>;
}

function configuredDirectory(path: string | undefined): string {
  if (!path?.trim()) throw new AuthError(409, 'backup.directory_not_configured');
  return resolve(path);
}

function assertFilePath(path: string, label: string): string {
  if (!path.trim()) throw new Error(`${label} path is empty.`);
  return resolve(path);
}

function timestampForName(at: Date): string {
  return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeDiscrepancyCount(discrepancies: StockDiscrepancy[]): number {
  if (!Number.isSafeInteger(discrepancies.length)) throw new Error('backup.discrepancy_count_invalid');
  return discrepancies.length;
}

export function verifyDatabaseFile(path: string): BackupVerification {
  const resolvedPath = assertFilePath(path, 'Database');
  const db = new Database(resolvedPath, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const integrity = result.map((row) => row.integrity_check).join('; ');
    if (integrity !== 'ok') throw new Error(`backup.integrity_check_failed: ${integrity}`);
    const discrepancies = reconcileStockCaches(db);
    if (discrepancies.length > 0) throw new Error(`backup.stock_reconciliation_failed: ${discrepancies.length}`);
    return { integrity, discrepancies };
  } finally {
    db.close();
  }
}

async function writeStatus(directory: string, status: BackupStatus['lastRun']): Promise<void> {
  const target = resolve(directory, STATUS_FILE);
  const temporary = `${target}.${uuidv7()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(status), { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function readLastRun(directory: string): Promise<BackupStatus['lastRun']> {
  try {
    const content = await readFile(resolve(directory, STATUS_FILE), 'utf8');
    const value = JSON.parse(content) as BackupStatus['lastRun'];
    if (!value || (value.status !== 'success' && value.status !== 'error') ||
        typeof value.completedAt !== 'string' || (value.file !== null && typeof value.file !== 'string') ||
        (value.error !== null && typeof value.error !== 'string')) {
      throw new Error('backup.status_file_invalid');
    }
    return value;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function pruneOldBackups(directory: string, now: Date): Promise<void> {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !BACKUP_FILE_RE.test(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (dirname(path) !== directory) throw new Error('backup.path_escape');
    const details = await stat(path);
    if (details.mtimeMs < cutoff) await rm(path);
  }
}

function auditBackup(db: Db, userId: string | null, backupPath: string, verification: BackupVerification): void {
  inTransaction(db, () => {
    writeAudit(db, {
      userId,
      action: 'backup.create',
      entity: 'backups',
      entityId: basename(backupPath),
      after: {
        integrity: verification.integrity,
        discrepancies: safeDiscrepancyCount(verification.discrepancies),
      },
    });
  });
}

export async function createBackup(
  db: Db,
  backupDirectory: string | undefined,
  userId: string | null = null,
  now = new Date(),
): Promise<{ file: string; path: string; verification: BackupVerification; bytes: number }> {
  if (!db.open || db.memory || db.name === ':memory:') throw new Error('backup.database_file_required');
  if (db.inTransaction) throw new Error('backup.cannot_run_in_transaction');
  const directory = configuredDirectory(backupDirectory);
  await mkdir(directory, { recursive: true });
  const databasePath = resolve(db.name);
  const file = `kassa-backup-${timestampForName(now)}-${randomUUID()}.sqlite`;
  const finalPath = resolve(directory, file);
  if (dirname(finalPath) !== directory || databasePath === finalPath) throw new Error('backup.path_invalid');
  const temporaryPath = `${finalPath}.${uuidv7()}.partial`;
  let createdFile = false;
  try {
    await db.backup(temporaryPath);
    const verification = verifyDatabaseFile(temporaryPath);
    await rename(temporaryPath, finalPath);
    createdFile = true;
    const details = await stat(finalPath);
    const completedAt = nowIso();
    const lastRun: BackupStatus['lastRun'] = {
      status: 'success',
      completedAt,
      file,
      integrity: verification.integrity,
      discrepancies: verification.discrepancies.length,
      error: null,
    };
    await writeStatus(directory, lastRun);
    await pruneOldBackups(directory, now);
    auditBackup(db, userId, finalPath, verification);
    return { file, path: finalPath, verification, bytes: details.size };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (createdFile) await rm(finalPath, { force: true });
    const message = error instanceof Error ? error.message : 'backup.unknown_error';
    try {
      await writeStatus(directory, {
        status: 'error',
        completedAt: nowIso(),
        file: null,
        integrity: null,
        discrepancies: null,
        error: message,
      });
    } catch (statusError) {
      throw new Error(`Backup failed: ${message}; status could not be saved: ${String(statusError)}`, { cause: error });
    }
    throw error;
  }
}

export async function getBackupStatus(backupDirectory: string | undefined): Promise<BackupStatus> {
  if (!backupDirectory?.trim()) {
    return { configured: false, directory: null, lastRun: null, backups: [] };
  }
  const directory = configuredDirectory(backupDirectory);
  let entries: Array<{ file: string; createdAt: string; bytes: number }> = [];
  try {
    const files = await readdir(directory, { withFileTypes: true });
    entries = await Promise.all(files.filter((entry) => entry.isFile() && BACKUP_FILE_RE.test(entry.name))
      .map(async (entry) => {
        const path = resolve(directory, entry.name);
        if (dirname(path) !== directory) throw new Error('backup.path_escape');
        const details = await stat(path);
        return { file: entry.name, createdAt: details.mtime.toISOString(), bytes: details.size };
      }));
    entries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  return {
    configured: true,
    directory,
    lastRun: await readLastRun(directory),
    backups: entries,
  };
}

export async function restoreBackup(
  sourcePath: string,
  targetPath: string,
  workingDatabasePath?: string,
): Promise<BackupVerification> {
  const source = assertFilePath(sourcePath, 'Backup source');
  const target = assertFilePath(targetPath, 'Restore target');
  if (source === target || (workingDatabasePath && target === resolve(workingDatabasePath))) {
    throw new Error('backup.restore_target_must_be_separate');
  }
  const targetExists = await stat(target).then(() => true).catch((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  });
  if (targetExists) throw new Error('backup.restore_target_exists');
  if (workingDatabasePath && source === resolve(workingDatabasePath)) {
    throw new Error('backup.restore_source_must_be_backup');
  }
  if (extname(source).toLowerCase() !== '.sqlite') {
    throw new Error('backup.restore_source_invalid');
  }
  const canonicalSource = await realpath(source);
  if (workingDatabasePath) {
    const canonicalWorkingSource = await realpath(resolve(workingDatabasePath)).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return resolve(workingDatabasePath);
      }
      throw error;
    });
    if (canonicalSource === canonicalWorkingSource) throw new Error('backup.restore_source_must_be_backup');
  }
  const sourceVerification = verifyDatabaseFile(canonicalSource);
  if (sourceVerification.integrity !== 'ok' || sourceVerification.discrepancies.length > 0) {
    throw new Error('backup.restore_source_invalid');
  }
  await mkdir(dirname(target), { recursive: true });
  const canonicalTarget = resolve(await realpath(dirname(target)), basename(target));
  const canonicalWorkingPath = workingDatabasePath
    ? await realpath(resolve(workingDatabasePath)).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return resolve(workingDatabasePath);
      }
      throw error;
    })
    : null;
  if (canonicalWorkingPath && canonicalTarget === canonicalWorkingPath) {
    throw new Error('backup.restore_target_must_be_separate');
  }
  const sourceDb = new Database(canonicalSource, { readonly: true, fileMustExist: true });
  let reservedTarget: Awaited<ReturnType<typeof open>> | null = null;
  let targetCreated = false;
  try {
    reservedTarget = await open(canonicalTarget, 'wx');
    targetCreated = true;
    await reservedTarget.close();
    await sourceDb.backup(canonicalTarget);
    return verifyDatabaseFile(canonicalTarget);
  } catch (error) {
    if (reservedTarget) await reservedTarget.close().catch(() => undefined);
    if (targetCreated) await rm(canonicalTarget, { force: true });
    throw error;
  } finally {
    sourceDb.close();
  }
}

function localDateAndHour(at: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function startBackupScheduler(
  db: Db,
  backupDirectory: string | undefined,
  clock: () => Date = () => new Date(),
): () => Promise<void> {
  let inFlight = false;
  let attemptedDate = '';
  let running: Promise<void> | null = null;
  const check = () => {
    if (inFlight || !backupDirectory?.trim()) return;
    const now = clock();
    const local = localDateAndHour(now);
    if (local.hour < 2 || local.date === attemptedDate) return;
    attemptedDate = local.date;
    inFlight = true;
    running = createBackup(db, backupDirectory, null, now).then(() => {
      console.info('Daily database backup completed.');
    }).catch((error: unknown) => {
      attemptedDate = '';
      console.error('Daily database backup failed:', error);
    }).finally(() => {
      inFlight = false;
      running = null;
    });
  };
  if (!backupDirectory?.trim()) {
    console.warn('Automatic backups are disabled: configure BACKUP_DIR on a separate physical drive.');
  }
  check();
  const timer = setInterval(check, 60_000);
  return async () => {
    clearInterval(timer);
    if (running) await running;
  };
}
