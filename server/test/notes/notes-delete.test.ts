import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";

async function createNote(app: Hono, cookie: string) {
  return (
    await app.request("/api/v1/notes", { method: "POST", headers: { cookie } })
  ).json();
}

describe("DELETE /api/v1/notes/:id", () => {
  it("deletes a note", async () => {
    const { app, authCookie } = buildTestApp();
    const cookie = authCookie();
    const created = await createNote(app, cookie);

    const res = await app.request(`/api/v1/notes/${created.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(200);

    const after = await app.request(`/api/v1/notes/${created.id}`, {
      headers: { cookie },
    });
    expect(after.status).toBe(404);
  });

  it("404s when deleting a missing note", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await app.request("/api/v1/notes/nope", {
      method: "DELETE",
      headers: { cookie: authCookie() },
    });

    expect(res.status).toBe(404);
  });
});
