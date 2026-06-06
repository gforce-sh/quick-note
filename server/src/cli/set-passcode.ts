import { createDb } from "../db";
import { setPasscode } from "../auth/auth-repo";

const passcode = process.argv[2];

if (passcode === undefined || !/^\d{4}$/.test(passcode)) {
  console.error("usage: npm run set-passcode -- <4-digit-code>");
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH ?? "data/notes.db";
const db = createDb(dbPath);
await setPasscode(db, passcode);
console.log(`Passcode set (${dbPath}).`);
