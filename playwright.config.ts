import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

// Playwright configuration:
// - Global setup starts mock server + example Backstage app (see tests-e2e/global-setup.cjs)
// - BACKSTAGE_BASE_URL can override default dev URL (http://localhost:3000)
// - E2E_REUSE=1 avoids restarting servers when already running
// - E2E_SMOKE_ONLY=1 narrows to @smoke-tagged tests (fast PR sanity)
// - PW_SHARD=N/M enables sharding without custom scripting

const isCI = !!process.env.CI;
const baseURL = process.env.BACKSTAGE_BASE_URL || 'http://localhost:3000';
const smokeOnly = process.env.E2E_SMOKE_ONLY === '1';
const shard = process.env.PW_SHARD; // e.g. "1/2"
const traceAll = process.env.E2E_TRACE_ALL === '1';

// Parse browser matrix (comma-separated) e.g. chromium,firefox,webkit (default: chromium)
const browserList = (process.env.E2E_BROWSERS || 'chromium')
  .split(',')
  .map(b => b.trim())
  .filter(Boolean);

const projects = browserList.map(name => {
  const deviceMap: Record<string, any> = {
    chromium: devices['Desktop Chrome'],
    firefox: devices['Desktop Firefox'],
    webkit: devices['Desktop Safari'],
  };
  return { name, use: { ...(deviceMap[name] || devices['Desktop Chrome']) } };
});

export default defineConfig({
  testDir: 'tests-e2e',
  outputDir: 'tests-e2e/artifacts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 1 : 0,
  workers: shard ? 1 : (isCI ? 2 : 1),
  shard: shard
    ? (() => {
        const [index, total] = shard.split('/').map(Number);
        return { current: index, total } as any;
      })()
    : undefined,
  grep: smokeOnly ? /@smoke/ : undefined,
  globalSetup: require.resolve('./tests-e2e/global-setup.cjs'),
  globalTeardown: require.resolve('./tests-e2e/global-teardown.cjs'),
  reporter: isCI
    ? [ ['github'], ['list'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }] ]
    : [ ['list'], ['html', { open: 'never' }] ],
  use: {
    baseURL,
  trace: traceAll ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects,
});
