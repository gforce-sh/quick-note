import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../src/App";
import { useAuth } from "../src/useAuth";
import { useNotesApi } from "../src/useNotesApi";
import type { NotesApi } from "../src/useNotesApi";
import type { Note } from "@notes/shared";

vi.mock("../src/useAuth");
vi.mock("../src/useNotesApi");
vi.mock("../src/NoteEditor", () => ({
  NoteEditor: ({ note }: { note: Note }) => <pre>{note.body}</pre>,
}));

function note(id: string, title: string, body = ""): Note {
  return { id, title, body, createdAt: 0, updatedAt: 1 };
}

function buildNotesApi(initial: Note[] = []): NotesApi {
  let notes = [...initial];
  return {
    list: async () =>
      notes.map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })),
    get: async (id) => notes.find((n) => n.id === id) ?? null,
    create: async () => {
      const created = note("new", "New");
      notes = [created, ...notes];
      return created;
    },
    remove: async (id) => {
      notes = notes.filter((n) => n.id !== id);
    },
  };
}

afterEach(() => window.history.pushState({}, "", "/quick-note"));

describe("App auth guard", () => {
  it("shows the login screen when there is no session", async () => {
    vi.mocked(useAuth).mockReturnValue({
      authed: false,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
      setAuthed: vi.fn(),
    });
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
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
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
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
    vi.mocked(useNotesApi).mockReturnValue(
      buildNotesApi([note("1", "Alpha", "url body")]),
    );
    render(<App />);

    expect(await screen.findByText("url body")).toBeTruthy();
  });
});
