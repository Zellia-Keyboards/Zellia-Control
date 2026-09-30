import type { Page } from '@playwright/test';

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
   * Brings the page into the captured state after navigation. Runs unchanged against both apps,
   * so it must rely on what they share: visible copy, roles and structure.
   */
  readonly setup?: (page: Page) => Promise<void>;
  /** Inject the virtual keyboard (navigator.hid) before the page loads. */
  readonly virtualKeyboard?: boolean;
  /** localStorage entries seeded before the first page script (`darkMode`/`language` are set per variant). */
  readonly storage?: Readonly<Record<string, string>>;
}
