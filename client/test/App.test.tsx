import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  return { id, title, body, titleIsCustom: false, createdAt: 0, updatedAt: 1 };
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
    rename: async (id, title) => {
      notes = notes.map((n) => (n.id === id ? { ...n, title } : n));
      return notes.find((n) => n.id === id)!;
    },
  };
}

afterEach(() => window.history.pushState({}, "", "/"));

describe("App auth guard", () => {
  it("shows the login screen when there is no session", async () => {
    vi.mocked(useAuth).mockReturnValue({
      checkSession: () => Promise.resolve(false),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
    render(<App />);

    expect(await screen.findAllByRole("textbox")).toHaveLength(4);
  });

  it("shows the notes app when a session exists", async () => {
    vi.mocked(useAuth).mockReturnValue({
      checkSession: () => Promise.resolve(true),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "New note" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("enters the notes app after a successful login", async () => {
    vi.mocked(useAuth).mockReturnValue({
      checkSession: () => Promise.resolve(false),
      login: vi.fn().mockResolvedValue({ ok: true }),
      logout: vi.fn(),
    });
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
    render(<App />);
    await screen.findAllByRole("textbox");

    const user = userEvent.setup();
    const inputs = screen.getAllByRole("textbox");
    for (let i = 0; i < 4; i++) await user.type(inputs[i]!, String(i + 1));

    expect(
      await screen.findByRole("button", { name: "New note" }),
    ).toBeTruthy();
  });

  it("logs out and returns to the login screen", async () => {
    vi.mocked(useAuth).mockReturnValue({
      checkSession: () => Promise.resolve(true),
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(useNotesApi).mockReturnValue(buildNotesApi());
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /log out/i }));

    expect(await screen.findAllByRole("textbox")).toHaveLength(4);
  });

  it("selects the note named in the URL", async () => {
    window.history.pushState({}, "", "/n/1");
    vi.mocked(useAuth).mockReturnValue({
      checkSession: () => Promise.resolve(true),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useNotesApi).mockReturnValue(
      buildNotesApi([note("1", "Alpha", "url body")]),
    );
    render(<App />);

    expect(await screen.findByText("url body")).toBeTruthy();
  });
});
