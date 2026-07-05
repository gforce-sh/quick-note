export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/** A notifier that fires a text message somewhere; a no-op if not configured. */
export type Notifier = (text: string) => void;

const RETRY_DELAY_MS = 4000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendOnce(cfg: TelegramConfig, text: string): Promise<void> {
  const url =
    `https://api.telegram.org/bot${cfg.botToken}/sendMessage` +
    `?chat_id=${cfg.chatId}&text=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const body = (await res.json()) as { ok: boolean; description?: string };
  if (!body.ok) {
    throw new Error(`Telegram server returned error: ${body.description}`);
  }
}

/**
 * Build a fire-and-forget Telegram notifier. Returns a no-op when no config is
 * provided (e.g. in tests or when the bot isn't set up). The returned function
 * never throws and never blocks the caller: delivery happens in the background,
 * with a single retry, and failures are logged rather than propagated so a
 * lockout alert can't take down the request that triggered it.
 */
export function createTelegramNotifier(cfg?: TelegramConfig): Notifier {
  if (!cfg) return () => {};

  return (text: string) => {
    void (async () => {
      try {
        await sendOnce(cfg, text);
      } catch {
        try {
          await wait(RETRY_DELAY_MS);
          await sendOnce(cfg, text);
        } catch (err) {
          console.error('[telegram] failed to re-send notification', err);
        }
      }
    })();
  };
}
