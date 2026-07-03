import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppDeps } from '../../app';
import {
  findUserByPasscode,
  getAuth,
  registerUser,
} from '../../auth/auth-repo';
import { createSessionToken, verifySessionToken } from '../../auth/token';

const SESSION_COOKIE = 'session';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export function createAuthHandlers(deps: AppDeps) {
  const { db, config } = deps;
  const now = deps.now ?? Date.now;

  // Global in-memory lockout — resets on server restart, tracks failed
  // login attempts across all users since passcode-only login cannot attribute
  // a failed guess to a specific user.
  let failedAttempts = 0;
  let lockedUntil: number | null = null;

  const requireSession: MiddlewareHandler = async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const payload = token
      ? verifySessionToken(token, config.sessionSecret, { now: now() })
      : null;
    if (!payload) return c.json({ error: 'unauthorized' }, 401);
    c.set('userId', payload.userId);
    await next();
  };

  const health = (c: Context) => c.json({ status: 'ok' });

  const session = (c: Context) => c.json({ authenticated: true });

  const me = (c: Context) => {
    const userId = c.get('userId') as string;
    const user = getAuth(db, userId);
    if (!user) return c.json({ error: 'not found' }, 404);
    return c.json({ name: user.name, xr: user.role });
  };

  const setUser = async (c: Context) => {
    const body = await c.req
      .json<{ name?: string; passcode?: string; role?: string }>()
      .catch(() => ({}) as { name?: string; passcode?: string; role?: string });
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const passcode = body.passcode;
    const role = body.role;

    if (name.length === 0 || typeof passcode !== 'string' || !/^\d{4}$/.test(passcode)) {
      return c.json({ error: 'name and 4-digit passcode required' }, 400);
    }
    // 'o' (owner) and unknown roles are rejected at the boundary.
    if (role !== undefined && role !== 'm' && role !== 'g' && role !== 'p') {
      return c.json({ error: 'invalid role' }, 400);
    }

    const result = await registerUser(db, { name, passcode, role });
    if (!result.ok) {
      if (result.reason === 'owner-forbidden') {
        return c.json({ error: 'forbidden' }, 403);
      }
      return c.json({ error: 'passcode not available, choose another' }, 409);
    }
    return c.json(
      { id: result.user.id, name: result.user.name, role: result.user.role },
      result.created ? 201 : 200,
    );
  };

  const logout = (c: Context) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ ok: true });
  };

  const login = async (c: Context) => {
    const ts = now();

    if (lockedUntil !== null && lockedUntil <= ts) {
      failedAttempts = 0;
      lockedUntil = null;
    }
    if (lockedUntil !== null) return c.json({ error: 'locked' }, 429);

    const body = await c.req.json<{ passcode?: string }>().catch(() => ({}));
    const passcode = (body as { passcode?: string }).passcode;
    const user =
      passcode !== undefined ? await findUserByPasscode(db, passcode) : null;

    if (!user) {
      failedAttempts++;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = ts + LOCKOUT_MS;
        console.warn(
          `[auth] login locked until ${new Date(lockedUntil).toISOString()} after ${failedAttempts} failed attempts`,
        );
      }
      return c.json({ error: 'invalid passcode' }, 401);
    }

    failedAttempts = 0;
    lockedUntil = null;
    const token = createSessionToken(config.sessionSecret, {
      ttlMs: config.sessionTtlMs,
      now: ts,
      userId: user.id,
    });
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'Lax',
      path: '/',
      maxAge: Math.floor(config.sessionTtlMs / 1000),
    });
    return c.json({ ok: true });
  };

  return { requireSession, health, session, me, setUser, logout, login };
}
