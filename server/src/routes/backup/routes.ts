import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import type { AppDeps } from '../../app';
import { getAuth } from '../../auth/auth-repo';
import { backupDatabase } from '../../db/backup';

export function createBackupRouter(
  deps: AppDeps,
  { requireSession }: { requireSession: MiddlewareHandler },
) {
  const { db } = deps;

  // A backup is a full copy of the database (every user's passcode hash and
  // notes), so it is restricted to the owner.
  const backup = (c: Context) => {
    const user = getAuth(db, c.get('userId'));
    if (user?.role !== 'o') return c.json({ error: 'forbidden' }, 403);
    const path = backupDatabase(db.$client);
    return c.json({ path });
  };

  const router = new Hono();
  router.get('/', requireSession, backup);
  return router;
}
