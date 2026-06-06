import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { auth } from "../db/schema";
import { hashPasscode } from "./passcode";

export interface AuthRow {
  passcodeHash: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
}

/** Read the singleton auth row. */
export function getAuth(db: Db): AuthRow {
  const row = db.select().from(auth).where(eq(auth.id, 1)).get();
  if (!row) throw new Error("auth row missing — migrations did not run");
  return {
    passcodeHash: row.passcodeHash,
    failedAttempts: row.failedAttempts,
    lockedUntil: row.lockedUntil,
  };
}

/** Hash and store the Passcode. */
export async function setPasscode(db: Db, passcode: string): Promise<void> {
  const hash = await hashPasscode(passcode);
  db.update(auth).set({ passcodeHash: hash }).where(eq(auth.id, 1)).run();
}

/** Record one failed Passcode attempt; returns the new count. */
export function recordFailure(db: Db): number {
  const next = getAuth(db).failedAttempts + 1;
  db.update(auth).set({ failedAttempts: next }).where(eq(auth.id, 1)).run();
  return next;
}

/** Reset the failed-attempt counter and clear any Lockout. */
export function clearFailures(db: Db): void {
  db.update(auth)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(auth.id, 1))
    .run();
}
