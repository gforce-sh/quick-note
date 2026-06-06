import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "../../src/auth/token";

const SECRET = "test-secret";

describe("session token", () => {
  it("verifies a freshly signed token and returns its payload", () => {
    const now = 1_000;
    const token = createSessionToken(SECRET, { ttlMs: 5_000, now });

    const payload = verifySessionToken(token, SECRET, { now });

    expect(payload).toMatchObject({ iat: 1_000, exp: 6_000 });
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken(SECRET, { ttlMs: 5_000, now: 1_000 });

    expect(verifySessionToken(token, "other-secret", { now: 1_000 })).toBeNull();
  });

  it("rejects a token whose payload has been tampered with", () => {
    const token = createSessionToken(SECRET, { ttlMs: 5_000, now: 1_000 });
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ iat: 1_000, exp: 9_999_999 }),
    ).toString("base64url");
    const forged = `${forgedBody}.${sig}`;

    expect(verifySessionToken(forged, SECRET, { now: 1_000 })).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(SECRET, { ttlMs: 5_000, now: 1_000 });

    expect(verifySessionToken(token, SECRET, { now: 6_001 })).toBeNull();
  });
});
