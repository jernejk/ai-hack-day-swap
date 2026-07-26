import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4179',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4179',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: true,
  },
});
