import type { Locator, Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * Performance and Lighting pages inside the connected shell: the default screens, keys selected,
 * rapid trigger, the travel badge, every lighting mode button, the rainbow preset and the states
 * after Apply.
 *
 * Setups run unchanged in both apps and languages: they use roles and structure the two apps
 * share (the Svelte inputs have no accessible names, so inputs are found by type and order inside
 * the page, which is the last child of the main column in both apps).
 *
 * No setup sleeps for an animation: every transition on these pages is CSS (both apps), and the
 * capture's `animations: 'disabled'` finishes them, so a capture shows their end state.
 */

const GET_STARTED = /Get Started|开始使用/;
/** Connected scenarios need unseeded dynamic keys: the baseline cannot load them. */
const KEYBOARD = { seedDynamicKeys: false } as const;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/** The page rendered below the toolbar and the keyboard. */
function pageRegion(page: Page): Locator {
  return page.locator('.glassmorphism-main > :last-child');
}

/** Scrolls the main column to its end (the lower part of the page is below the fold). */
async function scrollToEnd(page: Page): Promise<void> {
  await page.locator('.glassmorphism-main').evaluate(main => {
    main.scrollTop = main.scrollHeight;
  });
}

/**
 * Clicks "Get Started", waits until `/remap/` shows the keyboard's own keymap (the Tab key only
 * has its label once the device configuration is loaded), then opens a page from the sidebar.
 */
async function connectTo(page: Page, link: RegExp, path: string): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Tab$/ }).waitFor();
  await page.getByRole('link', { name: link }).click();
  await page.waitForURL(`**${path}`);
  await page.locator('.keycap').first().waitFor();
}

/** Scrolls the main column back to its start (clicks scroll their target into view). */
async function scrollToStart(page: Page): Promise<void> {
  await page.locator('.glassmorphism-main').evaluate(main => {
    main.scrollTop = 0;
  });
}

/** Removes the keyboard focus, so no focus ring or caret shows in the capture. */
async function blur(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

// Performance ------------------------------------------------------------------------------------

/**
 * Stores key 1 (the number row's "1") in rapid-trigger mode on the keyboard before connecting:
 * press 0.2 mm, release 0.4 mm, deadzones 0.3 mm from the top and 0.6 mm from the bottom
 * (bottom-out point 3.4 mm), actuation 1.2 mm, deactivation 1.0 mm. Raw u16 fractions of 4 mm.
 */
async function storeRapidTriggerKey(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keyboard = window.__virtualKeyboard;
    const key = keyboard?.state.active.advancedKeys[1];
    if (!keyboard || !key) throw new Error('the virtual keyboard has no key 1');
    const raw = (mm: number) => Math.trunc((mm / 4) * 65535);
    keyboard.state.active.advancedKeys[1] = {
      ...key,
      mode: 2,
      activation: raw(1.2),
      deactivation: raw(1.0),
      triggerDistance: raw(0.2),
      releaseDistance: raw(0.4),
      upperDeadzone: raw(0.3),
      lowerDeadzone: raw(0.6),
    };
  });
}

async function openPerformance(page: Page): Promise<void> {
  await connectTo(page, /Performance|性能/, '/performance/');
  await page.getByRole('switch', { name: 'Rapid Trigger Toggle' }).waitFor();
}

/** Selects keycaps by their position in the keyboard (ids 1–3: the number row's 1, 2, 3). */
async function selectKeys(page: Page, positions: readonly number[] = [1, 2, 3]): Promise<void> {
  const keycaps = page.locator('.keycap');
  for (const position of positions) await keycaps.nth(position).click();
}

async function toggleRapidTrigger(page: Page): Promise<void> {
  await page.getByRole('switch', { name: 'Rapid Trigger Toggle' }).click();
  // The rapid-trigger columns are in (the actuation column slides out with CSS).
  await page.getByRole('switch', { name: 'Separate Sensitivity Toggle' }).waitFor();
}

// Lighting ---------------------------------------------------------------------------------------

async function openLighting(page: Page): Promise<void> {
  await connectTo(page, /Lighting|灯光/, '/lighting/');
  await pageRegion(page)
    .getByRole('button', { name: /^(Apply|应用)$/ })
    .first()
    .waitFor();
}

