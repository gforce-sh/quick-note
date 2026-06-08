import { MarkdownEditor } from "md-live-editor";
import type { Note } from "@notes/shared";
import { updateNoteBody } from "./notes-api";

export function NoteEditor(props: { note: Note }) {
  return (
    <MarkdownEditor
      doc={props.note.body}
      onSave={(body) => updateNoteBody(props.note.id, body).then(() => {})}
    />
  );
}
