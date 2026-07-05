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

/** Roles assignable through registerUser/updateUser; owner ('o') is excluded. */
export type AssignableRole = Exclude<Role, 'o'>;

export interface RegisterUserInput {
  name: string;
  passcode: string;
  /** Defaults to 'g' when omitted. */
  role?: AssignableRole;
}

export type RegisterUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'passcode-taken' | 'owner-forbidden' };

/**
 * Create a new user with the given passcode and role. Names are not unique —
 * the passcode is a user's identity, so this always creates a fresh account
 * and never reuses one by name. If the passcode already belongs to someone,
 * fails with `passcode-taken` and nothing is written. Owner accounts (role
 * 'o') cannot be created here (`owner-forbidden`). Updating an existing user's
 * passcode is a separate flow — see `updateUser`.
 *
 * Seeding workflow:
 *   npm run set-user -- alice 1234
 *   npm run set-user -- bob 5678 m
 */
export async function registerUser(
  db: Db,
  { name, passcode, role }: RegisterUserInput,
): Promise<RegisterUserResult> {
  // Owner accounts cannot be minted through this path.
  if ((role as Role | undefined) === 'o') {
    return { ok: false, reason: 'owner-forbidden' };
  }

  // A passcode identifies exactly one user, so it must be unused.
  const passcodeOwner = await findUserByPasscode(db, passcode);
  if (passcodeOwner) {
    return { ok: false, reason: 'passcode-taken' };
  }

  const rows = db
    .insert(auth)
    .values(role ? { name, role } : { name })
    .returning()
    .all();
  const user = toAuthUser(rows[0]!);
  await setPasscode(db, user.id, passcode);
  return { ok: true, user };
}

export interface UpdateUserInput {
  passcode: string;
  /** Leaves the role unchanged when omitted. */
  role?: AssignableRole;
}

export type UpdateUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'passcode-taken' | 'owner-forbidden' | 'not-found' };

/**
 * Update an existing user (identified by id) with a new passcode and,
 * optionally, a new role. The new passcode must be unused by anyone — a passcode
 * already in circulation is rejected with `passcode-taken`, including the user's
 * own current passcode. Owner accounts (role 'o') can neither be modified nor
 * assigned (`owner-forbidden`). Returns `not-found` when no user has the given id.
 */
export async function updateUser(
  db: Db,
  userId: string,
  { passcode, role }: UpdateUserInput,
): Promise<UpdateUserResult> {
  const target = getAuth(db, userId);
  if (!target) {
    return { ok: false, reason: 'not-found' };
  }

  // Owners are off-limits: neither the existing account nor a request for 'o'.
  if (target.role === 'o' || (role as Role | undefined) === 'o') {
    return { ok: false, reason: 'owner-forbidden' };
  }

  // Passcode uniqueness is the primary guard. Any passcode already in use is
  // rejected — a user cannot even re-set their own current passcode.
  const passcodeOwner = await findUserByPasscode(db, passcode);
  if (passcodeOwner) {
    return { ok: false, reason: 'passcode-taken' };
  }

  if (role && role !== target.role) {
    db.update(auth).set({ role }).where(eq(auth.id, target.id)).run();
  }
  await setPasscode(db, target.id, passcode);
  return { ok: true, user: getAuth(db, target.id)! };
}
