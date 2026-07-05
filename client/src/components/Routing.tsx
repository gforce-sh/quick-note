import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotePlatform } from './NotePlatform';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from './LoginScreen';

export const Routing = () => {
  const { handleLogin, handleLogout, authed } = useAuth();

  if (authed === null) return <p>Authenticating...</p>;

  return (
    <BrowserRouter basename="/quick-note">
      <Routes>
        {authed ? (
          <>
            <Route
              path="/n/:id"
              element={<NotePlatform onLogout={handleLogout} />}
            />
            <Route
              path="/n"
              element={<NotePlatform onLogout={handleLogout} />}
            />
            <Route path="*" element={<Navigate to="/n" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={<LoginScreen onSubmit={handleLogin} />}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};
