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

/** A markdown Note: title, body, timestamps, and a custom-title flag. */
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  titleIsCustom: integer("title_is_custom", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
