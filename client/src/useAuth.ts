import { useEffect, useState } from 'react';
import { login, getSession, logout } from './api';
import type { LoginResult } from './api';

export function useAuth() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    getSession().then(setAuthed);
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  const handleLogin = async (passcode: string): Promise<LoginResult> => {
    const result = await login(passcode);
    if (result.ok) {
      setAuthed(true);
    }
    return result;
  };

  return { handleLogin, handleLogout, authed, setAuthed };
}
