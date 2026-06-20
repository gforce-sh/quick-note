import { useState, useEffect } from 'react';
import type { NoteSummary } from '@notes/shared';

export interface SidebarProps {
  notes: NoteSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onLogout?: () => void;
}

export const Sidebar = ({
  notes,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  onLogout,
}: SidebarProps) => {
  // Which note's delete CTA is "armed" (awaiting a confirming second click).
  const [armedId, setArmedId] = useState<string | null>(null);

  // Clicking anywhere else cancels an armed delete (no dialogs). The armed
  // button's stopPropagation keeps its own click from reaching here.
  useEffect(() => {
    const cancel = () => setArmedId(null);
    window.addEventListener('click', cancel);
    return () => window.removeEventListener('click', cancel);
  }, []);

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
    <nav className="sidebar" aria-label="Notes">
      <div className="sidebar-actions">
        <button type="button" onClick={() => onNew()}>
          New note
        </button>
        <button type="button" onClick={() => onLogout?.()}>
          Log out
        </button>
      </div>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              aria-current={selectedId === note.id}
              onClick={() => onSelect(note.id)}
            >
              {note.title}
            </button>

            <button
              type="button"
              aria-label={`Delete ${note.title}`}
              onClick={(e) => handleDelete(e, note.id)}
            >
              {armedId === note.id ? 'Confirm?' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
