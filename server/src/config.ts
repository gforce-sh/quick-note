import type { AppConfig } from "./app";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Build runtime config from the environment (the composition root). */
export function loadConfig(): AppConfig {
  const isProd = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProd && !sessionSecret) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return {
    sessionSecret: sessionSecret ?? "dev-insecure-secret",
    sessionTtlMs: SEVEN_DAYS_MS,
    secureCookies: isProd,
    // Only wire up the notifier when both halves are present.
    telegram: botToken && chatId ? { botToken, chatId } : undefined,
  };
}

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? "data/notes.db";
}
