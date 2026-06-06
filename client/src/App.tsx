import { createSignal, onMount } from "solid-js";

export function App() {
  const [serverStatus, setServerStatus] = createSignal("…");

  onMount(async () => {
    try {
      const res = await fetch("/api/health");
      const body = (await res.json()) as { status: string };
      setServerStatus(body.status);
    } catch {
      setServerStatus("unreachable");
    }
  });

  return (
    <main>
      <h1>Notes</h1>
      <p>server: {serverStatus()}</p>
    </main>
  );
}
