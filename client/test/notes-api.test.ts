import {
  listNotes,
  getNote,
  createNote,
  deleteNote,
  updateNoteBody,
} from "../src/api/notes-api";

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

  it("creates a note via POST with body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      res(201, {
        id: "n1",
        title: "New",
        body: "# New note",
        titleIsCustom: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const note = await createNote({ body: "# New note" });

    expect(note.id).toBe("n1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/notes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "# New note" }),
      }),
    );
  });

  it("deletes a note via DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteNote("n1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/notes/n1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("updates a note body via PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      res(200, {
        id: "1",
        title: "T",
        body: "new body",
        titleIsCustom: false,
        createdAt: 0,
        updatedAt: 2,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const note = await updateNoteBody("1", "new body");

    expect(note.body).toBe("new body");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/notes/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ body: "new body" }),
      }),
    );
  });

});
