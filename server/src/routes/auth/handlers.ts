import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppDeps } from '../../app';
import {
  findUserByPasscode,
  getAuth,
  registerUser,
  updateUser,
} from '../../auth/auth-repo';
import { createSessionToken, verifySessionToken } from '../../auth/token';
import { createTelegramNotifier } from '../../notify/telegram';

const SESSION_COOKIE = 'session';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export function createAuthHandlers(deps: AppDeps) {
  const { db, config } = deps;
  const now = deps.now ?? Date.now;
  const notify = deps.notify ?? createTelegramNotifier(config.telegram);

  // Global in-memory lockout, shared across login and the passcode-mutation
  // endpoints (set-user, PATCH /me). Global rather than per-user because
  // passcode-only auth cannot attribute a failed guess to a specific user, and
  // shared across endpoints so an attacker cannot dodge the lock by switching
  // between them. Resets on server restart.
  let failedAttempts = 0;
  let lockedUntil: number | null = null;

  // True while locked; clears an expired lock as a side effect.
  const isLocked = (ts: number): boolean => {
    if (lockedUntil !== null && lockedUntil <= ts) {
      failedAttempts = 0;
      lockedUntil = null;
    }
    return lockedUntil !== null;
  };

  // Count a failed passcode guess and engage the lock once the threshold is hit.
  // `source` names the endpoint that triggered this guess so the alert can report
  // which one tipped the system into lockout.
  const recordFailedGuess = (ts: number, source: string): void => {
    failedAttempts++;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = ts + LOCKOUT_MS;
      const until = new Date(lockedUntil).toISOString();
      console.warn(
        `[auth] locked until ${until} after ${failedAttempts} failed attempts (last: ${source})`,
      );
      // Fire once, only as the lock first engages — subsequent blocked requests
      // are short-circuited by isLocked() and never reach here.
      notify(
        `🔒 quick-note locked after ${failedAttempts} failed passcode attempts (last from ${source}). Locked until ${until}.`,
      );
    }
  };

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
    if (isLocked(now())) return c.json({ error: 'locked' }, 429);

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
      // A well-formed passcode that's already taken is a brute-force guess.
      recordFailedGuess(now(), 'set-user');
      return c.json({ error: 'passcode not available, choose another' }, 409);
    }
    return c.json(
      { id: result.user.id, name: result.user.name, role: result.user.role },
      201,
    );
  };

  // PATCH /me — the authenticated user changes their own passcode. Role is not
  // settable here; the target comes from the session, never from the body.
  // Responses are limited to 200 / 400 / 401 (plus 429 when locked): any
  // rejection returns a generic 400 so the endpoint can't be used to probe
  // which passcodes exist, and the shared lockout caps how many probes are
  // possible before the system locks.
  const patchUser = async (c: Context) => {
    const ts = now();
    if (isLocked(ts)) return c.json({ error: 'locked' }, 429);

    const userId = c.get('userId') as string;
    const body = await c.req
      .json<{ passcode?: string }>()
      .catch(() => ({}) as { passcode?: string });
    const passcode = body.passcode;

    if (typeof passcode !== 'string' || !/^\d{4}$/.test(passcode)) {
      return c.json({ error: '4-digit passcode required' }, 400);
    }

    const result = await updateUser(db, userId, { passcode });
    if (!result.ok) {
      // A well-formed passcode that's already taken is a brute-force guess;
      // count it toward the lockout. The reason is inspected only internally —
      // every failure still collapses to a generic 400 so the response never
      // reveals whether the passcode is in use or the account is the owner.
      if (result.reason === 'passcode-taken') {
        recordFailedGuess(ts, 'patch-me');
      }
      return c.json({ error: 'invalid request' }, 400);
    }
    return c.json({
      id: result.user.id,
      name: result.user.name,
      role: result.user.role,
    });
  };

  const logout = (c: Context) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ ok: true });
  };

  const login = async (c: Context) => {
    const ts = now();

    if (isLocked(ts)) return c.json({ error: 'locked' }, 429);

    const body = await c.req.json<{ passcode?: string }>().catch(() => ({}));
    const passcode = (body as { passcode?: string }).passcode;
    const user =
      passcode !== undefined ? await findUserByPasscode(db, passcode) : null;

    if (!user) {
      recordFailedGuess(ts, 'login');
      return c.json({ error: 'invalid passcode' }, 401);
    }

    // A correct passcode is proof of legitimacy, so it clears the counter.
    // Mutation-endpoint successes deliberately do NOT, since an authenticated
    // caller can manufacture those at will.
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

  return {
    requireSession,
    health,
    session,
    me,
    setUser,
    patchUser,
    logout,
    login,
  };
}
