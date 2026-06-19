import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
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

interface RoutedNotesProps {
  notesApi?: NotesApi;
  renderNote?: RenderNote;
  onLogout: () => Promise<void>;
}

function RoutedNotes({ notesApi, renderNote, onLogout }: RoutedNotesProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <NotesApp
      api={notesApi}
      renderNote={renderNote}
      onLogout={onLogout}
      selectedId={id ?? null}
      onSelect={(id) => navigate(id ? `/n/${id}` : "/")}
    />
  );
}

export function App(props: AppProps) {
  const checkSession = props.checkSession ?? getSession;
  const login = props.login ?? apiLogin;
  const logout = props.logout ?? apiLogout;

  // null = still checking the session
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    checkSession().then(setAuthed);
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  return (
    <>
      {authed === null && <p>Loading…</p>}
      {authed === true && (
        <BrowserRouter>
          <Routes>
            <Route
              path="/n/:id"
              element={
                <RoutedNotes
                  notesApi={props.notesApi}
                  renderNote={props.renderNote}
                  onLogout={handleLogout}
                />
              }
            />
            <Route
              path="*"
              element={
                <RoutedNotes
                  notesApi={props.notesApi}
                  renderNote={props.renderNote}
                  onLogout={handleLogout}
                />
              }
            />
          </Routes>
        </BrowserRouter>
      )}
      {authed === false && (
        <LoginScreen onSubmit={login} onSuccess={() => setAuthed(true)} />
      )}
    </>
  );
}
