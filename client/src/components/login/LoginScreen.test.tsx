import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "./LoginScreen";
import { ThemeProvider } from "../../context/theme";

async function typeCode(code: string) {
  const user = userEvent.setup();
  const inputs = [1, 2, 3, 4].map((n) =>
    screen.getByLabelText(`Passcode digit ${n}`),
  );
  for (let i = 0; i < code.length; i++) {
    await user.type(inputs[i]!, code[i]!);
  }
}

describe("LoginScreen", () => {
  it("shows four passcode inputs", () => {
    render(
      <ThemeProvider>
        <LoginScreen
          onSubmit={vi.fn().mockResolvedValue({ ok: true })}
        />
      </ThemeProvider>,
    );

    expect(
      [1, 2, 3, 4].map((n) => screen.getByLabelText(`Passcode digit ${n}`)),
    ).toHaveLength(4);
  });

  it("submits the four digits", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(<ThemeProvider><LoginScreen onSubmit={onSubmit} /></ThemeProvider>);

    await typeCode("1234");

    expect(onSubmit).toHaveBeenCalledWith("1234");
  });

  it("shows an error on an incorrect passcode", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, reason: "invalid" });
    render(<ThemeProvider><LoginScreen onSubmit={onSubmit} /></ThemeProvider>);

    await typeCode("0000");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/incorrect/i);
  });

  it("shows a lockout message after too many attempts", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, reason: "locked" });
    render(<ThemeProvider><LoginScreen onSubmit={onSubmit} /></ThemeProvider>);

    await typeCode("0000");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/too many attempts/i);
  });
});
