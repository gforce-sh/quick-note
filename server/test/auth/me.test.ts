import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { buildTestApp, TEST_USER_ID } from "../helpers/app";
import { auth } from "../../src/db/schema";

describe("GET /api/v1/me", () => {
  it("rejects a request with no session cookie", async () => {
    const { app } = buildTestApp();

    expect((await app.request("/api/v1/me")).status).toBe(401);
  });

  it("returns the authenticated user's name and default role", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/me", {
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "test", xr: "g" });
  });

  it("rejects an invalid role at the DB layer", async () => {
    const { db } = buildTestApp();

    expect(() =>
      db.update(auth).set({ role: "x" as never }).where(eq(auth.id, TEST_USER_ID)).run(),
    ).toThrow();
  });

  it("reflects the stored role", async () => {
    const { app, db, authCookie } = buildTestApp();
    db.update(auth).set({ role: "o" }).where(eq(auth.id, TEST_USER_ID)).run();

    const res = await app.request("/api/v1/me", {
      headers: { cookie: authCookie() },
    });

    expect(await res.json()).toEqual({ name: "test", xr: "o" });
  });
});
