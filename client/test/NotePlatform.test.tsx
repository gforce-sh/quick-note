import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { Note } from "@notes/shared";
import * as notesApi from "../src/api/notes-api";
import { NotePlatform } from "../src/components/NotePlatform";

vi.mock("../src/api/notes-api");

function note(id: string, title: string, body = ""): Note {
  return { id, title, body, createdAt: 0, updatedAt: 1 };
}

// Wires the mocked notes-api to an in-memory store so create/delete are
// reflected by subsequent list/get calls, matching the real backend.
function mockNotesApi(initial: Note[] = []) {
  let notes = [...initial];
  vi.mocked(notesApi.listNotes).mockImplementation(async () =>
    notes.map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })),
  );
  vi.mocked(notesApi.getNote).mockImplementation(
    async (id) => notes.find((n) => n.id === id) ?? null,
  );
  vi.mocked(notesApi.createNote).mockImplementation(async ({ body }) => {
    const title = body.startsWith("# ") ? "New note 2026-06-06 00:00" : body.split("\n")[0];
    const created = note("new-1", title ?? "New note 2026-06-06 00:00", body);
    notes = [created, ...notes];
    return created;
  });
  vi.mocked(notesApi.deleteNote).mockImplementation(async (id) => {
    notes = notes.filter((n) => n.id !== id);
  });
}

function renderPlatform(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/n/new" element={<NotePlatform />} />
        <Route path="/n/:id" element={<NotePlatform />} />
        <Route path="*" element={<NotePlatform />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openPicker() {
  await userEvent.setup().click(screen.getByRole("button", { name: "Notes" }));
}

describe("NotePlatform", () => {
  it("shows an empty state when there are no notes", async () => {
    mockNotesApi([]);
    renderPlatform();

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });

  it("lists notes from the api in the picker", async () => {
    mockNotesApi([note("1", "Alpha")]);
    renderPlatform();

    await openPicker();

    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("shows a note's body when selected from the picker", async () => {
    mockNotesApi([note("1", "Alpha", "hello body")]);
    renderPlatform();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.click(await screen.findByText("Alpha"));

    expect(await screen.findByText("hello body")).toBeTruthy();
  });

  it("creates a draft and saves it to the server", async () => {
    mockNotesApi([]);
    // Directly render the /n/new route — tests the draft editor without relying on navigation
    renderPlatform("/n/new");

    // The real md-live-editor renders a contenteditable div (role="textbox"), not a textarea.
    // Its initial content is set via innerText (e.g., "# " for drafts).
    const editor = await screen.findByRole("textbox");
    expect(editor.textContent).toMatch(/^#/);

    const user = userEvent.setup();

    // Type content using keyboard events — works on contenteditable without clipboard API
    await user.keyboard("Hello world");

    // md-live-editor debounces at 2000ms (default). Wait for autosave to fire.
    // Using a generous timeout since this is a real-time debounce.
    await waitFor(
      () => {
        expect(notesApi.createNote).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    // createNote should have been called with body containing typed text
    expect(notesApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining("Hello world") }),
    );
  });

  it("clears the view after deleting the selected note", async () => {
    mockNotesApi([note("1", "Alpha", "hi")]);
    renderPlatform();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Notes" }));
    await user.click(screen.getByText("Alpha"));
    await screen.findByText("hi");

    await user.click(screen.getByRole("button", { name: "Notes" }));
    const del = screen.getByRole("button", { name: "Delete Alpha" });
    await user.click(del);
    await user.click(del);

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });
});
