import { Hono } from "hono";
import type { Db } from "./db";

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

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  return app;
}
