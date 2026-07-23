import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Note, NoteSummary } from '@notes/shared';
import { ActionBar } from '../action-bar/ActionBar';
import { NotePickerModal } from '../note-picker/NotePickerModal';
import { ServiceModal } from '../service-modal/ServiceModal';
import { listNotes, getNote, deleteNote } from '../../api/notes-api';
import { useTheme } from '../../hooks/useTheme';
import styles from './NotePlatform.module.css';
import { TemplateIcon } from '../common/icons/Icons';

const draftNote = (): Note => ({
  id: 'new',
  title: '',
  body: '# ',
  createdAt: 0,
  updatedAt: 0,
});

const NoteEditor = lazy(() =>
  import('../note-editor/NoteEditor').then((m) => ({ default: m.NoteEditor })),
);

export const NotePlatform = ({ onLogout }: { onLogout?: () => void }) => {
  const { id } = useParams();
  const location = useLocation();
  // /n/new is static — useParams() returns {} for it. Fall back to pathname.
  const selectedId = location.pathname === '/n/new' ? 'new' : (id ?? null);
  const navigate = useNavigate();
  const onSelect = (id: string | null) => navigate(id ? `/n/${id}` : '/');

  const { theme } = useTheme();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [current, setCurrent] = useState<Note | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  useEffect(() => {
    listNotes().then(setNotes);
  }, []);

  useEffect(() => {
    if (pickerOpen) {
      listNotes().then(setNotes);
    }
  }, [pickerOpen]);

  useEffect(() => {
    if (selectedId && selectedId !== 'new') {
      getNote(selectedId).then(setCurrent);
    } else if (selectedId === 'new') {
      setCurrent(draftNote());
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

  const handleNew = () => {
    navigate('/n/new');
  };

  const handleSave = useCallback(
    (saved: Note) => {
      setCurrent(saved);
      setNotes((prev) => [
        { id: saved.id, title: saved.title, updatedAt: saved.updatedAt },
        ...prev.filter((n) => n.id !== 'new'),
      ]);
      navigate(`/n/${saved.id}`);
    },
    [navigate],
  );

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) onSelect(null);
  };

  return (
    <div className={styles.app} data-theme={theme}>
      <ActionBar
        onNew={handleNew}
        onOpenPicker={() => setPickerOpen(true)}
        onOpenService={() => setServiceOpen(true)}
        onLogout={onLogout}
      />
      <NotePickerModal
        open={pickerOpen}
        notes={notes}
        selectedId={selectedId}
        onSelect={onSelect}
        onClose={() => setPickerOpen(false)}
        onDelete={handleDelete}
      />
      <ServiceModal open={serviceOpen} onClose={() => setServiceOpen(false)} />
      {selectedId && current ? (
        <Suspense fallback={<p>Loading editor…</p>}>
          <NoteEditor key={current.id} note={current} onCreate={handleSave} />
        </Suspense>
      ) : (
        <div className={styles.templateWrapper}>
          <div className={styles.iconContainer}>
            <TemplateIcon />
          </div>
        </div>
      )}
    </div>
  );
};
