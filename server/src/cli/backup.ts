import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

// Online backup (WAL-safe, works while the app is running). Respects
// DATABASE_PATH; writes a timestamped snapshot under backups/.
const dbPath = process.env.DATABASE_PATH ?? "data/notes.db";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = process.env.BACKUP_PATH ?? `backups/notes-${stamp}.db`;

mkdirSync(dirname(dest), { recursive: true });

const db = new Database(dbPath, { readonly: true });
await db.backup(dest);
db.close();

console.log(`Backup written to ${dest}`);
