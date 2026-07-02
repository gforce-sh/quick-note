import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp, TEST_USER_ID } from "../helpers/app";
import { setPasscode } from "../../src/auth/auth-repo";
import type { Db } from "../../src/db";

async function loginCookie(app: Hono, db: Db) {
  await setPasscode(db, TEST_USER_ID, "1234");
  const res = await app.request("/api/v1/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode: "1234" }),
  });
  return (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

describe("GET /api/v1/session", () => {
  it("rejects a request with no session cookie", async () => {
    const { app } = buildTestApp();

    expect((await app.request("/api/v1/session")).status).toBe(401);
  });

  it("rejects an invalid session cookie", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/v1/session", {
      headers: { cookie: "session=not-a-real-token" },
    });

    expect(res.status).toBe(401);
  });

  it("accepts a valid session cookie obtained from login", async () => {
    const { app, db } = buildTestApp();
    const cookie = await loginCookie(app, db);

    const res = await app.request("/api/v1/session", { headers: { cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: true });
  });
});
