import { defineConfig } from '@playwright/test';
import { resolveBrowserChannel } from './scripts/browser-channel';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

// The production build served like the static host (see scripts/static-hosting.ts). CI builds in
// an earlier step; locally every run builds first so tests never see a stale build/.
const preview = `corepack yarn preview --port ${PORT} --strictPort`;

export default defineConfig({
  outputDir: 'e2e/.artifacts/test-results',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [
    [isCI ? 'github' : 'list'],
    ['html', { open: 'never', outputFolder: 'e2e/.artifacts/playwright-report' }],
  ],
  use: {
    baseURL,
    channel: resolveBrowserChannel(),
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testDir: './e2e',
      testMatch: '**/*.spec.ts',
    },
    {
      // Visual parity capture: the Svelte baseline and this app, driven by the same scenarios.
      // Run through `corepack yarn parity` (see docs/development.md).
      name: 'parity',
      testDir: './scripts/parity',
      testMatch: 'capture.ts',
      fullyParallel: true,
      timeout: 120_000,
    },
  ],
  webServer: {
    command: isCI ? preview : `corepack yarn build && ${preview}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
