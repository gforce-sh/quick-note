import { useState } from 'react';
import { Command } from 'cmdk';
import type { NoteSummary } from '@notes/shared';
import styles from './NotePickerModal.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatNoteDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = String(d.getFullYear()).slice(2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hh}:${mm}`;
}

export interface NotePickerModalProps {
  notes: NoteSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const NotePickerModal = ({
  notes,
  selectedId,
  onSelect,
  onClose,
  onDelete,
}: NotePickerModalProps) => {
  const [armedId, setArmedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (armedId === id) {
      setArmedId(null);
      onDelete(id);
    } else {
      setArmedId(id);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-label="Select note"
        onClick={(e) => e.stopPropagation()}
      >
        <Command onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
          <Command.Input placeholder="Search notes…" autoFocus />
          <Command.List>
            <Command.Empty>No notes found.</Command.Empty>
            {notes.map((note) => (
              <Command.Item
                key={note.id}
                value={note.title}
                onSelect={() => handleSelect(note.id)}
                data-current={selectedId === note.id || undefined}
              >
                <span className={styles.title}>{note.title}</span>
                <span className={styles.date}>{formatNoteDate(note.updatedAt)}</span>
                <button
                  type="button"
                  aria-label={`Delete ${note.title}`}
                  onClick={(e) => handleDelete(e, note.id)}
                >
                  {armedId === note.id ? 'Confirm?' : 'Delete'}
                </button>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
