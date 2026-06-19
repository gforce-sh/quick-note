import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = process.env.DATABASE_PATH ?? "data/notes.db";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = process.env.BACKUP_PATH ?? `backups/notes-${stamp}.db`;

mkdirSync(dirname(dest), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`VACUUM INTO '${dest}'`);
db.close();

console.log(`Backup written to ${dest}`);
