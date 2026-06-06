import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";

describe("App auth guard", () => {
  it("shows the login screen when there is no session", async () => {
    render(() => (
      <App checkSession={() => Promise.resolve(false)} login={vi.fn()} />
    ));

    expect(await screen.findAllByRole("textbox")).toHaveLength(4);
  });

  it("shows the app when a session exists", async () => {
    render(() => (
      <App checkSession={() => Promise.resolve(true)} login={vi.fn()} />
    ));

    expect(
      await screen.findByRole("heading", { name: /notes/i }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("enters the app after a successful login", async () => {
    render(() => (
      <App
        checkSession={() => Promise.resolve(false)}
        login={vi.fn().mockResolvedValue({ ok: true })}
      />
    ));
    await screen.findAllByRole("textbox");

    const user = userEvent.setup();
    const inputs = screen.getAllByRole("textbox");
    for (let i = 0; i < 4; i++) await user.type(inputs[i]!, String(i + 1));

    expect(
      await screen.findByRole("heading", { name: /notes/i }),
    ).toBeTruthy();
  });
});
