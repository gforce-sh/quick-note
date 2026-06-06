import { createSignal, For, onCleanup, onMount } from "solid-js";
import type { NoteSummary } from "@notes/shared";

export interface SidebarProps {
  notes: NoteSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar(props: SidebarProps) {
  // Which note's delete CTA is "armed" (awaiting a confirming second click).
  const [armedId, setArmedId] = createSignal<string | null>(null);

  // Clicking anywhere else cancels an armed delete (no dialogs). Listen on
  // window: Solid delegates click to document, so the armed button's
  // stopPropagation (below) keeps its own click from reaching here, while
  // every other click still bubbles up and cancels.
  const cancel = () => setArmedId(null);
  onMount(() => window.addEventListener("click", cancel));
  onCleanup(() => window.removeEventListener("click", cancel));

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation(); // don't let the document handler cancel our own click
    if (armedId() === id) {
      setArmedId(null);
      props.onDelete(id);
    } else {
      setArmedId(id);
    }
  };

  return (
    <nav class="sidebar" aria-label="Notes">
      <button type="button" onClick={() => props.onNew()}>
        New note
      </button>
      <ul>
        <For each={props.notes}>
          {(note) => (
            <li>
              <button
                type="button"
                aria-current={props.selectedId === note.id}
                onClick={() => props.onSelect(note.id)}
              >
                {note.title}
              </button>
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
