import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import type { Db } from "../db";
import { notes } from "../db/schema";
import { deriveTitle } from "./title";
import type { Note, NoteSummary } from "@notes/shared";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultTitle(now: number): string {
  const d = new Date(now);
  return `New note ${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const noteFields = {
  id: notes.id,
  title: notes.title,
  body: notes.body,
  titleIsCustom: notes.titleIsCustom,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

export function createNote(db: Db, opts: { now: number; userId: number }): Note {
  const note: Note = {
    id: randomUUID(),
    title: defaultTitle(opts.now),
    body: "",
    titleIsCustom: false,
    createdAt: opts.now,
    updatedAt: opts.now,
  };
  db.insert(notes).values({ ...note, userId: opts.userId }).run();
  return note;
}

export function listNotes(db: Db, userId: number): NoteSummary[] {
  return db
    .select({ id: notes.id, title: notes.title, updatedAt: notes.updatedAt })
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt))
    .all();
}

export function getNote(db: Db, userId: number, id: string): Note | null {
  return (
    db
      .select(noteFields)
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .get() ?? null
  );
}

export function updateNoteBody(
  db: Db,
  userId: number,
  id: string,
  body: string,
  opts: { now: number },
): Note | null {
  const existing = getNote(db, userId, id);
  if (!existing) return null;
  const derived = existing.titleIsCustom ? null : deriveTitle(body);
  db.update(notes)
    .set({ body, title: derived ?? existing.title, updatedAt: opts.now })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .run();
  return getNote(db, userId, id);
}

export function deleteNote(db: Db, userId: number, id: string): boolean {
  return (
    db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .run().changes > 0
  );
}

export function renameNote(
  db: Db,
  userId: number,
  id: string,
  title: string,
  opts: { now: number },
): Note | null {
  const existing = getNote(db, userId, id);
  if (!existing) return null;
  db.update(notes)
    .set({ title, titleIsCustom: true, updatedAt: opts.now })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .run();
  return getNote(db, userId, id);
}
