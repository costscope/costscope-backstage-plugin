import { defineConfig, devices } from '@playwright/test';

// Lightweight config to run manual preview smoke tests against an already running host.
// No global setup/teardown; set PREVIEW_BASE to the full base URL of the minimal app (without trailing slash).

export default defineConfig({
  testDir: 'tests-e2e',
  outputDir: 'tests-e2e/artifacts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
