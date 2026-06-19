import { useState, useEffect } from "react";
import type { NoteSummary } from "@notes/shared";

export interface SidebarProps {
  notes: NoteSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onLogout?: () => void;
}

export function Sidebar(props: SidebarProps) {
  const { notes, selectedId, onSelect, onNew, onDelete, onRename, onLogout } = props;
  // Which note's delete CTA is "armed" (awaiting a confirming second click).
  const [armedId, setArmedId] = useState<string | null>(null);
  // Which note's title is being renamed inline.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Clicking anywhere else cancels an armed delete (no dialogs). The armed
  // button's stopPropagation keeps its own click from reaching here.
  useEffect(() => {
    const cancel = () => setArmedId(null);
    window.addEventListener("click", cancel);
    return () => window.removeEventListener("click", cancel);
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

  const commitRename = (id: string, value: string, current: string) => {
    if (editingId !== id) return;
    setEditingId(null);
    const next = value.trim();
    if (next && next !== current) onRename(id, next);
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
            {editingId === note.id ? (
              <input
                className="rename-input"
                aria-label="Rename note"
                defaultValue={note.title}
                ref={(el) => {
                  if (el) queueMicrotask(() => el.focus());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRename(note.id, e.currentTarget.value, note.title);
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                onBlur={(e) =>
                  commitRename(note.id, e.currentTarget.value, note.title)
                }
              />
            ) : (
              <button
                type="button"
                aria-current={selectedId === note.id}
                onClick={() => onSelect(note.id)}
                onDoubleClick={() => setEditingId(note.id)}
              >
                {note.title}
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete ${note.title}`}
              onClick={(e) => handleDelete(e, note.id)}
            >
              {armedId === note.id ? "Confirm?" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
