import { describe, it, expect } from "vitest";
import type { Hono } from "hono";
import { buildTestApp } from "../helpers/app";

async function createNote(app: Hono, cookie: string) {
  return (
    await app.request("/api/v1/notes", { method: "POST", headers: { cookie } })
  ).json();
}

function patch(app: Hono, cookie: string, id: string, body: unknown) {
  return app.request(`/api/v1/notes/${id}`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/v1/notes/:id — body", () => {
  it("updates the body, re-derives the title, and bumps updatedAt", async () => {
    const { app, authCookie, setNow } = buildTestApp();
    const cookie = authCookie();
    setNow(1000);
    const created = await createNote(app, cookie);

    setNow(5000);
    const res = await patch(app, cookie, created.id, {
      body: "# My Title\n\nhello",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      body: "# My Title\n\nhello",
      title: "My Title",
      updatedAt: 5000,
    });
  });

  it("404s for a missing note", async () => {
    const { app, authCookie } = buildTestApp();

    const res = await patch(app, authCookie(), "nope", { body: "x" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/notes/:id — rename", () => {
  it("sets the title", async () => {
    const { app, authCookie } = buildTestApp();
    const cookie = authCookie();
    const created = await createNote(app, cookie);

    const renamed = await (
      await patch(app, cookie, created.id, { title: "Groceries" })
    ).json();
    expect(renamed).toMatchObject({ title: "Groceries" });
  });

  it("body edit re-derives the title, overwriting a manual rename", async () => {
    const { app, authCookie } = buildTestApp();
    const cookie = authCookie();
    const created = await createNote(app, cookie);
    await patch(app, cookie, created.id, { title: "Groceries" });

    const edited = await (
      await patch(app, cookie, created.id, { body: "# Different heading" })
    ).json();
    expect(edited.title).toBe("Different heading");
  });
});
