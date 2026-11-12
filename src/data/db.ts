import * as SQLite from 'expo-sqlite';

/**
 * Everything is stored on the device in one SQLite file. Nothing leaves the phone.
 * To change the schema, add a new `if (version < N)` block: never edit an old one.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open() {
  const db = await SQLite.openDatabaseAsync('finquest.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        saved_amount INTEGER NOT NULL DEFAULT 0,
        target_date TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS budgets (
        category_id TEXT PRIMARY KEY NOT NULL,
        amount INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        frequency TEXT NOT NULL,
        "interval" INTEGER NOT NULL DEFAULT 1,
        anchor_date TEXT NOT NULL,
        end_date TEXT,
        last_run_date TEXT,
        active INTEGER NOT NULL DEFAULT 1
      );
      PRAGMA user_version = 2;
    `);
  }
  return db;
}
