import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
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
  // Which note's delete CTA is "armed" (awaiting a confirming second click).
  const [armedId, setArmedId] = createSignal<string | null>(null);
  // Which note's title is being renamed inline.
  const [editingId, setEditingId] = createSignal<string | null>(null);

  // Clicking anywhere else cancels an armed delete (no dialogs). Listen on
  // window: Solid delegates click to document, so the armed button's
  // stopPropagation keeps its own click from reaching here.
  const cancel = () => setArmedId(null);
  onMount(() => window.addEventListener("click", cancel));
  onCleanup(() => window.removeEventListener("click", cancel));

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (armedId() === id) {
      setArmedId(null);
      props.onDelete(id);
    } else {
      setArmedId(id);
    }
  };

  const commitRename = (id: string, value: string, current: string) => {
    if (editingId() !== id) return;
    setEditingId(null);
    const next = value.trim();
    if (next && next !== current) props.onRename(id, next);
  };

  return (
    <nav class="sidebar" aria-label="Notes">
      <div class="sidebar-actions">
        <button type="button" onClick={() => props.onNew()}>
          New note
        </button>
        <button type="button" onClick={() => props.onLogout?.()}>
          Log out
        </button>
      </div>
      <ul>
        <For each={props.notes}>
          {(note) => (
            <li>
              <Show
                when={editingId() === note.id}
                fallback={
                  <button
                    type="button"
                    aria-current={props.selectedId === note.id}
                    onClick={() => props.onSelect(note.id)}
                    onDblClick={() => setEditingId(note.id)}
                  >
                    {note.title}
                  </button>
                }
              >
                <input
                  class="rename-input"
                  aria-label="Rename note"
                  value={note.title}
                  ref={(el) => queueMicrotask(() => el.focus())}
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
              </Show>
              <button
                type="button"
                aria-label={`Delete ${note.title}`}
                onClick={(e) => handleDelete(e, note.id)}
              >
                {armedId() === note.id ? "Confirm?" : "Delete"}
              </button>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
