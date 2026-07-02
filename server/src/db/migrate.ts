import type { DatabaseSync } from "node:sqlite";

export function migrate(sqlite: DatabaseSync): void {
  // Auth ids are UUID text; legacy integer-id databases are not migrated.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'g' CHECK (role IN ('o', 'm', 'g', 'p')),
      passcode_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