/** The two lighting panels, base first. */
function lightingPanels(page: Page): { base: Locator; key: Locator } {
  const panels = pageRegion(page).locator('.glassmorphism-card.overflow-hidden');
  return { base: panels.nth(0), key: panels.nth(1) };
}

async function openRainbowPreset(page: Page): Promise<void> {
  await lightingPanels(page)
    .key.getByRole('button', { name: /Rainbow Preset|彩虹预设/ })
    .click();
  await pageRegion(page)
    .getByRole('button', { name: /^(Apply Settings|应用设置)$/ })
    .waitFor();
}

/** Base modes (label in en, zh) as in `RGBPanel`; Blank is the keyboard's (and Svelte's) default. */
const BASE_MODES = [
  ['off', 'Off', '关闭'],
  ['rainbow', 'Rainbow', '彩虹'],
  ['wave', 'Wave', '波浪'],
] as const;

/** Per-key modes (label in en, zh) as in `RGBSubPanel`. */
const KEY_MODES = [
  ['fixed', 'Fixed', '固定'],
  ['static', 'Static', '静态'],
  ['cycle', 'Cycle', '循环'],
  ['linear', 'Linear', '线性'],
  ['trigger', 'Trigger', '触发'],
  ['string', 'String', '字符串'],
  ['fading-string', 'Fading String', '渐变字符串'],
  ['diamond-ripple', 'Diamond Ripple', '菱形涟漪'],
  ['fading-diamond-ripple', 'Fading Diamond Ripple', '渐变菱形涟漪'],
  ['jelly', 'Jelly', '果冻'],
  ['bubble', 'Bubble', '气泡'],
] as const;

function exactly(en: string, zh: string): RegExp {
  return new RegExp(`^(${en}|${zh})$`);
}

async function clickMode(panel: Locator, en: string, zh: string): Promise<void> {
  await panel.getByRole('button', { name: exactly(en, zh) }).click();
}

