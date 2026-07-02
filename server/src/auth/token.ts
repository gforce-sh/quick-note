import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  /** issued-at, epoch ms */
  iat: number;
  /** expiry, epoch ms */
  exp: number;
  /** auth user id */
  userId: string;
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSessionToken(
  secret: string,
  opts: { ttlMs: number; now?: number; userId: string },
): string {
  const now = opts.now ?? Date.now();
  const payload: SessionPayload = { iat: now, exp: now + opts.ttlMs, userId: opts.userId };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signBody(body, secret)}`;
}

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
  if (typeof payload.userId !== "string") return null;

  return payload;
}
