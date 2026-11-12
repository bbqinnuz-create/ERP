import { randomBytes } from 'node:crypto';

let lastMs = 0;
let seq = 0;

/**
 * UUID версии 7 (RFC 9562): первые 48 бит это время в миллисекундах, поэтому id сортируются по времени.
 * Внутри одной миллисекунды порядок сохраняется счётчиком (монотонность).
 * Создаётся на месте, без интернета и без обращения к базе.
 */
export function uuidv7(nowMs: number = Date.now()): string {
  if (nowMs > lastMs) {
    lastMs = nowMs;
    seq = randomBytes(2).readUInt16BE(0) & 0x7ff; // стартуем в нижней половине, чтобы был запас
  } else {
    seq += 1;
    if (seq > 0xfff) {
      lastMs += 1;
      seq = 0;
    }
  }

  const bytes = Buffer.alloc(16);
  bytes.writeUInt16BE(Math.floor(lastMs / 0x100000000), 0);
  bytes.writeUInt32BE(lastMs % 0x100000000, 2);
  bytes[6] = 0x70 | (seq >> 8);          // версия 7 + старшие 4 бита счётчика
  bytes[7] = seq & 0xff;
  const rand = randomBytes(8);
  bytes[8] = 0x80 | (rand[0]! & 0x3f);   // вариант RFC 4122/9562
  rand.copy(bytes, 9, 1);

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
