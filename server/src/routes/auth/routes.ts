import { Hono } from 'hono';
import type { AppDeps } from '../../app';
import { createAuthHandlers } from './handlers';

export function createAuthRouter(deps: AppDeps) {
  const { requireSession, health, session, logout, login } =
    createAuthHandlers(deps);

  const router = new Hono();

  router.get('/health', health);
  router.get('/session', requireSession, session);
  router.post('/login', login);
  router.post('/logout', logout);

  return { router, requireSession };
}
