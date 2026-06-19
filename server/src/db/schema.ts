import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const auth = sqliteTable("auth", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  passcodeHash: text("passcode_hash"),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => auth.id),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  titleIsCustom: integer("title_is_custom", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
