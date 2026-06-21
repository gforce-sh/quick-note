import type { Theme } from 'md-live-editor/react';

export interface ActionBarProps {
  onNew: () => void;
  onOpenPicker: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout?: () => void;
}

export const ActionBar = ({ onNew, onOpenPicker, theme, onToggleTheme, onLogout }: ActionBarProps) => (
  <div className="action-bar" role="toolbar" aria-label="Actions">
    <button type="button" onClick={onNew}>New note</button>
    <button type="button" onClick={onOpenPicker}>Notes</button>
    <button type="button" onClick={onToggleTheme}>{theme === 'light' ? 'Dark' : 'Light'}</button>
    <button type="button" onClick={() => onLogout?.()}>Log out</button>
  </div>
);
