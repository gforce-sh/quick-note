import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";
import { auth } from "../../src/db/schema";

function setUser(app: Hono, body: unknown) {
  return app.request("/api/v1/set-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/set-user", () => {
  it("creates a new user with the default role and returns 201", async () => {
    const { app } = buildTestApp();

    const res = await setUser(app, { name: "alice", passcode: "1234" });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "alice", role: "g" });
  });

  it("creates a user with an explicit role", async () => {
    const { app } = buildTestApp();

    const res = await setUser(app, { name: "alice", passcode: "1234", role: "m" });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ role: "m" });
  });

  it("updates an existing user's passcode and role and returns 200", async () => {
    const { app } = buildTestApp();
    await setUser(app, { name: "alice", passcode: "1234" });

    const res = await setUser(app, { name: "alice", passcode: "4321", role: "p" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "p" });
  });

  it("rejects a passcode already owned by another user", async () => {
    const { app } = buildTestApp();
    await setUser(app, { name: "alice", passcode: "1234" });

    const res = await setUser(app, { name: "bob", passcode: "1234" });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).not.toMatch(/exist/i);
  });

  it("rejects assigning the owner role with 400", async () => {
    const { app } = buildTestApp();

    const res = await setUser(app, { name: "alice", passcode: "1234", role: "o" });

    expect(res.status).toBe(400);
  });

  it("refuses to modify an existing owner account with 403", async () => {
    const { app, db } = buildTestApp();
    await setUser(app, { name: "owner", passcode: "1234" });
    db.update(auth).set({ role: "o" }).where(eq(auth.name, "owner")).run();

    const res = await setUser(app, { name: "owner", passcode: "4321" });

    expect(res.status).toBe(403);
  });

  it("rejects a malformed passcode with 400", async () => {
    const { app } = buildTestApp();

    const res = await setUser(app, { name: "alice", passcode: "12" });

    expect(res.status).toBe(400);
  });
});
