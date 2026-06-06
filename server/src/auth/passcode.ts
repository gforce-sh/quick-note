import { hash, verify } from "@node-rs/argon2";

/** Hash a Passcode with argon2id for storage in the auth row. */
export function hashPasscode(passcode: string): Promise<string> {
  return hash(passcode);
}

/** Check a candidate Passcode against a stored argon2id hash. */
export function verifyPasscode(
  storedHash: string,
  passcode: string,
): Promise<boolean> {
  return verify(storedHash, passcode);
}
