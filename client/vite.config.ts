import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5173,
    proxy: {
      // The Hono API runs as a separate process; Vite proxies /api to it
      // in dev, standing in for nginx in production.
      "/api": "http://localhost:3001",
    },
  },
});
