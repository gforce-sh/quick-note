import type { DatabaseSync } from "node:sqlite";

type ColInfo = { name: string };

function columns(sqlite: DatabaseSync, table: string): ColInfo[] {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all() as ColInfo[];
}

export function migrate(sqlite: DatabaseSync): void {
  const authCols = columns(sqlite, "auth");
  const authExists = authCols.length > 0;

  if (authExists && !authCols.some((c) => c.name === "name")) {
    // Old single-user schema: recreate without CHECK constraint, add name, drop lockout columns.
    sqlite.exec(`
      CREATE TABLE auth_new (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'default',
        passcode_hash TEXT
      );
      INSERT INTO auth_new (id, passcode_hash) SELECT id, passcode_hash FROM auth;
      DROP TABLE auth;
      ALTER TABLE auth_new RENAME TO auth;
    `);
  }

  const notesCols = columns(sqlite, "notes");
  const notesExists = notesCols.length > 0;

  if (notesExists && !notesCols.some((c) => c.name === "user_id")) {
    // Existing notes assigned to user id=1 (the migrated default user).
    sqlite.exec(
      "ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES auth(id)",
    );
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      passcode_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES auth(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      title_is_custom INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
