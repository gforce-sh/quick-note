import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * Single-row table (id is always 1) holding authentication state:
 * the Passcode hash and the Lockout counters.
 */
export const auth = sqliteTable("auth", {
  id: integer("id").primaryKey(),
  passcodeHash: text("passcode_hash"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
});
