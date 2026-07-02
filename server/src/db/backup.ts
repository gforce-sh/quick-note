import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";

/**
 * Write a consistent snapshot of the database to `dest` via `VACUUM INTO`.
 * `dest` is server-controlled (env or a timestamped default) and must never
 * be built from client input — it is interpolated into SQL.
 */
export function backupDatabase(sqlite: DatabaseSync, dest?: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = dest ?? process.env.BACKUP_PATH ?? `backups/notes-${stamp}.db`;
  mkdirSync(dirname(target), { recursive: true });
  sqlite.exec(`VACUUM INTO '${target}'`);
  return target;
}
