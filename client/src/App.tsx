import { createSignal, onMount, Switch, Match } from "solid-js";
import { Router, Route, useParams, useNavigate } from "@solidjs/router";
import { LoginScreen } from "./LoginScreen";
import { NotesApp, type NotesApi, type RenderNote } from "./NotesApp";
import { login as apiLogin, logout as apiLogout, getSession } from "./api";
import type { LoginResult } from "./api";

export interface AppProps {
  checkSession?: () => Promise<boolean>;
  login?: (passcode: string) => Promise<LoginResult>;
  logout?: () => Promise<void>;
  notesApi?: NotesApi;
  renderNote?: RenderNote;
}

export function App(props: AppProps) {
  const checkSession = props.checkSession ?? getSession;
  const login = props.login ?? apiLogin;
  const logout = props.logout ?? apiLogout;

  // null = still checking the session
  const [authed, setAuthed] = createSignal<boolean | null>(null);
  onMount(async () => setAuthed(await checkSession()));

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  // The selected note lives in the URL (/n/:id) for deep-linking.
  const RoutedNotes = () => {
    const params = useParams();
    const navigate = useNavigate();
    return (
      <NotesApp
        api={props.notesApi}
        renderNote={props.renderNote}
        onLogout={handleLogout}
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
