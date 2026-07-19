import { useState, useRef, useEffect } from 'react';
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
  type SaveStatus,
  type Theme,
} from 'md-live-editor/react';
import type { Note } from '@notes/shared';
import { updateNoteBody, createNote } from '../api/notes-api';
import { PALETTE } from '../theme';
import styles from './NoteEditor.module.css';
import { useTheme } from '../hooks/useTheme';

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: "Couldn't save — retrying",
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-GB', { hour12: false });

export const NoteEditor = ({
  note,
  onCreate,
}: {
  note: Note;
  /** Called once when the draft is persisted to the server. */
  onCreate?: (note: Note) => void;
}) => {
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const [isDraft, setIsDraft] = useState(note.id === 'new');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    editorRef.current?.focus();
    if (isDraft) {
      // Place cursor after the initial '# ' heading marker.
      editorRef.current?.setCursor(note.body.length);
    }
  }, []);

  const statusLabel =
    status === 'saved' && savedAt
      ? `Saved on ${formatTime(savedAt)}`
      : STATUS_LABEL[status];

  const handleSave = (body: string) => {
    if (isDraft) {
      return createNote({ body }).then((saved) => {
        setIsDraft(false);
        onCreate?.(saved);
        return saved;
      });
    }
    return updateNoteBody(note.id, body).then(() => note);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.status} role="status" aria-live="polite">
        {statusLabel}
      </div>
      <MarkdownEditor
        ref={editorRef}
        initialContent={note.body}
        onSave={(content) => handleSave(content).then(() => {})}
        onSaveStatus={(s) => {
          setStatus(s);
          if (s === 'saved') setSavedAt(new Date());
        }}
        theme={theme as Theme}
        bg={PALETTE}
      />
    </div>
  );
};
