import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Note, NoteSummary } from '@notes/shared';
import { ActionBar } from './ActionBar';
import { NotePickerModal } from './NotePickerModal';
import { useNotesApi } from './useNotesApi';

const NoteEditor = lazy(() =>
  import('./NoteEditor').then((m) => ({ default: m.NoteEditor })),
);

export const NotePlatform = ({ onLogout }: { onLogout?: () => void }) => {
  const { id } = useParams();
  const selectedId = id ?? null;
  const navigate = useNavigate();
  const onSelect = (id: string | null) => navigate(id ? `/n/${id}` : '/');

  const api = useNotesApi();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [current, setCurrent] = useState<Note | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  useEffect(() => {
    let lastShift = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      const now = Date.now();
      if (now - lastShift < 300) {
        setPickerOpen(true);
        lastShift = 0;
      } else {
        lastShift = now;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
      <ActionBar
        onNew={handleNew}
        onOpenPicker={() => setPickerOpen(true)}
        onLogout={onLogout}
      />
      {pickerOpen && (
        <NotePickerModal
          notes={notes}
          selectedId={selectedId}
          onSelect={onSelect}
          onClose={() => setPickerOpen(false)}
          onDelete={handleDelete}
        />
      )}
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
