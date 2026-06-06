import { createResource, createSignal, onMount, Show } from "solid-js";
import type { Note, NoteSummary } from "@notes/shared";
import { Sidebar } from "./Sidebar";
import { listNotes, getNote, createNote, deleteNote } from "./notes-api";

export interface NotesApi {
  list: () => Promise<NoteSummary[]>;
  get: (id: string) => Promise<Note | null>;
  create: () => Promise<Note>;
  remove: (id: string) => Promise<void>;
}

const defaultApi: NotesApi = {
  list: listNotes,
  get: getNote,
  create: createNote,
  remove: deleteNote,
};

export interface NotesAppProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  api?: NotesApi;
}

export function NotesApp(props: NotesAppProps) {
  const api = props.api ?? defaultApi;

  const [notes, setNotes] = createSignal<NoteSummary[]>([]);
  onMount(async () => setNotes(await api.list()));

  const [current] = createResource(
    () => props.selectedId,
    (id) => (id ? api.get(id) : Promise.resolve(null)),
  );

  const handleNew = async () => {
    const created = await api.create();
    setNotes([
      { id: created.id, title: created.title, updatedAt: created.updatedAt },
      ...notes(),
    ]);
    props.onSelect(created.id);
  };

  const handleDelete = async (id: string) => {
    await api.remove(id);
    setNotes(notes().filter((n) => n.id !== id));
    if (props.selectedId === id) props.onSelect(null);
  };

  return (
    <div class="app">
      <Sidebar
        notes={notes()}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <main>
        <Show
          when={props.selectedId ? current() : undefined}
          fallback={
            <p>
              {notes().length === 0
                ? "No notes yet. Create your first note."
                : "Select a note."}
            </p>
          }
        >
          {(note) => (
            <article aria-label="Note">
              <h2>{note().title}</h2>
              <pre>{note().body}</pre>
            </article>
          )}
        </Show>
      </main>
    </div>
  );
}
