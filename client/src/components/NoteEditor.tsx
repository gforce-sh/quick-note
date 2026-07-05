import { useState, useRef, useEffect } from 'react';
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
  type SaveStatus,
  type Theme,
} from 'md-live-editor/react';
import type { Note } from '@notes/shared';
import { updateNoteBody } from '../api/notes-api';
import { PALETTE } from '../theme';
import styles from './NoteEditor.module.css';

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: "Couldn't save — retrying",
};

const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour12: false });

export const NoteEditor = ({ note, theme }: { note: Note; theme: Theme }) => {
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const statusLabel =
    status === 'saved' && savedAt ? `Saved on ${formatTime(savedAt)}` : STATUS_LABEL[status];

  return (
    <div className={styles.editor}>
      <div className={styles.status} role="status" aria-live="polite">
        {statusLabel}
      </div>
      <MarkdownEditor
        ref={editorRef}
        initialContent={note.body}
        onSave={(content) => updateNoteBody(note.id, content).then(() => {})}
        onSaveStatus={(s) => {
          setStatus(s);
          if (s === 'saved') setSavedAt(new Date());
        }}
        theme={theme}
        bg={PALETTE}
      />
    </div>
  );
};
