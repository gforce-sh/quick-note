import { createSignal } from "solid-js";
import { MarkdownEditor, type SaveStatus } from "md-live-editor/solid";
import type { Note } from "@notes/shared";
import { updateNoteBody } from "./notes-api";

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retrying",
};

export function NoteEditor(props: { note: Note }) {
  const [status, setStatus] = createSignal<SaveStatus>("idle");

  return (
    <div class="note-editor">
      <div class="note-editor-status" role="status" aria-live="polite">
        {STATUS_LABEL[status()]}
      </div>
      <MarkdownEditor
        initialContent={props.note.body}
        onSave={(content) => updateNoteBody(props.note.id, content).then(() => {})}
        onSaveStatus={setStatus}
      />
    </div>
  );
}