const scenarios: readonly ParityScenario[] = [
  // Performance
  {
    name: 'performance-default',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await parkPointer(page);
    },
  },
  {
    // PL-005, G-1: the React page loads the first selected key and counts the selection.
    name: 'performance-keys-selected',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await selectKeys(page);
      await parkPointer(page);
    },
  },
  {
    // PL-005: the rapid-trigger values come from the selected keys (the baseline shows NaN).
    name: 'performance-keys-selected-rapid-trigger',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await selectKeys(page);
      await toggleRapidTrigger(page);
      await parkPointer(page);
    },
  },
  {
    // PL-005: a key stored in rapid-trigger mode opens rapid trigger with its own distances
    // (separate press and release) and deadzones; the baseline keeps rapid trigger off.
    name: 'performance-rapid-trigger-key-selected',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await storeRapidTriggerKey(page);
      await openPerformance(page);
      await selectKeys(page, [1]);
      await parkPointer(page);
    },
  },
  {
    name: 'performance-rapid-trigger',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await toggleRapidTrigger(page);
      await parkPointer(page);
    },
  },
  {
    name: 'performance-rapid-trigger-separate',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await toggleRapidTrigger(page);
      await page.getByRole('switch', { name: 'Separate Sensitivity Toggle' }).click();
      await parkPointer(page);
    },
  },
  {
    // Both thumbs moved to the start: the actuation point ends 0.1 mm above the deactivation
    // point, below 0.3 mm, which shows the sensitivity warning.
    name: 'performance-low-actuation',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      const sliders = pageRegion(page).locator('input[type="range"]');
      await sliders.nth(0).focus();
      await page.keyboard.press('Home');
      await sliders.nth(1).focus();
      await page.keyboard.press('Home');
      await blur(page);
      await parkPointer(page);
    },
  },
  {
    name: 'performance-travel-tooltip',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await pageRegion(page).locator('[class*="travel-badge"]').hover();
    },
  },
  {
    // A shorter switch travel bounds the sliders: every range ends at 3 mm.
    name: 'performance-travel-3mm',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await toggleRapidTrigger(page);
      await pageRegion(page).locator('input[inputmode="decimal"]').fill('3');
      await blur(page);
      await parkPointer(page);
    },
  },

  {
    // G-3: a lone "." counts as an empty input (4 mm); the baseline set the travel to NaN.
    name: 'performance-travel-dot',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openPerformance(page);
      await pageRegion(page).locator('input[inputmode="decimal"]').fill('.');
      await blur(page);
      await parkPointer(page);
    },
  },

  // Lighting
  {
    // PL-006 (speed), G-2 (the key panel opens on key 0's mode).
    name: 'lighting-default',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      await parkPointer(page);
    },
  },
  {
    // The lower half of the page: brightness, and the key panel's speed and rainbow preset.
    name: 'lighting-scrolled',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      await scrollToEnd(page);
      await parkPointer(page);
    },
  },
  {
    // Edits wait for Apply: new colours, density and brightness in the panels.
    name: 'lighting-edited',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      const { base, key } = lightingPanels(page);
      const baseColors = base.locator('input[type="color"]');
      await baseColors.nth(0).fill('#22c55e');
      await baseColors.nth(1).fill('#3b82f6');
      await key.locator('input[type="color"]').fill('#f59e0b');
      const baseSliders = base.locator('input[type="range"]');
      // Density to its maximum, brightness to its minimum.
      await baseSliders.nth(1).focus();
      await page.keyboard.press('End');
      await baseSliders.nth(2).focus();
      await page.keyboard.press('Home');
      await blur(page);
      await scrollToEnd(page);
      await parkPointer(page);
    },
  },
  ...BASE_MODES.map(([key, en, zh]): ParityScenario => ({
    name: `lighting-base-mode-${key}`,
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      await clickMode(lightingPanels(page).base, en, zh);
      await parkPointer(page);
    },
  })),
  ...KEY_MODES.map(([key, en, zh]): ParityScenario => ({
    name: `lighting-key-mode-${key}`,
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      await clickMode(lightingPanels(page).key, en, zh);
      await parkPointer(page);
    },
  })),
  {
    // Base Apply with a new mode and direction; the panel then shows the applied values (the
    // baseline's speed reads 20000% again: it applies speed / 1000 and re-reads it × 1000).
    name: 'lighting-base-applied',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      const { base } = lightingPanels(page);
      await clickMode(base, 'Rainbow', '彩虹');
      await base.locator('input[type="number"]').fill('90');
      await base.getByRole('button', { name: /^(Apply|应用)$/ }).click();
      await parkPointer(page);
    },
  },
  {
    // Key Apply with keys selected: the selected keycaps show the new mode ("ripple").
    name: 'lighting-key-applied-selection',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      const keycaps = page.locator('.keycap');
      for (const position of [1, 2, 3]) await keycaps.nth(position).click();
      const { key } = lightingPanels(page);
      await clickMode(key, 'Fading Diamond Ripple', '渐变菱形涟漪');
      await key.getByRole('button', { name: /^(Apply|应用)$/ }).click();
      await parkPointer(page);
    },
  },
  {
    name: 'lighting-rainbow-preset',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      await openRainbowPreset(page);
      await scrollToEnd(page);
      // A press at the top of the rainbow dial points it down (270°, "↓ UTD").
      const dial = lightingPanels(page).key.locator('svg').last();
      const box = await dial.boundingBox();
      if (!box) throw new Error('the rainbow dial is not visible');
      await page.mouse.move(box.x + box.width / 2, box.y + 2);
      await page.mouse.down();
      await page.mouse.up();
      await parkPointer(page);
    },
  },
  {
    // PL-007: the React app colours every visible key from its layout position with the panel's
    // mode (keycaps read "reactive"); the baseline changed nothing.
    name: 'lighting-rainbow-applied',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openLighting(page);
      const { key } = lightingPanels(page);
      await clickMode(key, 'Linear', '线性');
      await openRainbowPreset(page);
      await pageRegion(page)
        .getByRole('button', { name: /^(Apply Settings|应用设置)$/ })
        .click();
      // The keycaps and the key panel's colour, which now shows key 0's new colour.
      await scrollToStart(page);
      await parkPointer(page);
    },
  },
];

export default scenarios;
