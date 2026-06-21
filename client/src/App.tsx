import { LoginScreen } from './LoginScreen';
import { Routing } from './Routing';
import { useAuth } from './useAuth';

export const App = () => {
  const { handleLogin, handleLogout, authed } = useAuth();

  return (
    <main>
      {authed === null && <p>Loading…</p>}
      {authed === true && <Routing onLogout={handleLogout} />}
      {authed === false && <LoginScreen onSubmit={handleLogin} />}
    </main>
  );
};
