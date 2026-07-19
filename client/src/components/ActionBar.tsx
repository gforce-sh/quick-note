import {
  Apps as AppsIcon,
  NewNote as NewNoteIcon,
  Logout as LogoutIcon,
  Rows as RowsIcon,
} from './common/icons/Icons';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  onNew: () => void;
  onOpenPicker: () => void;
  onOpenService: () => void;
  onLogout?: () => void;
}

export const ActionBar = ({
  onNew,
  onOpenPicker,
  onOpenService,
  onLogout,
}: ActionBarProps) => (
  <div className={styles.actionBar} role="toolbar" aria-label="Actions">
    <button type="button" aria-label="New note" onClick={onNew}>
      <NewNoteIcon />
    </button>
    <button type="button" aria-label="Notes" onClick={onOpenPicker}>
      <RowsIcon />
    </button>
    <button type="button" aria-label="Services" onClick={onOpenService}>
      <AppsIcon />
    </button>
    <button type="button" aria-label="Log out" onClick={() => onLogout?.()}>
      <LogoutIcon />
    </button>
  </div>
);
