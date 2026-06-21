import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionBar } from "../src/ActionBar";

describe("ActionBar", () => {
  it("triggers a new note", async () => {
    const onNew = vi.fn();
    render(<ActionBar onNew={onNew} onOpenPicker={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "New note" }));

    expect(onNew).toHaveBeenCalled();
  });

  it("opens the note picker", async () => {
    const onOpenPicker = vi.fn();
    render(<ActionBar onNew={vi.fn()} onOpenPicker={onOpenPicker} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Notes" }));

    expect(onOpenPicker).toHaveBeenCalled();
  });

  it("triggers logout", async () => {
    const onLogout = vi.fn();
    render(<ActionBar onNew={vi.fn()} onOpenPicker={vi.fn()} onLogout={onLogout} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /log out/i }));

    expect(onLogout).toHaveBeenCalled();
  });
});
