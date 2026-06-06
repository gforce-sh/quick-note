import type { SaveStatus as Status } from "./autosave";

const LABELS: Record<Status, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retrying",
};

export function SaveStatus(props: { status: Status }) {
  return (
    <span role="status" aria-live="polite">
      {LABELS[props.status]}
    </span>
  );
}
