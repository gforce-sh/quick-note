import { createSignal, onCleanup } from "solid-js";
import type { Note } from "@notes/shared";
import { SaveStatus } from "./SaveStatus";
import { BodyEditor } from "./BodyEditor";
import { createAutosave, type SaveStatus as Status } from "./autosave";
import { updateNoteBody } from "./notes-api";

/**
 * Editing surface for one Note: the CodeMirror body with Live Preview and
 * a debounced autosave with status. The title is not shown above the note
 * — the body's first heading serves as the title (and it's in the sidebar).
 */
export function NoteEditor(props: { note: Note }) {
  const [status, setStatus] = createSignal<Status>("idle");

  const autosave = createAutosave(
    (body) => updateNoteBody(props.note.id, body).then(() => {}),
    { debounceMs: 2000, retryMs: 5000 },
  );
  const unsubscribe = autosave.subscribe(setStatus);
  onCleanup(() => {
    unsubscribe();
    autosave.flush(); // save any pending edit before we go (e.g. note switch)
    autosave.dispose();
  });

  return (
    <article aria-label="Note" class="note-editor">
      <SaveStatus status={status()} />
      <BodyEditor
        doc={props.note.body}
        onChange={(body) => autosave.schedule(body)}
      />
    </article>
  );
}
