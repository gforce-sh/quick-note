import {
  createResource,
  createSignal,
  lazy,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import type { JSX } from "solid-js";
import type { Note, NoteSummary } from "@notes/shared";
import { Sidebar } from "./Sidebar";
import {
  listNotes,
  getNote,
  createNote,
  deleteNote,
  renameNote,
} from "./notes-api";

// Code-split the CM6 editor so login/sidebar load without it.
const NoteEditor = lazy(() =>
  import("./NoteEditor").then((m) => ({ default: m.NoteEditor })),
);

export interface NotesApi {
  list: () => Promise<NoteSummary[]>;
  get: (id: string) => Promise<Note | null>;
  create: () => Promise<Note>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<Note>;
}

const defaultApi: NotesApi = {
  list: listNotes,
  get: getNote,
  create: createNote,
  remove: deleteNote,
  rename: renameNote,
};

export type RenderNote = (note: Note) => JSX.Element;

export interface NotesAppProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  api?: NotesApi;
  onLogout?: () => void;
  /** How to render the selected note (defaults to the CM6 NoteEditor). */
  renderNote?: RenderNote;
}

export function NotesApp(props: NotesAppProps) {
  const api = props.api ?? defaultApi;
  const renderNote: RenderNote =
    props.renderNote ?? ((note) => <NoteEditor note={note} />);

  const renameInList = (id: string, title: string) =>
    setNotes(notes().map((n) => (n.id === id ? { ...n, title } : n)));

  const handleRename = (id: string, title: string) => {
    renameInList(id, title); // optimistic
    void api.rename(id, title).catch(() => {});
  };

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
        onRename={handleRename}
        onLogout={props.onLogout}
      />
      <main>
        <Show
          when={props.selectedId ? current() : undefined}
          keyed
          fallback={
            <p>
              {notes().length === 0
                ? "No notes yet. Create your first note."
                : "Select a note."}
            </p>
          }
        >
          {(note) => (
            <Suspense fallback={<p>Loading editor…</p>}>
              {renderNote(note)}
            </Suspense>
          )}
        </Show>
      </main>
    </div>
  );
}
