import type { Theme } from 'md-live-editor/react';
import {
  Apps as AppsIcon,
  NewNote as NewNoteIcon,
  LightDark as LightDarkIcon,
  Logout as LogoutIcon,
} from './icons/Icons';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  onNew: () => void;
  onOpenPicker: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout?: () => void;
}

export const ActionBar = ({
  onNew,
  onOpenPicker,
  theme,
  onToggleTheme,
  onLogout,
}: ActionBarProps) => (
  <div className={styles.actionBar} role="toolbar" aria-label="Actions">
    <button type="button" aria-label="New note" onClick={onNew}>
      <NewNoteIcon />
    </button>
    <button type="button" aria-label="Notes" onClick={onOpenPicker}>
      <AppsIcon />
    </button>
    <button type="button" aria-label={theme === 'light' ? 'Dark' : 'Light'} onClick={onToggleTheme}>
      <LightDarkIcon />
    </button>
    <button type="button" aria-label="Log out" onClick={() => onLogout?.()}>
      <LogoutIcon />
    </button>
  </div>
);
