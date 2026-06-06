import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import type { Db } from "./db";
import { getAuth, clearFailures, recordFailure } from "./auth/auth-repo";
import { verifyPasscode } from "./auth/passcode";
import { createSessionToken, verifySessionToken } from "./auth/token";

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

  return app;
}
