import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { backupDatabase } from "../db/backup";

const dbPath = process.env.DATABASE_PATH ?? "data/notes.db";

const db = new DatabaseSync(dbPath);
const dest = backupDatabase(db);
db.close();

console.log(`Backup written to ${dest}`);
