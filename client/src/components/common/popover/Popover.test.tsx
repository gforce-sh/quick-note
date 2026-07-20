import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover } from "./Popover";

describe("Popover", () => {
  it("renders nothing when open is false (default)", () => {
    render(<Popover open={false} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders nothing when open is explicitly false", () => {
    render(<Popover open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a dialog when open is true", () => {
    render(<Popover open onClose={() => {}}>Click me</Popover>);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
  });

  it("clicking backdrop calls onClose", async () => {
    const onClose = vi.fn();
    render(<Popover open onClose={onClose}>Content</Popover>);

    const backdrop = screen.getByRole("dialog").parentElement!;
    await userEvent.setup().click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("applies custom className to backdrop", () => {
    const { container } = render(<Popover open className="custom-class">Content</Popover>);

    expect(container.querySelector(".custom-class")).toBeTruthy();
  });

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    const { container } = render(<Popover open onClose={onClose}>Content</Popover>);

    // The Command component renders to a [cmdk-root] element.
    const cmdkRoot = container.querySelector('[cmdk-root]');
    fireEvent.keyDown(cmdkRoot, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
