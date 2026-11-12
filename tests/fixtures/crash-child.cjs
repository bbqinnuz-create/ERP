// Имитация «отключили свет»: открывает транзакцию, пишет данные и зависает, не делая COMMIT.
// Родительский тест убивает процесс сигналом SIGKILL.
const Database = require('better-sqlite3');
const db = new Database(process.argv[2]);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');
db.exec('BEGIN IMMEDIATE');
const now = new Date().toISOString();
db.prepare(
  "INSERT INTO products (id, sku, name_ru, unit, base_price, created_at, updated_at) VALUES (?, ?, ?, 'm', 100, ?, ?)",
).run('crash-1', 'CRASH-1', 'Полузаписанный товар', now, now);
db.prepare("UPDATE counters SET last_value = last_value + 100").run();
console.log('READY');
setInterval(() => {}, 1000);
