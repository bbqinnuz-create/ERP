/** Время хранится в UTC в формате ISO 8601. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Показ времени: по умолчанию Asia/Tashkent (UTC+5). */
export function formatLocal(iso: string, timeZone = 'Asia/Tashkent'): string {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}
