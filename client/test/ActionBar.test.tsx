import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionBar } from "../src/components/ActionBar";

const defaults = {
  onNew: vi.fn(),
  onOpenPicker: vi.fn(),
  theme: "light" as const,
  onToggleTheme: vi.fn(),
};

describe("ActionBar", () => {
  it("triggers a new note", async () => {
    const onNew = vi.fn();
    render(<ActionBar {...defaults} onNew={onNew} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "New note" }));

    expect(onNew).toHaveBeenCalled();
  });

  it("opens the note picker", async () => {
    const onOpenPicker = vi.fn();
    render(<ActionBar {...defaults} onOpenPicker={onOpenPicker} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Notes" }));

    expect(onOpenPicker).toHaveBeenCalled();
  });

  it("triggers logout", async () => {
    const onLogout = vi.fn();
    render(<ActionBar {...defaults} onLogout={onLogout} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /log out/i }));

    expect(onLogout).toHaveBeenCalled();
  });

  it("calls onToggleTheme when the theme button is clicked", async () => {
    const onToggleTheme = vi.fn();
    render(<ActionBar {...defaults} onToggleTheme={onToggleTheme} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Dark" }));

    expect(onToggleTheme).toHaveBeenCalled();
  });

  it("shows Light label when theme is dark", () => {
    render(<ActionBar {...defaults} theme="dark" />);

    expect(screen.getByRole("button", { name: "Light" })).toBeTruthy();
  });
});
