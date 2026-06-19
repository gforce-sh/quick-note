import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { AppDeps } from '../../app';
import { createNotesHandlers } from './handlers';

export function createNotesRouter(
  deps: AppDeps,
  { requireSession }: { requireSession: MiddlewareHandler },
) {
  const { create, list, get, patch, remove } = createNotesHandlers(deps);

  const router = new Hono();

  router.post('/', requireSession, create);
  router.get('/', requireSession, list);
  router.get('/:id', requireSession, get);
  router.patch('/:id', requireSession, patch);
  router.delete('/:id', requireSession, remove);

  return router;
}
