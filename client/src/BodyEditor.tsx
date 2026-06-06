import { onCleanup, onMount } from "solid-js";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { livePreview } from "./live-preview";

/**
 * Thin Solid wrapper around a CodeMirror 6 EditorView with inline Live
 * Preview. Mounts once per Note (NotesApp keys it by note), reports body
 * changes via onChange. CM6 owns the editing surface; not unit-tested.
 */
export function BodyEditor(props: {
  doc: string;
  onChange: (body: string) => void;
}) {
  let host: HTMLDivElement | undefined;
  let view: EditorView | undefined;

  onMount(() => {
    view = new EditorView({
      parent: host!,
      state: EditorState.create({
        doc: props.doc,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          livePreview,
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) props.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
  });

  onCleanup(() => view?.destroy());

  return <div class="body-editor" ref={host} />;
}
