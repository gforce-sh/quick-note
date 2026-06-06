import { randomUUID } from "node:crypto";
import type { Db } from "../db";
import { notes } from "../db/schema";
import type { Note } from "@notes/shared";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Placeholder title for a brand-new Note, e.g. "New note 2026-06-06 14:32" (UTC). */
function defaultTitle(now: number): string {
  const d = new Date(now);
  return `New note ${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Create an empty Note with a default title. */
export function createNote(db: Db, opts: { now: number }): Note {
  const note: Note = {
    id: randomUUID(),
    title: defaultTitle(opts.now),
    body: "",
    titleIsCustom: false,
    createdAt: opts.now,
    updatedAt: opts.now,
  };
  db.insert(notes).values(note).run();
  return note;
}
