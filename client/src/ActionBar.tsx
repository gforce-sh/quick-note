export interface ActionBarProps {
  onNew: () => void;
  onOpenPicker: () => void;
  onLogout?: () => void;
}

export const ActionBar = ({ onNew, onOpenPicker, onLogout }: ActionBarProps) => (
  <div className="action-bar" role="toolbar" aria-label="Actions">
    <button type="button" onClick={onNew}>New note</button>
    <button type="button" onClick={onOpenPicker}>Notes</button>
    <button type="button" onClick={() => onLogout?.()}>Log out</button>
  </div>
);
