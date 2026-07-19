import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import type { NoteSummary } from '@notes/shared';
import styles from './NotePickerModal.module.css';
import { Popover } from './common/popover/Popover';

// prettier-ignore
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
  open: boolean;
}

export const NotePickerModal = ({
  notes,
  selectedId,
  onSelect,
  onClose,
  onDelete,
  open,
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

  useEffect(() => {
    if (!open) {
      setArmedId(null);
    }
  }, [open]);

  return (
    <Popover onClose={onClose} open={open}>
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
            <span className={styles.date}>
              {formatNoteDate(note.updatedAt)}
            </span>
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
    </Popover>
  );
};
