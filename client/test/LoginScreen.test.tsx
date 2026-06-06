import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../src/LoginScreen";

async function typeCode(code: string) {
  const user = userEvent.setup();
  const inputs = screen.getAllByRole("textbox");
  for (let i = 0; i < code.length; i++) {
    await user.type(inputs[i]!, code[i]!);
  }
}

describe("LoginScreen", () => {
  it("shows four passcode inputs", () => {
    render(() => (
      <LoginScreen
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
        onSuccess={vi.fn()}
      />
    ));

    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("submits the four digits and signals success", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    render(() => <LoginScreen onSubmit={onSubmit} onSuccess={onSuccess} />);

    await typeCode("1234");

    expect(onSubmit).toHaveBeenCalledWith("1234");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows an error on an incorrect passcode", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, reason: "invalid" });
    render(() => <LoginScreen onSubmit={onSubmit} onSuccess={vi.fn()} />);

    await typeCode("0000");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/incorrect/i);
  });

  it("shows a lockout message after too many attempts", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, reason: "locked" });
    render(() => <LoginScreen onSubmit={onSubmit} onSuccess={vi.fn()} />);

    await typeCode("0000");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/too many attempts/i);
  });
});
