import {
  listNotes,
  getNote,
  createNote,
  deleteNote,
  renameNote,
} from './notes-api';
import type { Note, NoteSummary } from '@notes/shared';

export interface NotesApi {
  list: () => Promise<NoteSummary[]>;
  get: (id: string) => Promise<Note | null>;
  create: () => Promise<Note>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<Note>;
}

export const useNotesApi = (): NotesApi => {
  return {
    list: listNotes,
    get: getNote,
    create: createNote,
    remove: deleteNote,
    rename: renameNote,
  };
};
