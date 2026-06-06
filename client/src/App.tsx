import { createSignal, onMount, Switch, Match } from "solid-js";
import { LoginScreen } from "./LoginScreen";
import { login as apiLogin, getSession } from "./api";
import type { LoginResult } from "./api";

export interface AppProps {
  checkSession?: () => Promise<boolean>;
  login?: (passcode: string) => Promise<LoginResult>;
}

export function App(props: AppProps) {
  const checkSession = props.checkSession ?? getSession;
  const login = props.login ?? apiLogin;

  // null = still checking the session
  const [authed, setAuthed] = createSignal<boolean | null>(null);

  onMount(async () => {
    setAuthed(await checkSession());
  });

  return (
    <Switch>
      <Match when={authed() === null}>
        <p>Loading…</p>
      </Match>
      <Match when={authed() === true}>
        <main>
          <h1>Notes</h1>
          {/* Notes UI arrives in Slice 4 */}
        </main>
      </Match>
      <Match when={authed() === false}>
        <LoginScreen onSubmit={login} onSuccess={() => setAuthed(true)} />
      </Match>
    </Switch>
  );
}
