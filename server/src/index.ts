import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db";
import { loadConfig, databasePath } from "./config";

const db = createDb(databasePath());
const config = loadConfig();
const app = createApp({ db, config });

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}`);
});
