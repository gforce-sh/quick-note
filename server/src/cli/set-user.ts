import 'dotenv/config';
import { createDb } from '../db';
import { registerUser, type AssignableRole } from '../auth/auth-repo';

// usage: npm run set-user -- <name> <4-digit> [m|g|p]
const [name, passcode, role] = process.argv.slice(2);

const ROLES: AssignableRole[] = ['m', 'g', 'p'];

if (
  !name ||
  !passcode ||
  !/^\d{4}$/.test(passcode) ||
  (role !== undefined && !ROLES.includes(role as AssignableRole))
) {
  console.error(
    'usage: npm run set-user -- <name> <4-digit-code> [role: m|g|p]',
  );
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH ?? 'data/notes.db';
const db = createDb(dbPath);

const result = await registerUser(db, {
  name,
  passcode,
  role: role as AssignableRole | undefined,
});
if (!result.ok) {
  console.error(
    result.reason === 'owner-forbidden'
      ? `User "${name}" cannot be modified.`
      : 'That passcode is not available. Choose another.',
  );
  process.exit(1);
}

if (result.created) {
  console.log(
    `Created user "${name}" (id ${result.user.id}, role ${result.user.role}).`,
  );
}
console.log(`Passcode set for "${name}" (${dbPath}).`);
