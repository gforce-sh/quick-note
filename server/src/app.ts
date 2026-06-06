import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import type { Db } from "./db";
import { getAuth, clearFailures, recordFailure } from "./auth/auth-repo";
import { verifyPasscode } from "./auth/passcode";
import { createSessionToken, verifySessionToken } from "./auth/token";
import {
  createNote,
  listNotes,
  getNote,
  updateNoteBody,
  renameNote,
  deleteNote,
} from "./notes/notes-repo";

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

const SESSION_COOKIE = "session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export function createApp(deps: AppDeps) {
  const { db, config } = deps;
  const now = deps.now ?? Date.now;

  const app = new Hono();

  /** Reject requests without a valid, unexpired session cookie. */
  const requireSession: MiddlewareHandler = async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !verifySessionToken(token, config.sessionSecret, { now: now() })) {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  };

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/api/session", requireSession, (c) =>
    c.json({ authenticated: true }),
  );

  app.post("/api/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.post("/api/login", async (c) => {
    const ts = now();
    let auth = getAuth(db);

    // Expire a lapsed Lockout, resetting the counter for a fresh start.
    if (auth.lockedUntil !== null && auth.lockedUntil <= ts) {
      clearFailures(db);
      auth = getAuth(db);
    }
    // Reject while locked, even for the correct Passcode.
    if (auth.lockedUntil !== null && auth.lockedUntil > ts) {
      return c.json({ error: "locked" }, 429);
    }

    const body = await c.req.json<{ passcode?: string }>().catch(() => ({}));
    const passcode = (body as { passcode?: string }).passcode;

    const ok =
      auth.passcodeHash !== null &&
      passcode !== undefined &&
      (await verifyPasscode(auth.passcodeHash, passcode));

    if (!ok) {
      const result = recordFailure(db, {
        now: ts,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        lockMs: LOCKOUT_MS,
      });
      if (result.lockedUntil !== null) {
        console.warn(
          `[auth] login locked until ${new Date(
            result.lockedUntil,
          ).toISOString()} after ${result.failedAttempts} failed attempts`,
        );
      }
      return c.json({ error: "invalid passcode" }, 401);
    }

    clearFailures(db);
    const token = createSessionToken(config.sessionSecret, {
      ttlMs: config.sessionTtlMs,
      now: now(),
    });
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "Lax",
      path: "/",
      maxAge: Math.floor(config.sessionTtlMs / 1000),
    });
    return c.json({ ok: true });
  });

  app.post("/api/notes", requireSession, (c) => {
    const note = createNote(db, { now: now() });
    return c.json(note, 201);
  });

  app.get("/api/notes", requireSession, (c) => c.json(listNotes(db)));

  app.get("/api/notes/:id", requireSession, (c) => {
    const note = getNote(db, c.req.param("id"));
    if (!note) return c.json({ error: "not found" }, 404);
    return c.json(note);
  });

  app.patch("/api/notes/:id", requireSession, async (c) => {
    const id = c.req.param("id");
    const patch = await c.req
      .json<{ body?: string; title?: string }>()
      .catch(() => ({}) as { body?: string; title?: string });

    if (typeof patch.title === "string") {
      const note = renameNote(db, id, patch.title, { now: now() });
      return note ? c.json(note) : c.json({ error: "not found" }, 404);
    }
    if (typeof patch.body === "string") {
      const note = updateNoteBody(db, id, patch.body, { now: now() });
      return note ? c.json(note) : c.json({ error: "not found" }, 404);
    }
    return c.json({ error: "nothing to update" }, 400);
  });

  app.delete("/api/notes/:id", requireSession, (c) => {
    const removed = deleteNote(db, c.req.param("id"));
    return removed ? c.json({ ok: true }) : c.json({ error: "not found" }, 404);
  });

  return app;
}
