import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { migrate } from "./migrate";

/**
 * Open a SQLite database (a file path, or ":memory:" for tests), apply
 * migrations, and wrap it with Drizzle for typed queries.
 */
export function createDb(path = ":memory:") {
  const sqlite = new Database(path);
  if (path !== ":memory:") sqlite.pragma("journal_mode = WAL");
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
