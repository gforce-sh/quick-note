import { useState } from 'react';
import { MarkdownEditor, type SaveStatus } from 'md-live-editor/react';
import type { Note } from '@notes/shared';
import { updateNoteBody } from './notes-api';

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: "Couldn't save — retrying",
};

export const NoteEditor = ({ note }: { note: Note }) => {
  const [status, setStatus] = useState<SaveStatus>('idle');

  return (
    <div className="note-editor">
      <div className="note-editor-status" role="status" aria-live="polite">
        {STATUS_LABEL[status]}
      </div>
      <MarkdownEditor
        initialContent={note.body}
        onSave={(content) => updateNoteBody(note.id, content).then(() => {})}
        onSaveStatus={setStatus}
        theme="light"
      />
    </div>
  );
};
