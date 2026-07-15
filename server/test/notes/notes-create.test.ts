import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/app";

describe("POST /api/v1/notes", () => {
  it("requires a session", async () => {
    const { app } = buildTestApp();

    const res = await app.request("/api/v1/notes", { method: "POST" });

    expect(res.status).toBe(401);
  });

  it("rejects request without body field", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { cookie: authCookie(), "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("rejects request with empty string body", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { cookie: authCookie(), "content-type": "application/json" },
      body: JSON.stringify({ body: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("derives title from a heading", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    setNow(Date.UTC(2026, 5, 6, 14, 32));

    const res = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { cookie: authCookie(), "content-type": "application/json" },
      body: JSON.stringify({ body: "# My Title" }),
    });

    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note.title).toBe("My Title");
    expect(note.body).toBe("# My Title");
  });

  it("derives title from first line when no heading", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    setNow(Date.UTC(2026, 5, 6, 14, 32));

    const res = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { cookie: authCookie(), "content-type": "application/json" },
      body: JSON.stringify({ body: "hello world" }),
    });

    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note.title).toBe("hello world");
  });

  it("uses # as title when heading has no text", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    setNow(Date.UTC(2026, 5, 6, 14, 32));

    const res = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { cookie: authCookie(), "content-type": "application/json" },
      body: JSON.stringify({ body: "# " }),
    });

    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note.title).toBe("#");
  });
});
