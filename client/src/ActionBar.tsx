import type { Theme } from 'md-live-editor/react';
import {
  Apps as AppsIcon,
  NewNote as NewNoteIcon,
  LightDark as LightDarkIcon,
  Logout as LogoutIcon,
} from './icons/Icons';

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
  <div className="action-bar" role="toolbar" aria-label="Actions">
    <button type="button" onClick={onNew}>
      <NewNoteIcon />
    </button>
    <button type="button" onClick={onOpenPicker}>
      <AppsIcon />
    </button>
    <button type="button" onClick={onToggleTheme}>
      <LightDarkIcon />
    </button>
    <button type="button" onClick={() => onLogout?.()}>
      <LogoutIcon />
    </button>
  </div>
);
