import { describe, it, expect } from "vitest";
import { buildTestApp } from "./helpers/app";

describe("GET /api/health", () => {
  it("reports the service is ok", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
