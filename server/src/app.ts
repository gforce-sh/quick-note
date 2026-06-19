import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Db } from './db';
import { findUserByPasscode } from './auth/auth-repo';
import { createSessionToken, verifySessionToken } from './auth/token';
import {
  createNote,
  listNotes,
  getNote,
  updateNoteBody,
  renameNote,
  deleteNote,
} from './notes/notes-repo';

declare module 'hono' {
  interface ContextVariableMap {
    userId: number;
  }
}

export interface AppConfig {
  sessionSecret: string;
  sessionTtlMs: number;
  /** Set the Secure flag on the session cookie (off in dev over http). */
  secureCookies: boolean;
}

export interface AppDeps {
  db: Db;
  config: AppConfig;
  /** Injectable clock; defaults to Date.now. Lets tests control time. */
  now?: () => number;
}

const SESSION_COOKIE = 'session';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export function createApp(deps: AppDeps) {
  const { db, config } = deps;
  const now = deps.now ?? Date.now;

  // Global in-memory lockout — resets on server restart, tracks failed
  // login attempts across all users since passcode-only login cannot attribute
  // a failed guess to a specific user.
  let failedAttempts = 0;
  let lockedUntil: number | null = null;

  const app = new Hono();

  const requireSession: MiddlewareHandler = async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const payload = token
      ? verifySessionToken(token, config.sessionSecret, { now: now() })
      : null;
    if (!payload) return c.json({ error: 'unauthorized' }, 401);
    c.set('userId', payload.userId);
    await next();
  };

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/session', requireSession, (c) =>
    c.json({ authenticated: true }),
  );

  app.post('/api/logout', (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ ok: true });
  });

  app.post('/api/login', async (c) => {
    const ts = now();

    // Expire a lapsed lockout.
    if (lockedUntil !== null && lockedUntil <= ts) {
      failedAttempts = 0;
      lockedUntil = null;
    }
    if (lockedUntil !== null) {
      return c.json({ error: 'locked' }, 429);
    }

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
  });

  app.post('/api/notes', requireSession, (c) => {
    const note = createNote(db, { now: now(), userId: c.get('userId') });
    return c.json(note, 201);
  });

  app.get('/api/notes', requireSession, (c) =>
    c.json(listNotes(db, c.get('userId'))),
  );

  app.get('/api/notes/:id', requireSession, (c) => {
    const note = getNote(db, c.get('userId'), c.req.param('id'));
    if (!note) return c.json({ error: 'not found' }, 404);
    return c.json(note);
  });

  app.patch('/api/notes/:id', requireSession, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const patch = await c.req
      .json<{ body?: string; title?: string }>()
      .catch(() => ({}) as { body?: string; title?: string });

    if (typeof patch.title === 'string') {
      const note = renameNote(db, userId, id, patch.title, { now: now() });
      return note ? c.json(note) : c.json({ error: 'not found' }, 404);
    }
    if (typeof patch.body === 'string') {
      const note = updateNoteBody(db, userId, id, patch.body, { now: now() });
      return note ? c.json(note) : c.json({ error: 'not found' }, 404);
    }
    return c.json({ error: 'nothing to update' }, 400);
  });

  app.delete('/api/notes/:id', requireSession, (c) => {
    const removed = deleteNote(db, c.get('userId'), c.req.param('id'));
    return removed ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
  });

  return app;
}
