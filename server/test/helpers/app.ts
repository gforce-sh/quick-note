import { createApp, type AppConfig } from "../../src/app";
import { createDb } from "../../src/db";

/**
 * Build an app wired to a fresh in-memory database and a controllable
 * clock, for integration tests via Hono's `app.request()`.
 */
export function buildTestApp(overrides: Partial<AppConfig> = {}) {
  const db = createDb(":memory:");
  const config: AppConfig = {
    sessionSecret: "test-secret",
    sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
    secureCookies: false,
    ...overrides,
  };

  let current = 0;
  const app = createApp({ db, config, now: () => current });

  return {
    app,
    db,
    config,
    setNow: (t: number) => {
      current = t;
    },
  };
}
