import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesApp, type NotesApi } from "../src/NotesApp";
import type { Note, NoteSummary } from "@notes/shared";

function note(id: string, title: string, body = ""): Note {
  return { id, title, body, titleIsCustom: false, createdAt: 0, updatedAt: 1 };
}

function fakeApi(initial: Note[] = []): NotesApi {
  let notes = [...initial];
  return {
    list: vi.fn(
      async (): Promise<NoteSummary[]> =>
        notes.map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })),
    ),
    get: vi.fn(async (id: string) => notes.find((n) => n.id === id) ?? null),
    create: vi.fn(async () => {
      const created = note("new-1", "New note 2026-06-06 00:00");
      notes = [created, ...notes];
      return created;
    }),
    remove: vi.fn(async (id: string) => {
      notes = notes.filter((n) => n.id !== id);
    }),
    rename: vi.fn(async (id: string, title: string) => {
      notes = notes.map((n) => (n.id === id ? { ...n, title } : n));
      return notes.find((n) => n.id === id)!;
    }),
  };
}

function Harness({ api }: { api: NotesApi }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <NotesApp
      api={api}
      selectedId={sel}
      onSelect={setSel}
      renderNote={(n) => (
        <div>
          <h2>{n.title}</h2>
          <pre>{n.body}</pre>
        </div>
      )}
    />
  );
}

describe("NotesApp", () => {
  it("shows an empty state when there are no notes", async () => {
    render(<Harness api={fakeApi([])} />);

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });

  it("lists notes from the api", async () => {
    render(<Harness api={fakeApi([note("1", "Alpha")])} />);

    expect(await screen.findByText("Alpha")).toBeTruthy();
  });

  it("shows a note's body when selected", async () => {
    render(<Harness api={fakeApi([note("1", "Alpha", "hello body")])} />);

    await userEvent.setup().click(await screen.findByText("Alpha"));

    expect(await screen.findByText("hello body")).toBeTruthy();
  });

  it("creates a note and selects it", async () => {
    render(<Harness api={fakeApi([])} />);
    await screen.findByText(/no notes yet/i);

    await userEvent.setup().click(screen.getByRole("button", { name: "New note" }));

    expect(
      await screen.findByRole("heading", { name: /new note/i }),
    ).toBeTruthy();
  });

  it("renames a note from the sidebar", async () => {
    const api = fakeApi([note("1", "Alpha")]);
    render(<Harness api={api} />);
    const user = userEvent.setup();

    await user.dblClick(await screen.findByText("Alpha"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Renamed!{Enter}");

    expect(await screen.findByText("Renamed!")).toBeTruthy();
    expect(api.rename).toHaveBeenCalledWith("1", "Renamed!");
  });

  it("clears the view after deleting the selected note", async () => {
    render(<Harness api={fakeApi([note("1", "Alpha", "hi")])} />);
    const user = userEvent.setup();
    await user.click(await screen.findByText("Alpha"));
    await screen.findByText("hi");

    const del = screen.getByRole("button", { name: "Delete Alpha" });
    await user.click(del); // arm
    await user.click(del); // confirm

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });
});
