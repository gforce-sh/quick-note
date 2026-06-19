import type { Context } from 'hono';
import type { AppDeps } from '../../app';
import {
  createNote,
  listNotes,
  getNote,
  updateNoteBody,
  renameNote,
  deleteNote,
} from '../../notes/notes-repo';

export function createNotesHandlers(deps: AppDeps) {
  const { db } = deps;
  const now = deps.now ?? Date.now;

  const create = (c: Context) => {
    const note = createNote(db, { now: now(), userId: c.get('userId') });
    return c.json(note, 201);
  };

  const list = (c: Context) => c.json(listNotes(db, c.get('userId')));

  const get = (c: Context) => {
    const note = getNote(db, c.get('userId'), c.req.param('id')!);
    if (!note) return c.json({ error: 'not found' }, 404);
    return c.json(note);
  };

  const patch = async (c: Context) => {
    const userId = c.get('userId');
    const id = c.req.param('id')!;
    const body = await c.req
      .json<{ body?: string; title?: string }>()
      .catch(() => ({}) as { body?: string; title?: string });

    if (typeof body.title === 'string') {
      const note = renameNote(db, userId, id, body.title, { now: now() });
      return note ? c.json(note) : c.json({ error: 'not found' }, 404);
    }
    if (typeof body.body === 'string') {
      const note = updateNoteBody(db, userId, id, body.body, { now: now() });
      return note ? c.json(note) : c.json({ error: 'not found' }, 404);
    }
    return c.json({ error: 'nothing to update' }, 400);
  };

  const remove = (c: Context) => {
    const removed = deleteNote(db, c.get('userId'), c.req.param('id')!);
    return removed ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
  };

  return { create, list, get, patch, remove };
}
