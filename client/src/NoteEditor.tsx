import { useState, useRef, useEffect } from 'react';
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
  type SaveStatus,
  type Theme,
} from 'md-live-editor/react';
import type { Note } from '@notes/shared';
import { updateNoteBody } from './notes-api';
import { PALETTE } from './theme';

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
    <div className="note-editor">
      <div className="note-editor-status" role="status" aria-live="polite">
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
