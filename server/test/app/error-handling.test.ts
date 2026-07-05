import { describe, it, expect, vi } from "vitest";
import { createApp, type AppConfig } from "../../src/app";
import { buildTestApp } from "../helpers/app";
import type { Db } from "../../src/db";

const config: AppConfig = {
  sessionSecret: "test-secret",
  sessionTtlMs: 1000,
  secureCookies: false,
};

describe("error handling", () => {
  it("returns a JSON 404 for unknown paths", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/v1/nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("returns a generic JSON 500 when a handler throws, without leaking the cause", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    // A db whose queries blow up forces an unexpected fault inside a handler.
    const brokenDb = {
      select() {
        throw new Error("boom-secret-detail");
      },
    } as unknown as Db;
    const app = createApp({ db: brokenDb, config, now: () => 0 });

    const res = await app.request("/api/v1/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode: "1234" }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "internal error" });
    expect(JSON.stringify(body)).not.toContain("boom");
    // Detail is still captured server-side for debugging.
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
