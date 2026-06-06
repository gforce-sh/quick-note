import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  /** issued-at, epoch ms */
  iat: number;
  /** expiry, epoch ms */
  exp: number;
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/**
 * Create a stateless, HMAC-signed session token of the form
 * `base64url(payload).base64url(signature)`. Not a JWT — a plain signed
 * cookie value for a single-origin app.
 */
export function createSessionToken(
  secret: string,
  opts: { ttlMs: number; now?: number },
): string {
  const now = opts.now ?? Date.now();
  const payload: SessionPayload = { iat: now, exp: now + opts.ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signBody(body, secret)}`;
}

/**
 * Verify a session token by signature and expiry only (no DB lookup).
 * Returns the payload when valid and unexpired, otherwise `null`.
 */
export function verifySessionToken(
  token: string,
  secret: string,
  opts: { now?: number } = {},
): SessionPayload | null {
  const now = opts.now ?? Date.now();

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  if (body === undefined || sig === undefined) return null;

  const expected = signBody(body, secret);
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;

  return payload;
}
