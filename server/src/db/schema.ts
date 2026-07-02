import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, check } from "drizzle-orm/sqlite-core";

/** o = owner, m = member, g = guest, p = public. */
export type Role = "o" | "m" | "g" | "p";

export const auth = sqliteTable(
  "auth",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").$type<Role>().notNull().default("g"),
    passcodeHash: text("passcode_hash"),
  },
  (t) => [check("auth_role_valid", sql`${t.role} IN ('o', 'm', 'g', 'p')`)],
);

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => auth.id),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
