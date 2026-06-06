import { describe, it, expect, vi, afterEach } from "vitest";
import { listNotes, getNote, createNote, deleteNote } from "../src/notes-api";

function res(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("notes-api", () => {
  it("lists notes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(200, [{ id: "1", title: "A", updatedAt: 1 }])),
    );

    await expect(listNotes()).resolves.toEqual([
      { id: "1", title: "A", updatedAt: 1 },
    ]);
  });

  it("returns null when a note is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(404, { error: "x" })));

    await expect(getNote("missing")).resolves.toBeNull();
  });

  it("creates a note via POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      res(201, {
        id: "n1",
        title: "New",
        body: "",
        titleIsCustom: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const note = await createNote();

    expect(note.id).toBe("n1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deletes a note via DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteNote("n1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes/n1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
