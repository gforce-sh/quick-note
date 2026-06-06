import { describe, it, expect } from "vitest";
import { createDb } from "../../src/db";
import { setPasscode, getAuth } from "../../src/auth/auth-repo";
import { verifyPasscode } from "../../src/auth/passcode";

describe("setPasscode", () => {
  it("stores a hash that verifies against the chosen passcode", async () => {
    const db = createDb(":memory:");

    await setPasscode(db, "1234");

    const auth = getAuth(db);
    expect(auth.passcodeHash).not.toBeNull();
    await expect(verifyPasscode(auth.passcodeHash!, "1234")).resolves.toBe(true);
  });
});
