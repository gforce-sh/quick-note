import { Hono } from 'hono';
import type { AppDeps } from '../../app';
import { createAuthHandlers } from './handlers';

export function createAuthRouter(deps: AppDeps) {
  const { requireSession, health, session, me, setUser, patchUser, logout, login } =
    createAuthHandlers(deps);

  const router = new Hono();

  router.get('/health', health);
  router.get('/session', requireSession, session);
  router.get('/me', requireSession, me);
  router.patch('/me', requireSession, patchUser);
  router.post('/set-user', setUser);
  router.post('/login', login);
  router.post('/logout', logout);

  return { router, requireSession };
}
