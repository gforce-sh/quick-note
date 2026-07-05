import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { buildTestApp, TEST_USER_ID } from "../helpers/app";
import { auth } from "../../src/db/schema";
import { findUserByPasscode, setPasscode } from "../../src/auth/auth-repo";

function patchMe(app: Hono, cookie: string, body: unknown) {
  return app.request("/api/v1/me", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function setUser(app: Hono, body: unknown) {
  return app.request("/api/v1/set-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function login(app: Hono, passcode: string) {
  return app.request("/api/v1/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
}

describe("PATCH /api/v1/me", () => {
  it("changes the authenticated user's passcode and returns 200", async () => {
    const { app, db, authCookie } = buildTestApp();

    const res = await patchMe(app, authCookie(), { passcode: "4321" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: TEST_USER_ID });
    const owner = await findUserByPasscode(db, "4321");
    expect(owner?.id).toBe(TEST_USER_ID);
  });

  it("can also change the caller's role", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await patchMe(app, authCookie(), { passcode: "4321", role: "m" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "m" });
  });

  it("rejects re-using the caller's own current passcode with a generic 400", async () => {
    const { app, authCookie } = buildTestApp();
    await patchMe(app, authCookie(), { passcode: "4321" });

    const res = await patchMe(app, authCookie(), { passcode: "4321" });

    expect(res.status).toBe(400);
  });

  it("rejects a passcode already owned by another user with a generic 400", async () => {
    const { app, authCookie } = buildTestApp();
    await setUser(app, { name: "bob", passcode: "1234" });

    const res = await patchMe(app, authCookie(), { passcode: "1234" });

    expect(res.status).toBe(400);
  });

  it("refuses to modify an owner account with a generic 400", async () => {
    const { app, db, authCookie } = buildTestApp();
    db.update(auth).set({ role: "o" }).where(eq(auth.id, TEST_USER_ID)).run();

    const res = await patchMe(app, authCookie(), { passcode: "4321" });

    expect(res.status).toBe(400);
  });

  it("rejects assigning the owner role with 400", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await patchMe(app, authCookie(), { passcode: "4321", role: "o" });

    expect(res.status).toBe(400);
  });

  it("rejects a malformed passcode with 400", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await patchMe(app, authCookie(), { passcode: "12" });

    expect(res.status).toBe(400);
  });

  it("requires a session", async () => {
    const { app } = buildTestApp();

    const res = await patchMe(app, "", { passcode: "4321" });

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/me lockout", () => {
  it("locks with 429 after repeated taken-passcode guesses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app, authCookie } = buildTestApp();
    await setUser(app, { name: "bob", passcode: "1234" });

    // Each guess of bob's passcode fails (400) without changing the caller's.
    for (let i = 0; i < 5; i++) {
      expect((await patchMe(app, authCookie(), { passcode: "1234" })).status).toBe(400);
    }

    // Now locked — even a free, valid passcode is refused.
    expect((await patchMe(app, authCookie(), { passcode: "9999" })).status).toBe(429);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not reset the counter on a successful passcode change", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app, authCookie } = buildTestApp();
    await setUser(app, { name: "bob", passcode: "1234" });

    // Four failed guesses...
    for (let i = 0; i < 4; i++) {
      await patchMe(app, authCookie(), { passcode: "1234" });
    }
    // ...a genuine success in between must NOT clear the counter...
    expect((await patchMe(app, authCookie(), { passcode: "5555" })).status).toBe(200);
    // ...so a fifth guess still reaches the threshold and locks the system.
    expect((await patchMe(app, authCookie(), { passcode: "1234" })).status).toBe(400);
    expect((await patchMe(app, authCookie(), { passcode: "6666" })).status).toBe(429);
    warn.mockRestore();
  });

  it("shares the lockout with login and set-user", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app, db, authCookie } = buildTestApp();
    await setPasscode(db, TEST_USER_ID, "1111");
    await setUser(app, { name: "bob", passcode: "1234" });

    // Five failures spread across three endpoints trip the shared counter.
    for (let i = 0; i < 3; i++) await login(app, "0000");
    for (let i = 0; i < 2; i++) await setUser(app, { name: "x", passcode: "1234" });

    // PATCH is locked too, though it never failed on its own.
    expect((await patchMe(app, authCookie(), { passcode: "9999" })).status).toBe(429);
    warn.mockRestore();
  });
});
