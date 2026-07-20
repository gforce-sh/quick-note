import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../context/theme";
import { ServiceModal } from "./ServiceModal";

function renderModal(overrides: { open: boolean; onClose: () => void } = { open: true, onClose: vi.fn() }) {
  return render(
    <ThemeProvider>
      <ServiceModal {...overrides} />
    </ThemeProvider>
  );
}

describe("ServiceModal", () => {
  it("does not render when open is false", () => {
    renderModal({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders all settings items when open", () => {
    renderModal();

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Toggle theme" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Backup" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "New user" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Tags" })).toBeTruthy();
  });
});
