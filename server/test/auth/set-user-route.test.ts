import { describe, it, expect, vi } from "vitest";
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

  it("creates a distinct account when the same name is reused", async () => {
    const { app, db } = buildTestApp();
    const first = (await (await setUser(app, { name: "alice", passcode: "1234" })).json()) as {
      id: string;
    };

    const res = await setUser(app, { name: "alice", passcode: "4321" });

    expect(res.status).toBe(201);
    const second = (await res.json()) as { id: string };
    expect(second.id).not.toBe(first.id);
    const alices = db.select().from(auth).where(eq(auth.name, "alice")).all();
    expect(alices).toHaveLength(2);
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

  it("rejects a malformed passcode with 400", async () => {
    const { app } = buildTestApp();

    const res = await setUser(app, { name: "alice", passcode: "12" });

    expect(res.status).toBe(400);
  });

  it("locks with 429 after repeated taken-passcode attempts", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app } = buildTestApp();
    await setUser(app, { name: "alice", passcode: "1234" });

    for (let i = 0; i < 5; i++) {
      expect((await setUser(app, { name: "x", passcode: "1234" })).status).toBe(409);
    }

    // Locked — a fresh, available passcode is refused with 429, not created.
    expect((await setUser(app, { name: "y", passcode: "5678" })).status).toBe(429);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
