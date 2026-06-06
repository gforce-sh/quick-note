import { createSignal, onMount, Switch, Match } from "solid-js";
import type { JSX } from "solid-js";
import { Router, Route, useParams, useNavigate } from "@solidjs/router";
import { LoginScreen } from "./LoginScreen";
import { NotesApp, type NotesApi } from "./NotesApp";
import { login as apiLogin, getSession } from "./api";
import type { LoginResult } from "./api";
import type { Note } from "@notes/shared";

export interface AppProps {
  checkSession?: () => Promise<boolean>;
  login?: (passcode: string) => Promise<LoginResult>;
  notesApi?: NotesApi;
  renderNote?: (note: Note) => JSX.Element;
}

export function App(props: AppProps) {
  const checkSession = props.checkSession ?? getSession;
  const login = props.login ?? apiLogin;

  // null = still checking the session
  const [authed, setAuthed] = createSignal<boolean | null>(null);
  onMount(async () => setAuthed(await checkSession()));

  // The selected note lives in the URL (/n/:id) for deep-linking.
  const RoutedNotes = () => {
    const params = useParams();
    const navigate = useNavigate();
    return (
      <NotesApp
        api={props.notesApi}
        renderNote={props.renderNote}
        selectedId={params.id ?? null}
        onSelect={(id) => navigate(id ? `/n/${id}` : "/")}
      />
    );
  };

  return (
    <Switch>
      <Match when={authed() === null}>
        <p>Loading…</p>
      </Match>
      <Match when={authed() === true}>
        <Router>
          <Route path="/n/:id" component={RoutedNotes} />
          <Route path="*" component={RoutedNotes} />
        </Router>
      </Match>
      <Match when={authed() === false}>
        <LoginScreen onSubmit={login} onSuccess={() => setAuthed(true)} />
      </Match>
    </Switch>
  );
}
