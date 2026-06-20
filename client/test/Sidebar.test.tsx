import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../src/Sidebar";

const notes = [
  { id: "1", title: "First", updatedAt: 2 },
  { id: "2", title: "Second", updatedAt: 1 },
];

function renderSidebar(overrides = {}) {
  const props = {
    notes,
    selectedId: null,
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe("Sidebar", () => {
  it("renders note titles", () => {
    renderSidebar();

    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("selects a note when its title is clicked", async () => {
    const { onSelect } = renderSidebar();

    await userEvent.setup().click(screen.getByText("First"));

    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("triggers a new note", async () => {
    const { onNew } = renderSidebar();

    await userEvent.setup().click(screen.getByRole("button", { name: "New note" }));

    expect(onNew).toHaveBeenCalled();
  });

  it("triggers logout", async () => {
    const onLogout = vi.fn();
    renderSidebar({ onLogout });

    await userEvent.setup().click(screen.getByRole("button", { name: /log out/i }));

    expect(onLogout).toHaveBeenCalled();
  });

  it("requires two clicks to delete (arm then confirm)", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSidebar();
    const del = screen.getByRole("button", { name: "Delete First" });

    await user.click(del);
    expect(onDelete).not.toHaveBeenCalled();
    expect(del.textContent).toBe("Confirm?");

    await user.click(del);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("cancels an armed delete when clicking elsewhere", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSidebar();
    const del = screen.getByRole("button", { name: "Delete First" });

    await user.click(del); // arm
    await user.click(screen.getByText("Second")); // click elsewhere

    expect(del.textContent).toBe("Delete");
    expect(onDelete).not.toHaveBeenCalled();
  });
});
