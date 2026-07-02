import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { auth, type Role } from '../db/schema';
import { hashPasscode, verifyPasscode } from './passcode';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  passcodeHash: string | null;
}

function toAuthUser(row: {
  id: string;
  name: string;
  role: Role;
  passcodeHash: string | null;
}): AuthUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    passcodeHash: row.passcodeHash,
  };
}

/** Read a single auth user by id, or null if not found. */
export function getAuth(db: Db, userId: string): AuthUser | null {
  const row = db.select().from(auth).where(eq(auth.id, userId)).get();
  return row ? toAuthUser(row) : null;
}

/** Read a single auth user by name, or null if not found. */
export function getAuthByName(db: Db, name: string): AuthUser | null {
  const row = db.select().from(auth).where(eq(auth.name, name)).get();
  return row ? toAuthUser(row) : null;
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
      return toAuthUser(row);
    }
  }
  return null;
}

/** Hash and store a passcode for a specific user. */
export async function setPasscode(
  db: Db,
  userId: string,
  passcode: string,
): Promise<void> {
  const hash = await hashPasscode(passcode);
  db.update(auth).set({ passcodeHash: hash }).where(eq(auth.id, userId)).run();
}

/** Roles assignable through registerUser; owner ('o') is excluded. */
export type AssignableRole = Exclude<Role, 'o'>;

export interface RegisterUserInput {
  name: string;
  passcode: string;
  /** Defaults to 'g' on creation; leaves the role unchanged on update. */
  role?: AssignableRole;
}

export type RegisterUserResult =
  | { ok: true; user: AuthUser; created: boolean }
  | { ok: false; reason: 'passcode-taken' | 'owner-forbidden' };

/**
 * Create the named user (or reuse the existing one) and set its passcode and
 * role. A passcode may belong to at most one user: if another user already
 * owns it, fails with `passcode-taken` and nothing is written. Owner accounts
 * (role 'o') can neither be assigned nor modified here (`owner-forbidden`).
 *
 * Seeding workflow:
 *   npm run set-user -- alice 1234
 *   npm run set-user -- bob 5678 m
 */
export async function registerUser(
  db: Db,
  { name, passcode, role }: RegisterUserInput,
): Promise<RegisterUserResult> {
  const target = getAuthByName(db, name);

  // Owners are off-limits: neither an existing owner nor a request for 'o'.
  if (target?.role === 'o' || (role as Role | undefined) === 'o') {
    return { ok: false, reason: 'owner-forbidden' };
  }

  // Passcode uniqueness is the primary guard. A match against the same user we
  // are about to update is fine (re-setting their own passcode).
  const passcodeOwner = await findUserByPasscode(db, passcode);
  if (passcodeOwner && passcodeOwner.id !== target?.id) {
    return { ok: false, reason: 'passcode-taken' };
  }

  if (!target) {
    const rows = db
      .insert(auth)
      .values(role ? { name, role } : { name })
      .returning()
      .all();
    const user = toAuthUser(rows[0]!);
    await setPasscode(db, user.id, passcode);
    return { ok: true, user, created: true };
  }

  if (role && role !== target.role) {
    db.update(auth).set({ role }).where(eq(auth.id, target.id)).run();
  }
  await setPasscode(db, target.id, passcode);
  return { ok: true, user: getAuth(db, target.id)!, created: false };
}
