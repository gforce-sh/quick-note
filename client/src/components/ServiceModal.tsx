import { Popover } from './common/popover/Popover';
import { Command } from 'cmdk';
import styles from './ServiceModal.module.css';
import { useTheme } from '../hooks/useTheme';
import {
  LightDark as LightDarkIcon,
  Upload as UploadIcon,
} from './icons/Icons';

export const ServiceModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { toggleTheme } = useTheme();
  return (
    <Popover open={open} onClose={onClose} className={styles.serviceModal}>
      <Command.Group heading="Settings">
        <Command.Item aria-label="Toggle theme" onSelect={toggleTheme}>
          <div className={styles.iconWrapper}>
            <LightDarkIcon size={36} />
          </div>
        </Command.Item>
        <Command.Item aria-label="Backup" onSelect={() => {}}>
          <div className={styles.iconWrapper}>
            <UploadIcon size={36} />
          </div>
        </Command.Item>
      </Command.Group>
    </Popover>
  );
};
