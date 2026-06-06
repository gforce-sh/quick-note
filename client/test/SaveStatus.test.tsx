import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { SaveStatus } from "../src/SaveStatus";

describe("SaveStatus", () => {
  it("shows a saving message", () => {
    render(() => <SaveStatus status="saving" />);
    expect(screen.getByRole("status").textContent).toBe("Saving…");
  });

  it("shows a saved message", () => {
    render(() => <SaveStatus status="saved" />);
    expect(screen.getByRole("status").textContent).toBe("Saved");
  });

  it("shows a retry message on error", () => {
    render(() => <SaveStatus status="error" />);
    expect(screen.getByRole("status").textContent).toMatch(/couldn.t save/i);
  });
});
