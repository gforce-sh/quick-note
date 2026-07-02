import { createApp, type AppConfig } from "../../src/app";
import { createDb } from "../../src/db";
import { auth } from "../../src/db/schema";
import { createSessionToken } from "../../src/auth/token";

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export function buildTestApp(overrides: Partial<AppConfig> = {}) {
  const db = createDb(":memory:");
  db.insert(auth).values({ id: TEST_USER_ID, name: "test" }).run();

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
    /** A `Cookie` header value carrying a valid session for the current clock. */
    authCookie: () =>
      `session=${createSessionToken(config.sessionSecret, {
        ttlMs: config.sessionTtlMs,
        now: current,
        userId: TEST_USER_ID,
      })}`,
  };
}
