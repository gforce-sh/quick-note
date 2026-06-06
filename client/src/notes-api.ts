import type { Note, NoteSummary } from "@notes/shared";

/** List Note summaries, most-recently-updated first. */
export async function listNotes(): Promise<NoteSummary[]> {
  const res = await fetch("/api/notes");
  if (!res.ok) throw new Error(`list notes failed: ${res.status}`);
  return res.json();
}

/** Read a full Note, or null if it no longer exists. */
export async function getNote(id: string): Promise<Note | null> {
  const res = await fetch(`/api/notes/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get note failed: ${res.status}`);
  return res.json();
}

/** Create a new, empty Note. */
export async function createNote(): Promise<Note> {
  const res = await fetch("/api/notes", { method: "POST" });
  if (!res.ok) throw new Error(`create note failed: ${res.status}`);
  return res.json();
}

/** Delete a Note. */
export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete note failed: ${res.status}`);
}
