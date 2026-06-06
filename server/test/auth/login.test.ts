import { describe, it, expect, vi } from "vitest";
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

const HOUR_MS = 60 * 60 * 1000;

describe("login lockout", () => {
  it("locks login for an hour after 5 failed attempts", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app, db, setNow } = buildTestApp();
    await setPasscode(db, "1234");
    setNow(0);

    for (let i = 0; i < 5; i++) {
      expect((await login(app, "0000")).status).toBe(401);
    }

    // 6th attempt is locked out even with the correct passcode
    expect((await login(app, "1234")).status).toBe(429);
    expect(warn).toHaveBeenCalled(); // the lockout was logged
    warn.mockRestore();
  });

  it("unlocks once the hour has passed", async () => {
    const { app, db, setNow } = buildTestApp();
    await setPasscode(db, "1234");
    setNow(0);
    for (let i = 0; i < 5; i++) await login(app, "0000");

    setNow(HOUR_MS - 1); // still locked just before the hour
    expect((await login(app, "1234")).status).toBe(429);

    setNow(HOUR_MS); // unlocked at the hour
    expect((await login(app, "1234")).status).toBe(200);
  });
});
