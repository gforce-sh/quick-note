import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
  base: '/quick-note/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The Hono API runs as a separate process; Vite proxies /api to it
      // in dev, standing in for nginx in production.
      '/api': 'http://localhost:3001',
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
});
