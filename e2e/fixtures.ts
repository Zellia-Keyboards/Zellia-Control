import {
  test as base,
  expect,
  type BrowserContext,
  type JSHandle,
  type Page,
} from '@playwright/test';
import { VIRTUAL_KEYBOARD_ENTRY, buildVirtualKeyboard } from '../scripts/build-virtual-keyboard';

/**
 * Browser-side handle that src/testing/virtual-keyboard/browser.ts publishes as
 * `window.__virtualKeyboard` (see that module for the full API). e2e code is compiled without the
 * app's types, so only the members the fixtures rely on are declared here.
 */
export interface VirtualKeyboardHandle {
  /** HIDDevice-compatible simulated keyboard. */
  readonly device: unknown;
  /** HID-compatible manager installed as `navigator.hid`. */
  readonly hid: unknown;
  /** Simulated device state (config, keymap, dynamic keys, …). */
  readonly state: unknown;
  /** Reports the app sent to the device. */
  readonly sentReports: unknown;
  /** Simulates unplugging the keyboard. */
  disconnect(): void;
}

declare global {
  interface Window {
    __virtualKeyboard?: VirtualKeyboardHandle;
  }
}

export interface VirtualKeyboard {
  /**
   * Waits until the current document has installed the virtual keyboard and returns its handle,
   * e.g. `await (await virtualKeyboard.handle()).evaluate(keyboard => keyboard.disconnect())`.
   */
  handle(options?: { timeout?: number }): Promise<JSHandle<VirtualKeyboardHandle>>;
}

interface TestFixtures {
  /** Answers Google Fonts requests locally so tests never depend on the CDN. */
  hermeticFonts: undefined;
  /**
   * Injects the virtual libamp keyboard into every page of the test's context before any page
   * script runs, so the app finds it on `navigator.hid`. Request it before navigating.
   */
  virtualKeyboard: VirtualKeyboard;
}

interface WorkerFixtures {
  /** Entry bundled for the `virtualKeyboard` fixture (repository-relative). */
  virtualKeyboardEntry: string;
  virtualKeyboardScript: string;
}

const GOOGLE_FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

async function stubGoogleFonts(context: BrowserContext): Promise<void> {
  await context.route(GOOGLE_FONTS, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
}

function virtualKeyboardOn(page: Page): VirtualKeyboard {
  return {
    async handle({ timeout = 5_000 } = {}) {
      try {
        await page.waitForFunction(() => window.__virtualKeyboard !== undefined, undefined, {
          timeout,
        });
      } catch (error) {
        throw new Error(
          'window.__virtualKeyboard is not installed on this page. Request the virtualKeyboard ' +
            'fixture before navigating, and check the page for errors thrown by the bundle.',
          { cause: error }
        );
      }
      return page.evaluateHandle(() => {
        const keyboard = window.__virtualKeyboard;
        if (!keyboard) throw new Error('window.__virtualKeyboard disappeared');
        return keyboard;
      });
    },
  };
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  virtualKeyboardEntry: [VIRTUAL_KEYBOARD_ENTRY, { scope: 'worker', option: true }],

  // Bundled lazily, once per worker, and only for tests that use the virtualKeyboard fixture.
  virtualKeyboardScript: [
    async ({ virtualKeyboardEntry }, use) => {
      await use(await buildVirtualKeyboard({ entry: virtualKeyboardEntry }));
    },
    { scope: 'worker' },
  ],

  hermeticFonts: [
    async ({ context }, use) => {
      await stubGoogleFonts(context);
      await use(undefined);
    },
    { auto: true },
  ],

  virtualKeyboard: async ({ context, page, virtualKeyboardScript }, use) => {
    await context.addInitScript({ content: virtualKeyboardScript });
    await use(virtualKeyboardOn(page));
  },
});

export { expect };
