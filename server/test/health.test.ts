import { describe, it, expect } from "vitest";
import { buildTestApp } from "./helpers/app";
import { version } from "../package.json";

describe("GET /api/v1/health", () => {
  it("reports the service is ok with the app version", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/v1/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", version });
  });
});
