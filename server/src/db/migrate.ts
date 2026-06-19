import type { DatabaseSync } from "node:sqlite";

export function migrate(sqlite: DatabaseSync): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      passcode_hash TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER
    );
    INSERT OR IGNORE INTO auth (id, failed_attempts) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      title_is_custom INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
