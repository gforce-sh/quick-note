import { useState, useEffect, lazy, Suspense } from 'react';
import type { Note } from '@notes/shared';
import { Sidebar } from './Sidebar';
import { useNotesApi } from './useNotesApi';
import type { NoteSummary } from '@notes/shared';

// Code-split the CM6 editor so login/sidebar load without it.
const NoteEditor = lazy(() =>
  import('./NoteEditor').then((m) => ({ default: m.NoteEditor })),
);

export interface NotesAppProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLogout?: () => void;
}

export const NotesApp = ({ selectedId, onSelect, onLogout }: NotesAppProps) => {
  const api = useNotesApi();

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
      {selectedId && current ? (
        <Suspense fallback={<p>Loading editor…</p>}>
          <NoteEditor note={current} />
        </Suspense>
      ) : (
        <p>
          {notes.length === 0
            ? 'No notes yet. Create your first note.'
            : 'Select a note.'}
        </p>
      )}
    </div>
  );
};
