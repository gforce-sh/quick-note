import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";
import { setPasscode, getAuth } from "../../src/auth/auth-repo";

function login(app: Hono, passcode: string) {
  return app.request("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
}

describe("POST /api/login", () => {
  it("accepts the correct passcode and sets a session cookie", async () => {
    const { app, db } = buildTestApp();
    await setPasscode(db, "1234");

    const res = await login(app, "1234");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/session=/);
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("rejects a wrong passcode and counts the failed attempt", async () => {
    const { app, db } = buildTestApp();
    await setPasscode(db, "1234");

    const res = await login(app, "0000");

    expect(res.status).toBe(401);
    expect(getAuth(db).failedAttempts).toBe(1);
  });
});
