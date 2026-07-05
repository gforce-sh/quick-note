import { useState } from 'react';
import type { Theme } from 'md-live-editor/react';

const STORAGE_KEY = 'qn-theme';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'light',
  );

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });

  return { theme, toggleTheme };
};
