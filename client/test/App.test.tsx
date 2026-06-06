import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import type { NotesApi } from "../src/NotesApp";
import type { Note } from "@notes/shared";

function note(id: string, title: string, body = ""): Note {
  return { id, title, body, titleIsCustom: false, createdAt: 0, updatedAt: 1 };
}

function notesApi(initial: Note[] = []): NotesApi {
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

afterEach(() => window.history.pushState({}, "", "/"));

describe("App auth guard", () => {
  it("shows the login screen when there is no session", async () => {
    render(() => (
      <App checkSession={() => Promise.resolve(false)} login={vi.fn()} />
    ));

    expect(await screen.findAllByRole("textbox")).toHaveLength(4);
  });

  it("shows the notes app when a session exists", async () => {
    render(() => (
      <App
        checkSession={() => Promise.resolve(true)}
        login={vi.fn()}
        notesApi={notesApi([])}
      />
    ));

    expect(
      await screen.findByRole("button", { name: "New note" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("enters the notes app after a successful login", async () => {
    render(() => (
      <App
        checkSession={() => Promise.resolve(false)}
        login={vi.fn().mockResolvedValue({ ok: true })}
        notesApi={notesApi([])}
      />
    ));
    await screen.findAllByRole("textbox");

    const user = userEvent.setup();
    const inputs = screen.getAllByRole("textbox");
    for (let i = 0; i < 4; i++) await user.type(inputs[i]!, String(i + 1));

    expect(
      await screen.findByRole("button", { name: "New note" }),
    ).toBeTruthy();
  });

  it("selects the note named in the URL", async () => {
    window.history.pushState({}, "", "/n/1");

    render(() => (
      <App
        checkSession={() => Promise.resolve(true)}
        login={vi.fn()}
        notesApi={notesApi([note("1", "Alpha", "url body")])}
      />
    ));

    expect(await screen.findByText("url body")).toBeTruthy();
  });
});
