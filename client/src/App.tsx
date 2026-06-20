import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { LoginScreen } from './LoginScreen';
import { NotesApp } from './NotesApp';
import { useAuth } from './useAuth';

const NotePage = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <NotesApp
      onLogout={onLogout}
      selectedId={id ?? null}
      onSelect={(id) => navigate(id ? `/n/${id}` : '/')}
    />
  );
};

export const App = () => {
  const { handleLogin, handleLogout, authed } = useAuth();

  return (
    <main>
      {authed === null && <p>Loading…</p>}
      {authed === true && (
        <BrowserRouter basename="/quick-note">
          <Routes>
            <Route
              path="/n/:id"
              element={<NotePage onLogout={handleLogout} />}
            />
            <Route path="*" element={<NotePage onLogout={handleLogout} />} />
          </Routes>
        </BrowserRouter>
      )}
      {authed === false && <LoginScreen onSubmit={handleLogin} />}
    </main>
  );
};
