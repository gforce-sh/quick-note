import type { Note, NoteSummary } from "@notes/shared";

/** List Note summaries, most-recently-updated first. */
export async function listNotes(): Promise<NoteSummary[]> {
  const res = await fetch("/api/v1/notes");
  if (!res.ok) throw new Error(`list notes failed: ${res.status}`);
  return res.json();
}

/** Read a full Note, or null if it no longer exists. */
export async function getNote(id: string): Promise<Note | null> {
  const res = await fetch(`/api/v1/notes/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get note failed: ${res.status}`);
  return res.json();
}

/** Create a new, empty Note. */
export async function createNote(): Promise<Note> {
  const res = await fetch("/api/v1/notes", { method: "POST" });
  if (!res.ok) throw new Error(`create note failed: ${res.status}`);
  return res.json();
}

/** Delete a Note. */
export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/v1/notes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete note failed: ${res.status}`);
}

async function patchNote(id: string, patch: object): Promise<Note> {
  const res = await fetch(`/api/v1/notes/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update note failed: ${res.status}`);
  return res.json();
}

/** Update the Body (the title re-derives server-side unless custom). */
export function updateNoteBody(id: string, body: string): Promise<Note> {
  return patchNote(id, { body });
}

/** Set a custom Title. */
export function renameNote(id: string, title: string): Promise<Note> {
  return patchNote(id, { title });
}
