import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/app";

describe("POST /api/v1/logout", () => {
  it("clears the session cookie", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/v1/logout", { method: "POST" });

    expect(res.status).toBe(200);
    const cookie = (res.headers.get("set-cookie") ?? "").toLowerCase();
    expect(cookie).toContain("session=");
    expect(cookie).toContain("max-age=0");
  });
});
