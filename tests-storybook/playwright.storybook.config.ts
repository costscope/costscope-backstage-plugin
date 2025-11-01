import { defineConfig, devices } from '@playwright/test';

// Storybook-specific Playwright config.
// Assumes Storybook is already running locally.
// Set STORYBOOK_URL to override base (default http://localhost:6006)
const baseURL = process.env.STORYBOOK_URL || 'http://localhost:6006';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: __dirname,
  outputDir: 'tests-storybook/artifacts',
  workers: isCI ? 2 : 1,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ...devices['Desktop Chrome'],
  },
});
