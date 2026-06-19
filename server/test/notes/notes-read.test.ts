import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";

async function createNote(app: Hono, cookie: string) {
  const res = await app.request("/api/v1/notes", {
    method: "POST",
    headers: { cookie },
  });
  return res.json();
}

describe("GET /api/v1/notes", () => {
  it("requires a session", async () => {
    const { app } = buildTestApp();

    expect((await app.request("/api/v1/notes")).status).toBe(401);
  });

  it("lists notes most-recently-updated first, without bodies", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    const cookie = authCookie();
    setNow(1000);
    const a = await createNote(app, cookie);
    setNow(2000);
    const b = await createNote(app, cookie);

    const res = await app.request("/api/v1/notes", { headers: { cookie } });

    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.map((n: { id: string }) => n.id)).toEqual([b.id, a.id]);
    expect(list[0]).not.toHaveProperty("body");
  });
});

describe("GET /api/v1/notes/:id", () => {
  it("returns a note by id", async () => {
    const { app, authCookie } = buildTestApp();
    const cookie = authCookie();
    const created = await createNote(app, cookie);

    const res = await app.request(`/api/v1/notes/${created.id}`, {
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, body: "" });
  });

  it("404s for a missing note", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/notes/does-not-exist", {
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(404);
  });
});
