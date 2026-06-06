import { createSignal, Show } from "solid-js";

export interface NoteTitleProps {
  title: string;
  onRename: (title: string) => void;
}

/** The Note title; click to edit it into a custom title (Enter saves, Escape cancels). */
export function NoteTitle(props: NoteTitleProps) {
  const [editing, setEditing] = createSignal(false);
  let input: HTMLInputElement | undefined;

  const start = () => {
    setEditing(true);
    queueMicrotask(() => input?.focus());
  };

  const commit = () => {
    if (!editing()) return;
    const value = input?.value.trim() ?? "";
    setEditing(false);
    if (value && value !== props.title) props.onRename(value);
  };

  return (
    <Show
      when={editing()}
      fallback={
        <h2 class="note-title" onClick={start}>
          {props.title}
        </h2>
      }
    >
      <input
        ref={input}
        class="note-title"
        aria-label="Note title"
        value={props.title}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
      />
    </Show>
  );
}
