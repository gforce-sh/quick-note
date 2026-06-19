import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { auth } from '../db/schema';
import { hashPasscode, verifyPasscode } from './passcode';

export interface AuthUser {
  id: number;
  name: string;
  passcodeHash: string | null;
}

/** Read a single auth user by id, or null if not found. */
export function getAuth(db: Db, userId: number): AuthUser | null {
  const row = db.select().from(auth).where(eq(auth.id, userId)).get();
  if (!row) return null;
  return { id: row.id, name: row.name, passcodeHash: row.passcodeHash };
}

/**
 * Find the auth user whose passcode hash matches the given passcode.
 * Returns null if no user matches.
 */
export async function findUserByPasscode(
  db: Db,
  passcode: string,
): Promise<AuthUser | null> {
  const rows = db.select().from(auth).all();
  for (const row of rows) {
    if (
      row.passcodeHash &&
      (await verifyPasscode(row.passcodeHash, passcode))
    ) {
      return { id: row.id, name: row.name, passcodeHash: row.passcodeHash };
    }
  }
  return null;
}

/** Hash and store a passcode for a specific user. */
/** Seeding workflow:
npm run set-passcode -- alice 1234
npm run set-passcode -- bob 5678 */
export async function setPasscode(
  db: Db,
  userId: number,
  passcode: string,
): Promise<void> {
  const hash = await hashPasscode(passcode);
  db.update(auth).set({ passcodeHash: hash }).where(eq(auth.id, userId)).run();
}
