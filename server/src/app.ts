import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { Db } from "./db";
import { getAuth, clearFailures, recordFailure } from "./auth/auth-repo";
import { verifyPasscode } from "./auth/passcode";
import { createSessionToken } from "./auth/token";

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

export function createApp(deps: AppDeps) {
  const { db, config } = deps;
  const now = deps.now ?? Date.now;

  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.post("/api/login", async (c) => {
    const body = await c.req.json<{ passcode?: string }>().catch(() => ({}));
    const passcode = (body as { passcode?: string }).passcode;
    const auth = getAuth(db);

    const ok =
      auth.passcodeHash !== null &&
      passcode !== undefined &&
      (await verifyPasscode(auth.passcodeHash, passcode));

    if (!ok) {
      recordFailure(db);
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
