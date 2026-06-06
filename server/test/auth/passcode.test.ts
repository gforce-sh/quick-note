import { describe, it, expect } from "vitest";
import { hashPasscode, verifyPasscode } from "../../src/auth/passcode";

describe("passcode", () => {
  it("verifies a correct passcode against its hash", async () => {
    const hash = await hashPasscode("1234");

    await expect(verifyPasscode(hash, "1234")).resolves.toBe(true);
  });

  it("rejects an incorrect passcode", async () => {
    const hash = await hashPasscode("1234");

    await expect(verifyPasscode(hash, "9999")).resolves.toBe(false);
  });
});
