import { createSignal, onCleanup } from "solid-js";
import type { Note } from "@notes/shared";
import { NoteTitle } from "./NoteTitle";
import { SaveStatus } from "./SaveStatus";
import { BodyEditor } from "./BodyEditor";
import { createAutosave, type SaveStatus as Status } from "./autosave";
import { updateNoteBody, renameNote } from "./notes-api";

/**
 * Editing surface for one Note: a renameable title, the CodeMirror body
 * with Live Preview, and a debounced autosave with status. Composed from
 * tested units; the CM6 glue itself is not unit-tested.
 */
export function NoteEditor(props: { note: Note }) {
  const [status, setStatus] = createSignal<Status>("idle");
  const [title, setTitle] = createSignal(props.note.title);

  const autosave = createAutosave(
    (body) => updateNoteBody(props.note.id, body).then(() => {}),
    { debounceMs: 2000, retryMs: 5000 },
  );
  const unsubscribe = autosave.subscribe(setStatus);
  onCleanup(() => {
    unsubscribe();
    autosave.dispose();
  });

  const handleRename = (next: string) => {
    setTitle(next); // optimistic; sidebar refreshes on next load
    void renameNote(props.note.id, next).catch(() => {});
  };

  return (
    <article aria-label="Note" class="note-editor">
      <header>
        <NoteTitle title={title()} onRename={handleRename} />
        <SaveStatus status={status()} />
      </header>
      <BodyEditor
        doc={props.note.body}
        onChange={(body) => autosave.schedule(body)}
      />
    </article>
  );
}
