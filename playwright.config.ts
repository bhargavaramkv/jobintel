import { defineConfig } from '@playwright/test';

// The API runs as a fixture (e2e/api-process.ts) on port 3100; only Vite is started here.
const WEB_PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${WEB_PORT}` },
  webServer: {
    command: `npm run dev -w @jobintel/web -- --port ${WEB_PORT}`,
    url: `http://127.0.0.1:${WEB_PORT}`,
    env: { API_PORT: '3100' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
