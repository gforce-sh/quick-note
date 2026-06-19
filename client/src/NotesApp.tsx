import { useState, useEffect, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { Note, NoteSummary } from "@notes/shared";
import { Sidebar } from "./Sidebar";
import {
  listNotes,
  getNote,
  createNote,
  deleteNote,
  renameNote,
} from "./notes-api";

// Code-split the CM6 editor so login/sidebar load without it.
const NoteEditor = lazy(() =>
  import("./NoteEditor").then((m) => ({ default: m.NoteEditor })),
);

export interface NotesApi {
  list: () => Promise<NoteSummary[]>;
  get: (id: string) => Promise<Note | null>;
  create: () => Promise<Note>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<Note>;
}

const defaultApi: NotesApi = {
  list: listNotes,
  get: getNote,
  create: createNote,
  remove: deleteNote,
  rename: renameNote,
};

export type RenderNote = (note: Note) => ReactNode;

export interface NotesAppProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  api?: NotesApi;
  onLogout?: () => void;
  /** How to render the selected note (defaults to the CM6 NoteEditor). */
  renderNote?: RenderNote;
}

export function NotesApp(props: NotesAppProps) {
  const { selectedId, onSelect, onLogout } = props;
  const api = props.api ?? defaultApi;
  const renderNote: RenderNote =
    props.renderNote ?? ((note) => <NoteEditor note={note} />);

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [current, setCurrent] = useState<Note | null | undefined>(undefined);

  useEffect(() => {
    api.list().then(setNotes);
  }, []);

  useEffect(() => {
    if (selectedId) {
      setCurrent(undefined);
      api.get(selectedId).then(setCurrent);
    } else {
      setCurrent(null);
    }
  }, [selectedId]);

  const handleRename = (id: string, title: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n))); // optimistic
    void api.rename(id, title).catch(() => {});
  };

  const handleNew = async () => {
    const created = await api.create();
    setNotes((prev) => [
      { id: created.id, title: created.title, updatedAt: created.updatedAt },
      ...prev,
    ]);
    onSelect(created.id);
  };

  const handleDelete = async (id: string) => {
    await api.remove(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) onSelect(null);
  };

  return (
    <div className="app">
      <Sidebar
        notes={notes}
        selectedId={selectedId}
        onSelect={onSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
        onLogout={onLogout}
      />
      <main>
        {selectedId && current ? (
          <Suspense fallback={<p>Loading editor…</p>}>
            {renderNote(current)}
          </Suspense>
        ) : (
          <p>
            {notes.length === 0
              ? "No notes yet. Create your first note."
              : "Select a note."}
          </p>
        )}
      </main>
    </div>
  );
}
