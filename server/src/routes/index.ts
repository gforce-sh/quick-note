import { Hono } from 'hono';
import type { AppDeps } from '../app';
import { createAuthRouter } from './auth/routes';
import { createNotesRouter } from './notes/routes';
import { createBackupRouter } from './backup/routes';

export function createV1Router(deps: AppDeps) {
  const { router: authRouter, requireSession } = createAuthRouter(deps);
  const notesRouter = createNotesRouter(deps, { requireSession });
  const backupRouter = createBackupRouter(deps, { requireSession });

  const v1 = new Hono();
  v1.route('/', authRouter);
  v1.route('/notes', notesRouter);
  v1.route('/backup', backupRouter);

  return v1;
}
