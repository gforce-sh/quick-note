import { randomUUID } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import type { Db } from "../db";
import { notes } from "../db/schema";
import { deriveTitle } from "./title";
import type { Note, NoteSummary } from "@notes/shared";

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

/** List Note summaries, most-recently-updated first. */
export function listNotes(db: Db): NoteSummary[] {
  return db
    .select({ id: notes.id, title: notes.title, updatedAt: notes.updatedAt })
    .from(notes)
    .orderBy(desc(notes.updatedAt))
    .all();
}

/** Read a full Note by id, or null if it does not exist. */
export function getNote(db: Db, id: string): Note | null {
  return db.select().from(notes).where(eq(notes.id, id)).get() ?? null;
}

/** Update the Body, re-deriving the Title unless it is custom. */
export function updateNoteBody(
  db: Db,
  id: string,
  body: string,
  opts: { now: number },
): Note | null {
  const existing = getNote(db, id);
  if (!existing) return null;
  const derived = existing.titleIsCustom ? null : deriveTitle(body);
  db.update(notes)
    .set({ body, title: derived ?? existing.title, updatedAt: opts.now })
    .where(eq(notes.id, id))
    .run();
  return getNote(db, id);
}

/** Set a custom Title; subsequent Body edits will not overwrite it. */
export function renameNote(
  db: Db,
  id: string,
  title: string,
  opts: { now: number },
): Note | null {
  const existing = getNote(db, id);
  if (!existing) return null;
  db.update(notes)
    .set({ title, titleIsCustom: true, updatedAt: opts.now })
    .where(eq(notes.id, id))
    .run();
  return getNote(db, id);
}
