import { describe, it, expect } from "vitest";
import { createDb } from "../../src/db";
import { auth } from "../../src/db/schema";
import { setPasscode, findUserByPasscode } from "../../src/auth/auth-repo";

describe("setPasscode", () => {
  it("stores a hash that verifies against the chosen passcode", async () => {
    const db = createDb(":memory:");
    db.insert(auth).values({ id: 1, name: "test" }).run();

    await setPasscode(db, 1, "1234");

    const user = await findUserByPasscode(db, "1234");
    expect(user).not.toBeNull();
    expect(user!.id).toBe(1);
  });
});
