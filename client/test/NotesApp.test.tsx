import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesApp } from "../src/NotesApp";
import { useNotesApi } from "../src/useNotesApi";
import type { NotesApi } from "../src/useNotesApi";
import type { Note, NoteSummary } from "@notes/shared";

vi.mock("../src/useNotesApi");

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
  };
}

function Harness() {
  const [sel, setSel] = useState<string | null>(null);
  return <NotesApp selectedId={sel} onSelect={setSel} />;
}

describe("NotesApp", () => {
  it("shows an empty state when there are no notes", async () => {
    vi.mocked(useNotesApi).mockReturnValue(fakeApi([]));
    render(<Harness />);

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });

  it("lists notes from the api", async () => {
    vi.mocked(useNotesApi).mockReturnValue(fakeApi([note("1", "Alpha")]));
    render(<Harness />);

    expect(await screen.findByText("Alpha")).toBeTruthy();
  });

  it("shows a note's body when selected", async () => {
    vi.mocked(useNotesApi).mockReturnValue(
      fakeApi([note("1", "Alpha", "hello body")]),
    );
    render(<Harness />);

    await userEvent.setup().click(await screen.findByText("Alpha"));

    expect(await screen.findByText("hello body")).toBeTruthy();
  });

  it("creates a note and lists it in the sidebar", async () => {
    vi.mocked(useNotesApi).mockReturnValue(fakeApi([]));
    render(<Harness />);
    await screen.findByText(/no notes yet/i);

    await userEvent.setup().click(screen.getByRole("button", { name: "New note" }));

    expect(await screen.findByText("New note 2026-06-06 00:00")).toBeTruthy();
  });

  it("clears the view after deleting the selected note", async () => {
    vi.mocked(useNotesApi).mockReturnValue(fakeApi([note("1", "Alpha", "hi")]));
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(await screen.findByText("Alpha"));
    await screen.findByText("hi");

    const del = screen.getByRole("button", { name: "Delete Alpha" });
    await user.click(del); // arm
    await user.click(del); // confirm

    expect(await screen.findByText(/no notes yet/i)).toBeTruthy();
  });
});
