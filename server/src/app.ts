import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from './db';
import { createV1Router } from './routes';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
  }
}

export interface AppConfig {
  sessionSecret: string;
  sessionTtlMs: number;
  /** Set the Secure flag on the session cookie (off in dev over http). */
  secureCookies: boolean;
}

export interface AppDeps {
  db: Db;
  config: AppConfig;
  /** Injectable clock; defaults to Date.now. Lets tests control time. */
  now?: () => number;
}

export function createApp(deps: AppDeps) {
  const app = new Hono();
  app.route('/api/v1', createV1Router(deps));

  // Unknown paths get the same JSON shape as every other error.
  app.notFound((c) => c.json({ error: 'not found' }, 404));

  // Central error boundary. Handlers that deliberately signal a status throw an
  // HTTPException and it's honored; anything else is an unexpected fault — log
  // the detail server-side and return a generic 500 so the message/stack never
  // reaches the client.
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    console.error('[unhandled]', err);
    return c.json({ error: 'internal error' }, 500);
  });

  return app;
}
