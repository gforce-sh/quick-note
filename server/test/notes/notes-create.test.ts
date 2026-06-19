import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/app";

describe("POST /api/notes", () => {
  it("requires a session", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/notes", { method: "POST" });

    expect(res.status).toBe(401);
  });

  it("creates an empty note with a default title", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    setNow(Date.UTC(2026, 5, 6, 14, 32));

    const res = await app.request("/api/notes", {
      method: "POST",
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note).toMatchObject({
      body: "",
      title: "New note 2026-06-06 14:32",
    });
    expect(typeof note.id).toBe("string");
  });
});
