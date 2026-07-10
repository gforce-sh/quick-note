import { useState, useRef, useEffect } from 'react';
import type { LoginResult } from '../api/auth-api';
import { useTheme } from '../hooks/useTheme';
import styles from './LoginScreen.module.css';

export interface LoginScreenProps {
  onSubmit: (passcode: string) => Promise<LoginResult>;
}

const SLOTS = [0, 1, 2, 3];

export const LoginScreen = ({ onSubmit }: LoginScreenProps) => {
  const { theme } = useTheme();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const reset = () => {
    setDigits(['', '', '', '']);
    inputsRef.current[0]?.focus();
  };

  const submit = async (passcode: string) => {
    setError(null);
    const result = await onSubmit(passcode);
    if (result.ok) return;
    setError(
      result.reason === 'locked'
        ? 'Too many attempts. Try again later.'
        : 'Incorrect passcode.',
    );
    reset();
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 3) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) void submit(next.join(''));
  };

  return (
    <div className={styles.login} data-theme={theme}>
      <form aria-label="Enter passcode" onSubmit={(e) => e.preventDefault()}>
        {SLOTS.map((i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            autoComplete="off"
            aria-label={`Passcode digit ${i + 1}`}
            value={digits[i] ?? ''}
            onChange={(e) => handleChange(i, e.currentTarget.value)}
          />
        ))}
      </form>
      {error && <p role="alert">{error}</p>}
      <div className={styles.appVersion}>{import.meta.env.PACKAGE_VERSION}</div>
    </div>
  );
};
