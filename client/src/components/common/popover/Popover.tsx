import { Command } from 'cmdk';
import styles from './Popover.module.css';
import clsx from 'clsx';

export interface CmdKProps {
  onClose?: () => void;
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Popover = ({
  onClose,
  open = false,
  children,
  className,
}: CmdKProps) => {
  if (!open) return null;
  return (
    <div
      className={clsx(styles.backdrop, className)}
      onClick={() => onClose?.()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-label="Select note"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose?.();
            }
          }}
        >
          {children}
        </Command>
      </div>
    </div>
  );
};
