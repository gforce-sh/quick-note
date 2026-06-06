import { createSignal, For, Show } from "solid-js";
import type { LoginResult } from "./api";

export interface LoginScreenProps {
  onSubmit: (passcode: string) => Promise<LoginResult>;
  onSuccess: () => void;
}

const SLOTS = [0, 1, 2, 3];

export function LoginScreen(props: LoginScreenProps) {
  const [digits, setDigits] = createSignal(["", "", "", ""]);
  const [error, setError] = createSignal<string | null>(null);
  const inputs: (HTMLInputElement | undefined)[] = [];

  const reset = () => {
    setDigits(["", "", "", ""]);
    inputs[0]?.focus();
  };

  const submit = async (passcode: string) => {
    setError(null);
    const result = await props.onSubmit(passcode);
    if (result.ok) {
      props.onSuccess();
      return;
    }
    setError(
      result.reason === "locked"
        ? "Too many attempts. Try again later."
        : "Incorrect passcode.",
    );
    reset();
  };

  const handleInput = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits()];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 3) inputs[i + 1]?.focus();
    if (next.every((d) => d !== "")) void submit(next.join(""));
  };

  return (
    <main class="login">
      <form aria-label="Enter passcode" onSubmit={(e) => e.preventDefault()}>
        <For each={SLOTS}>
          {(i) => (
            <input
              ref={(el) => (inputs[i] = el)}
              type="text"
              inputmode="numeric"
              maxlength={1}
              autocomplete="off"
              aria-label={`Passcode digit ${i + 1}`}
              value={digits()[i] ?? ""}
              onInput={(e) => handleInput(i, e.currentTarget.value)}
            />
          )}
        </For>
      </form>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </main>
  );
}
