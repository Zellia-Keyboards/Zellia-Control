// Visual parity capture (Playwright project `parity`): opens every scenario from
// e2e/parity/scenarios in the Svelte baseline and in this app with the same browser, viewport,
// preferences and fonts, and writes one screenshot per app plus a JSON record per capture to
// e2e/.artifacts/parity/captures/ (emptied first by reset-captures.ts). scripts/parity/compare.mjs
// turns them into the report.
//
// Run the whole pipeline with `corepack yarn parity`; filter with Playwright's `--grep`.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test, type Browser, type Page } from '@playwright/test';
import type { ParityScenario } from '../../e2e/parity/scenario';
import { buildVirtualKeyboard } from '../build-virtual-keyboard';
import { routeFontCache } from './font-cache';
import { PARITY_VARIANTS, captureId, seededStorage, type ParityVariant } from './matrix';
import { CAPTURE_DIR, FONT_CACHE_DIR } from './paths';
import { loadScenarios } from './scenarios';

const BASELINE_URL = process.env.PARITY_BASELINE_URL ?? 'http://localhost:4180';

type AppName = 'baseline' | 'react';

interface AppCapture {
  url: string;
  status: number | null;
  errors: string[];
}

/** JSON record written next to the screenshots (read by compare.mjs). */
interface CaptureRecord {
  id: string;
  scenario: string;
  path: string;
  theme: ParityVariant['theme'];
  language: ParityVariant['language'];
  viewport: ParityVariant['viewport'];
  browser: { name: string; channel: string; version: string };
  capturedAt: string;
  apps: Record<AppName, AppCapture>;
}

const scenarios = await loadScenarios();

let virtualKeyboardScript: Promise<string> | undefined;

/** Waits until the page is quiet: network idle, web fonts loaded, two frames rendered. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function captureApp(
  browser: Browser,
  origin: string,
  scenario: ParityScenario,
  variant: ParityVariant
): Promise<{ png: Buffer; capture: AppCapture }> {
  const context = await browser.newContext({
    baseURL: origin,
    viewport: variant.viewport,
    deviceScaleFactor: 1,
    colorScheme: variant.theme,
    locale: variant.language === 'zh' ? 'zh-CN' : 'en-US',
    timezoneId: 'UTC',
    // Neither app's service worker may influence what is rendered.
    serviceWorkers: 'block',
  });
  try {
    await context.addInitScript(() => {
      // Without the API both apps skip registration ('block' alone makes `register()` resolve to
      // undefined, which the apps then log as errors).
      Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
    });
    await routeFontCache(context, FONT_CACHE_DIR);
    await context.addInitScript(
      entries => {
        try {
          // Seed once per tab, so reloads in `setup` keep what the app stored since.
          if (sessionStorage.getItem('parity:seeded') !== null) return;
          for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
          sessionStorage.setItem('parity:seeded', '1');
        } catch {
          // about:blank has no storage.
        }
      },
      seededStorage(variant, scenario.storage ?? {})
    );
    if (scenario.virtualKeyboard) {
      virtualKeyboardScript ??= buildVirtualKeyboard();
      await context.addInitScript({ content: await virtualKeyboardScript });
    }

    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });

    const response = await page.goto(scenario.path);
    await settle(page);
    if (scenario.setup) {
      await scenario.setup(page);
      await settle(page);
    }
    const png = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' });
    return { png, capture: { url: page.url(), status: response?.status() ?? null, errors } };
  } finally {
    await context.close();
  }
}

test.beforeAll(async () => {
  const reachable = await fetch(BASELINE_URL).then(
    response => response.ok,
    () => false
  );
  if (!reachable) {
    throw new Error(
      `The Svelte baseline is not reachable at ${BASELINE_URL}. Run the whole pipeline with ` +
        '`corepack yarn parity`, or start the baseline with `corepack yarn parity:baseline`.'
    );
  }
});

for (const scenario of scenarios) {
  for (const variant of PARITY_VARIANTS) {
    const id = captureId(scenario.name, variant);

    test(id, async ({ browser, baseURL }, testInfo) => {
      if (baseURL === undefined) throw new Error('The parity project needs use.baseURL');
      const origins: Record<AppName, string> = { baseline: BASELINE_URL, react: baseURL };

      const captureAndStore = async (app: AppName): Promise<AppCapture> => {
        const { png, capture } = await captureApp(browser, origins[app], scenario, variant);
        await mkdir(path.join(CAPTURE_DIR, app), { recursive: true });
        await writeFile(path.join(CAPTURE_DIR, app, `${id}.png`), png);
        return capture;
      };
      // One after the other with the same browser instance.
      const baseline = await captureAndStore('baseline');
      const react = await captureAndStore('react');

      const record: CaptureRecord = {
        id,
        scenario: scenario.name,
        path: scenario.path,
        theme: variant.theme,
        language: variant.language,
        viewport: variant.viewport,
        browser: {
          name: browser.browserType().name(),
          channel: testInfo.project.use.channel ?? 'bundled',
          version: browser.version(),
        },
        capturedAt: new Date().toISOString(),
        apps: { baseline, react },
      };
      await writeFile(path.join(CAPTURE_DIR, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
    });
  }
}
