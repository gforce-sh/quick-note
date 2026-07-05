import { render, screen } from "@testing-library/react";
import { App } from "../src/App";
import { useAuth } from "../src/hooks/useAuth";
import * as notesApi from "../src/api/notes-api";
import type { Note } from "@notes/shared";

vi.mock("../src/hooks/useAuth");
vi.mock("../src/api/notes-api");
vi.mock("../src/components/NoteEditor", () => ({
  NoteEditor: ({ note }: { note: Note }) => <pre>{note.body}</pre>,
}));

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
  vi.mocked(notesApi.createNote).mockImplementation(async () => {
    const created = note("new", "New");
    notes = [created, ...notes];
    return created;
  });
  vi.mocked(notesApi.deleteNote).mockImplementation(async (id) => {
    notes = notes.filter((n) => n.id !== id);
  });
}

beforeEach(() => window.history.pushState({}, "", "/quick-note"));
afterEach(() => window.history.pushState({}, "", "/quick-note"));

describe("App auth guard", () => {
  it("shows the login screen when there is no session", async () => {
    vi.mocked(useAuth).mockReturnValue({
      authed: false,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
      setAuthed: vi.fn(),
    });
    mockNotesApi();
    render(<App />);

    expect(await screen.findAllByLabelText(/Passcode digit \d/)).toHaveLength(4);
  });

  it("shows the notes app when a session exists", async () => {
    window.history.pushState({}, "", "/quick-note");
    vi.mocked(useAuth).mockReturnValue({
      authed: true,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
      setAuthed: vi.fn(),
    });
    mockNotesApi();
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "New note" }),
    ).toBeTruthy();
    expect(screen.queryAllByLabelText(/Passcode digit \d/)).toHaveLength(0);
  });

  it("selects the note named in the URL", async () => {
    window.history.pushState({}, "", "/quick-note/n/1");
    vi.mocked(useAuth).mockReturnValue({
      authed: true,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
      setAuthed: vi.fn(),
    });
    mockNotesApi([note("1", "Alpha", "url body")]);
    render(<App />);

    expect(await screen.findByText("url body")).toBeTruthy();
  });
});
