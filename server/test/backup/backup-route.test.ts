import { describe, it, expect, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { eq } from "drizzle-orm";
import { buildTestApp, TEST_USER_ID } from "../helpers/app";
import { auth } from "../../src/db/schema";

const BACKUP_PATH = "backups/test-backup.db";

afterEach(() => {
  rmSync(BACKUP_PATH, { force: true });
  delete process.env.BACKUP_PATH;
});

describe("GET /api/v1/backup", () => {
  it("rejects a request with no session cookie", async () => {
    const { app } = buildTestApp();

    expect((await app.request("/api/v1/backup")).status).toBe(401);
  });

  it("forbids non-owner users", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/backup", {
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(403);
  });

  it("writes a snapshot and returns its path for the owner", async () => {
    process.env.BACKUP_PATH = BACKUP_PATH;
    const { app, db, authCookie } = buildTestApp();
    db.update(auth).set({ role: "o" }).where(eq(auth.id, TEST_USER_ID)).run();

    const res = await app.request("/api/v1/backup", {
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ path: BACKUP_PATH });
    expect(existsSync(BACKUP_PATH)).toBe(true);
  });
});
