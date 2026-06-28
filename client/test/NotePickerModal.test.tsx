import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotePickerModal, formatNoteDate } from "../src/NotePickerModal";
import type { NoteSummary } from "@notes/shared";

const notes: NoteSummary[] = [
  { id: "1", title: "First", updatedAt: 0 },
  { id: "2", title: "Second", updatedAt: 0 },
];

function renderModal(overrides: Record<string, unknown> = {}) {
  const props = {
    notes,
    selectedId: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<NotePickerModal {...props} />);
  return props;
}

describe("NotePickerModal", () => {
  it("renders note titles", () => {
    renderModal();

    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("selects a note and closes on click", async () => {
    const { onSelect, onClose } = renderModal();

    await userEvent.setup().click(screen.getByText("First"));

    expect(onSelect).toHaveBeenCalledWith("1");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", async () => {
    const { onClose } = renderModal();

    await userEvent.setup().click(screen.getByRole("dialog").parentElement!);

    expect(onClose).toHaveBeenCalled();
  });

  it("requires two clicks to delete", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderModal();
    const del = screen.getByRole("button", { name: "Delete First" });

    await user.click(del);
    expect(onDelete).not.toHaveBeenCalled();
    expect(del.textContent).toBe("Confirm?");

    await user.click(del);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("does not select the note when the delete button is clicked", async () => {
    const { onSelect } = renderModal();
    const del = screen.getByRole("button", { name: "Delete First" });

    await userEvent.setup().click(del);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("formats dates correctly", () => {
    // new Date(year, monthIndex, day, hours, minutes) uses local time,
    // and formatNoteDate reads local time — so this is timezone-agnostic.
    const ts = new Date(2026, 5, 21, 19, 20, 0).getTime();
    expect(formatNoteDate(ts)).toBe("21 Jun 26 19:20");
  });
});
