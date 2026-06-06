import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { NoteTitle } from "../src/NoteTitle";

describe("NoteTitle", () => {
  it("shows the title as a heading", () => {
    render(() => <NoteTitle title="Hello" onRename={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Hello" })).toBeTruthy();
  });

  it("renames on Enter", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(() => <NoteTitle title="Hello" onRename={onRename} />);

    await user.click(screen.getByRole("heading", { name: "Hello" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "World{Enter}");

    expect(onRename).toHaveBeenCalledWith("World");
  });

  it("cancels on Escape without renaming", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(() => <NoteTitle title="Hello" onRename={onRename} />);

    await user.click(screen.getByRole("heading", { name: "Hello" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "World{Escape}");

    expect(onRename).not.toHaveBeenCalled();
  });
});
