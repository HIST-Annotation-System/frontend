import { defineConfig, devices } from '@playwright/test';
import { env } from './env';

const apiOrigin = new URL(env.apiUrl).origin;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.{spec,setup}.ts',
  outputDir: '../test-results',
  // Saving goes through the API to the real S3 bucket, which can take a few seconds.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // The dev API (one uvicorn process) drops connections when too many workers hammer it.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: '../playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: env.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      // The E2E API on its own port, against the throwaway Postgres (docker compose -f e2e/docker-compose.e2e.yml up -d).
      command: 'node e2e/scripts/run-backend.mjs',
      cwd: '..',
      url: `${apiOrigin}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${new URL(env.baseUrl).port} --strictPort`,
      cwd: '..',
      url: env.baseUrl,
      env: { VITE_API_URL: env.apiUrl },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
