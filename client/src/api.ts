import type { LoginRequest } from "@notes/shared";

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "locked" };

/** Submit the Passcode. Maps HTTP status to a discriminated result. */
export async function login(passcode: string): Promise<LoginResult> {
  const body: LoginRequest = { passcode };
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  if (res.status === 429) return { ok: false, reason: "locked" };
  return { ok: false, reason: "invalid" };
}

/** True when there is a valid session (the auth-guard probe). */
export async function getSession(): Promise<boolean> {
  const res = await fetch("/api/session");
  return res.ok;
}
