/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const apiPort = env.API_PORT ?? '3000';
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          // When the API dies, Vite either leaves an open stream hanging (headers already sent) or
          // answers 500 (which makes EventSource give up for good). Dropping the socket instead
          // is a network error, so the browser keeps retrying and resends Last-Event-ID.
          configure: (proxy) => {
            proxy.on('error', (_err, req, res) => {
              if (req.url?.startsWith('/api/events') && 'destroy' in res) res.destroy();
            });
          },
        },
      },
    },
    test: { environment: 'jsdom', include: ['src/**/*.test.tsx'] },
  };
});
