import { MarkdownEditor } from "md-live-editor/solid";
import type { Note } from "@notes/shared";
import { updateNoteBody } from "./notes-api";

export function NoteEditor(props: { note: Note }) {
  return (
    <MarkdownEditor
      initialContent={props.note.body}
      onSave={(content) => updateNoteBody(props.note.id, content).then(() => {})}
    />
  );
}
