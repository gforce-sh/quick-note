export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface Autosave {
  /** Queue the body to be saved after the debounce window. */
  schedule(body: string): void;
  status(): SaveStatus;
  subscribe(cb: (status: SaveStatus) => void): () => void;
  dispose(): void;
}

/**
 * Debounced autosave with a status state machine. On failure it keeps the
 * latest (unsaved) body in memory and retries; success after edits-while-
 * saving triggers another save.
 */
export function createAutosave(
  save: (body: string) => Promise<void>,
  opts: { debounceMs: number; retryMs: number },
): Autosave {
  let status: SaveStatus = "idle";
  let pending: string | null = null;
  let lastSaved: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const subs = new Set<(status: SaveStatus) => void>();

  const setStatus = (s: SaveStatus) => {
    status = s;
    for (const cb of subs) cb(s);
  };

  const flush = () => {
    if (pending === null || pending === lastSaved) return;
    const body = pending;
    setStatus("saving");
    save(body)
      .then(() => {
        lastSaved = body;
        if (pending !== lastSaved) flush();
        else setStatus("saved");
      })
      .catch(() => {
        setStatus("error");
        clearTimeout(retryTimer);
        retryTimer = setTimeout(flush, opts.retryMs);
      });
  };

  return {
    schedule(body: string) {
      pending = body;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flush, opts.debounceMs);
    },
    status: () => status,
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    dispose() {
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
      subs.clear();
    },
  };
}
