import type { Page } from '@playwright/test';
import type { VirtualKeyboardBrowserOptions } from '../../src/testing/virtual-keyboard/handle';

/**
 * One screen state captured in both the Svelte baseline and the React app by the parity harness
 * (scripts/parity). Each feature has one file in e2e/parity/scenarios/ whose default export is a
 * `readonly ParityScenario[]`. Every scenario is captured light/dark × en/zh × 1440×900/2560×1440.
 */
export interface ParityScenario {
  /** Unique kebab-case id; part of the capture file names. */
  readonly name: string;
  /** Path to open, relative to the app root, e.g. `/` or `/remap/`. */
  readonly path: string;
  /**
   * Brings the page into the captured state after navigation. Runs unchanged against both apps
   * and in every variant (including zh), so it must rely on what they share: roles, structure,
   * or copy matched in both languages.
   */
  readonly setup?: (page: Page) => Promise<void>;
  /**
   * Inject the virtual keyboard (navigator.hid) before the page loads, optionally with options.
   * Connected scenarios need `{ seedDynamicKeys: false }`: the baseline cannot load a keyboard
   * with dynamic keys (upstream parsing bug, src-controller/UPSTREAM.md).
   */
  readonly virtualKeyboard?: boolean | VirtualKeyboardBrowserOptions;
  /** localStorage entries seeded before the first page script (`darkMode`/`language` are set per variant). */
  readonly storage?: Readonly<Record<string, string>>;
}
