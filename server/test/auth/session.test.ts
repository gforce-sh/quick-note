import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";
import { setPasscode } from "../../src/auth/auth-repo";

async function loginCookie(app: Hono, db: Parameters<typeof setPasscode>[0]) {
  await setPasscode(db, "1234");
  const res = await app.request("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode: "1234" }),
  });
  return (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

describe("GET /api/session", () => {
  it("rejects a request with no session cookie", async () => {
    const { app } = buildTestApp();

    expect((await app.request("/api/session")).status).toBe(401);
  });

  it("rejects an invalid session cookie", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/session", {
      headers: { cookie: "session=not-a-real-token" },
    });

    expect(res.status).toBe(401);
  });

  it("accepts a valid session cookie obtained from login", async () => {
    const { app, db } = buildTestApp();
    const cookie = await loginCookie(app, db);

    const res = await app.request("/api/session", { headers: { cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: true });
  });
});
