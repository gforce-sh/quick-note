import type Database from "better-sqlite3";

/**
 * Apply the schema. Idempotent (safe to run on every startup) and used
 * verbatim by tests against an in-memory database. Hand-written SQL keeps
 * the toolchain small for a tiny schema.
 */
export function migrate(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      passcode_hash TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER
    );
    INSERT OR IGNORE INTO auth (id, failed_attempts) VALUES (1, 0);
  `);
}
