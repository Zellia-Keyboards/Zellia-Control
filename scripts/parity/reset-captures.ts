// Playwright project `parity-setup`, a dependency of `parity` (playwright.config.ts). Dependencies
// run once before their project and are not filtered by --grep, so every capture run starts from
// an empty captures directory and compare.mjs only ever reports the latest run. (Clearing in
// capture.ts's beforeAll would not work: with fullyParallel every worker runs it.)

import { rm } from 'node:fs/promises';
import { test } from '@playwright/test';
import { CAPTURE_DIR } from './paths';

test('remove the captures of earlier runs', async () => {
  await rm(CAPTURE_DIR, { recursive: true, force: true });
});
