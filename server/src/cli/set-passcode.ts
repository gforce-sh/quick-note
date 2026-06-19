import { eq } from "drizzle-orm";
import { createDb } from "../db";
import { auth } from "../db/schema";
import { setPasscode } from "../auth/auth-repo";

const [name, passcode] = process.argv.slice(2);

if (!name || !passcode || !/^\d{4}$/.test(passcode)) {
  console.error("usage: npm run set-passcode -- <name> <4-digit-code>");
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH ?? "data/notes.db";
const db = createDb(dbPath);

let user = db.select().from(auth).where(eq(auth.name, name)).get();
if (!user) {
  const rows = db.insert(auth).values({ name }).returning().all();
  user = rows[0]!;
  console.log(`Created user "${name}" (id ${user.id}).`);
}

await setPasscode(db, user.id, passcode);
console.log(`Passcode set for "${name}" (${dbPath}).`);
