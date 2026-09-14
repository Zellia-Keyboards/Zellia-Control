import type { Locator, Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * Dynamic Keys (`/dynamic/`): the dashboard and the four editors — without a key, with keys
 * selected, after Apply (their configured lists), with pickers and tabs open — driven in both
 * apps through the same clicks on the page and the on-screen keyboard.
 *
 * Before the capture the toolbar and the keyboard above the page are hidden and the sidebar's
 * Save label is made invisible: they belong to the shell (worker E; the toolbar's profile
 * dropdown to worker F) and are compared by the `shell-*` scenarios. The pending profile dropdown
 * makes the React toolbar 16 px shorter, which would shift the whole page, and the Save label
 * differs by PL-002. With them out of the way, a capture only differs where this page does.
 */

const GET_STARTED = /Get Started|开始使用/;
/** Connected scenarios need unseeded dynamic keys: the baseline cannot load them. */
const KEYBOARD = { seedDynamicKeys: false } as const;

type Mode = 'tap-hold' | 'toggle' | 'dks' | 'null-bind';
/** Order of the dashboard's mode cards. */
const MODES: readonly Mode[] = ['tap-hold', 'toggle', 'dks', 'null-bind'];

/**
 * Keys by their position among the keycaps (the same in both apps; the baseline's keycaps show
 * no key names on this page): Tab (key 16), Q (17), W (18), Z (44) and X (45).
 */
const KEYCAP = { tab: 14, q: 15, w: 16, z: 42, x: 43 } as const;

/** The toolbar and the keyboard: the first two children of the main column. */
const SHELL_REGIONS = `
  .glassmorphism-main > :nth-child(-n + 2) { display: none !important; }
  button[title="Save configuration"] > * { visibility: hidden !important; }
`;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/**
 * Removes the `forwards` fill of finished fade-in animations (the configured lists'): the elements
 * look the same without it (fully faded in), but with it Chrome keeps them on composited layers
 * that it rasterizes at a different sub-pixel offset in each app at 2560×1440, although both apps
 * have the same layer tree, layout and styles there.
 */
async function settleFadeIns(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (
        animation instanceof CSSAnimation &&
        animation.playState === 'finished' &&
        /fade-?in/i.test(animation.animationName)
      ) {
        animation.cancel();
      }
    }
  });
}

/**
 * Hides the shell regions above the page and parks the pointer, ready for the capture. `scrollTo`
 * scrolls the main column to an element, or to its start or end: where a click scrolled it to
 * depends on the shell above the page, which differs (see above).
 */
async function showPage(page: Page, scrollTo?: Locator | 'start' | 'end'): Promise<void> {
  await page.addStyleTag({ content: SHELL_REGIONS });
  await settleFadeIns(page);
  if (scrollTo === 'start' || scrollTo === 'end') {
    await page.locator('.glassmorphism-main').evaluate((main, to) => {
      main.scrollTop = to === 'start' ? 0 : main.scrollHeight;
    }, scrollTo);
  } else if (scrollTo) {
    await scrollTo.evaluate(element => {
      element.scrollIntoView({ block: 'start' });
    });
  }
  await parkPointer(page);
}

/** Connects through "Get Started" and opens Dynamic Keys from the sidebar. */
async function openDashboard(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Tab$/ }).waitFor();
  await page.getByRole('link', { name: /Dynamic Keys|动态按键/ }).click();
  await page.waitForURL('**/dynamic/');
  await modeCards(page).first().waitFor();
}

function modeCards(page: Page): Locator {
  return page.locator('.w-96 .space-y-3 > button');
}

/** Opens a mode from the dashboard; its header replaces the dashboard. */
async function openMode(page: Page, mode: Mode): Promise<void> {
  await modeCards(page).nth(MODES.indexOf(mode)).click();
  await back(page).waitFor();
}

function back(page: Page): Locator {
  return page.getByRole('button', { name: /^(Back|返回)$/ });
}

async function clickKeycap(page: Page, position: number): Promise<void> {
  await page.locator('.keycap').nth(position).click();
}

/** Applies the editor's configuration and lets the list animations of both apps finish. */
async function apply(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Apply Configuration|应用配置/ }).click();
  await page.waitForTimeout(800);
}

/** Picks an action by its (untranslated) name in the action picker `picker`. */
async function pickAction(picker: Locator, name: string): Promise<void> {
  await picker.getByRole('button', { name, exact: true }).click();
}

/** The `index`-th action picker of the editor (tap-hold: 0 tap, 1 hold). */
function picker(page: Page, index = 0): Locator {
  return page
    .locator('.space-y-2')
    .filter({ has: page.getByRole('button', { name: /^Basic$/ }) })
    .nth(index);
}

/** The editor's tab buttons (null bind: Performance, Key Tester; DKS: Bindings first). */
function tab(page: Page, name: RegExp): Locator {
  return page.getByRole('button', { name });
}

const PERFORMANCE_TAB = /^(Performance|性能)$/;
const KEY_TESTER_TAB = /^(Key Tester|按键测试器)$/;

/** The four binding buttons of the DKS editor (64 px squares left of the sliders). */
function dksBinding(page: Page, index: number): Locator {
  return page.locator('.space-y-2 > .flex.items-center.gap-4 > button.w-16').nth(index);
}

/** The slider row of DKS binding `index`: four "+" nodes, then intervals and grips. */
function dksSlider(page: Page, index: number): Locator {
  return page.locator('.space-y-2 > .flex.items-center.gap-4 > .grow').nth(index);
}

/** A "+" node's accessible name: the glyph in the baseline, binding and phase in React. */
const STAGE_NODE = /^(\+|Binding \d: add tap at phase \d)$/;

/** Stage node `stage` (0–3) of DKS binding `binding`. */
function dksNode(page: Page, binding: number, stage: number): Locator {
  return dksSlider(page, binding).getByRole('button', { name: STAGE_NODE }).nth(stage);
}

/** Drags the grip of the interval that starts at `node` by `deltaX` pixels. */
async function dragGrip(page: Page, slider: Locator, deltaX: number): Promise<void> {
  const grip = slider.getByRole('button', { name: 'Drag to resize interval' }).first();
  const box = await grip.boundingBox();
  if (!box) throw new Error('the DKS grip is not visible');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + deltaX, y, { steps: 10 });
  await page.mouse.up();
}

/**
 * DKS binding 1 = A, pressed from the first stage and released at the last; binding 2 = B,
 * tapped at the third stage.
 */
async function editDksBindings(page: Page): Promise<void> {
  await dksBinding(page, 0).click();
  await pickAction(picker(page), 'A');
  await dksNode(page, 0, 0).click();
  await dragGrip(page, dksSlider(page, 0), 250);
  await dksBinding(page, 1).click();
  await pickAction(picker(page), 'B');
  await dksNode(page, 1, 2).click();
}

/** The null-bind editor's bottom-out switch, the only switch in its left column. */
function bottomOutSwitch(page: Page): Locator {
  return page.locator('.w-72 [role="switch"]');
}

/**
 * Configures the null-bind pair Z + X with the second behavior (absolute priority, key 1), with
 * the alternative bottom-out behavior when `bottomOut` is set.
 */
async function applyNullBind(page: Page, { bottomOut = false } = {}): Promise<void> {
  await clickKeycap(page, KEYCAP.z);
  await clickKeycap(page, KEYCAP.x);
  await page.locator('.mt-3.grid.gap-1 > button').nth(1).click();
  if (bottomOut) await bottomOutSwitch(page).click();
  await apply(page);
}

/** The toggle editor's trigger buttons: On Press, On Release. */
function toggleTrigger(page: Page, index: number): Locator {
  return page.locator('.md\\:grid-cols-2 > button').nth(index);
}

/** Toggle key Q = C, triggered on release, starting active. */
async function editToggleOptions(page: Page): Promise<void> {
  await clickKeycap(page, KEYCAP.q);
  await pickAction(picker(page), 'C');
  await toggleTrigger(page, 1).click();
  await page.getByLabel('Set toggle state to active').click();
}

/** Opens the category `name` of an action picker (Basic starts open). */
async function openCategory(picker: Locator, name: string): Promise<void> {
  await picker.getByRole('button', { name, exact: true }).click();
}

function connected(name: string, setup: (page: Page) => Promise<void>): ParityScenario {
  return {
    name: `dynamic-keys-${name}`,
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await openDashboard(page);
      await setup(page);
    },
  };
}

const scenarios: readonly ParityScenario[] = [
  // Dashboard
  connected('dashboard', async page => {
    await showPage(page);
  }),
  connected('dashboard-configured', async page => {
    // One key of each mode, then back to the table.
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    await apply(page);
    await back(page).click();
    await openMode(page, 'toggle');
    await clickKeycap(page, KEYCAP.q);
    await apply(page);
    await back(page).click();
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await apply(page);
    await back(page).click();
    await openMode(page, 'null-bind');
    await applyNullBind(page);
    await back(page).click();
    await modeCards(page).first().waitFor();
    await showPage(page);
  }),

  connected('dashboard-edit', async page => {
    // A toggle key on Q, edited from its row (H-4).
    await openMode(page, 'toggle');
    await clickKeycap(page, KEYCAP.q);
    await apply(page);
    await back(page).click();
    await modeCards(page).first().waitFor();
    await page.getByTitle('Edit configuration').click();
    await back(page).waitFor();
    await showPage(page);
  }),

  // Tap-hold
  connected('tap-hold', async page => {
    await openMode(page, 'tap-hold');
    await showPage(page);
  }),
  connected('tap-hold-key', async page => {
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    await showPage(page);
  }),
  connected('tap-hold-actions', async page => {
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    await pickAction(picker(page, 0), 'B');
    await pickAction(picker(page, 1), 'Left Shift');
    // The preview and the "how it works" panel name the picked actions.
    await showPage(page, 'start');
  }),
  connected('tap-hold-category-actions', async page => {
    // Actions that are not the first of their category (PL-019): Vol+ taps, Wheel Up holds.
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    await openCategory(picker(page, 0), 'System');
    await pickAction(picker(page, 0), 'Vol+');
    await openCategory(picker(page, 1), 'Mouse');
    await pickAction(picker(page, 1), 'Wheel Up');
    await page.waitForTimeout(500);
    // The preview and the "how it works" panel name the picked actions.
    await showPage(page, 'start');
  }),
  connected('tap-hold-timing', async page => {
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    // The timing sliders below the pickers.
    await showPage(page, 'end');
  }),
  connected('tap-hold-pickers', async page => {
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    // Basic folds away, the other categories of the tap action picker open.
    const categories = picker(page, 0);
    for (const name of ['Basic', 'Layer', 'System', 'Mouse']) {
      await categories.getByRole('button', { name, exact: true }).click();
    }
    await page.waitForTimeout(500);
    await showPage(page, page.getByRole('heading', { name: 'Tap Action', exact: true }));
  }),
  connected('tap-hold-configured', async page => {
    await openMode(page, 'tap-hold');
    await clickKeycap(page, KEYCAP.tab);
    await apply(page);
    await showPage(page, page.getByText(/Configured Tap-Hold Keys|已配置的轻按保持按键/));
  }),

  // Toggle
  connected('toggle', async page => {
    await openMode(page, 'toggle');
    await showPage(page);
  }),
  connected('toggle-key', async page => {
    await openMode(page, 'toggle');
    await clickKeycap(page, KEYCAP.q);
    await showPage(page);
  }),
  connected('toggle-configured', async page => {
    await openMode(page, 'toggle');
    await clickKeycap(page, KEYCAP.q);
    await apply(page);
    await showPage(page, page.getByText(/Configured Toggle Keys|已配置的切换按键/));
  }),
  connected('toggle-options', async page => {
    await openMode(page, 'toggle');
    await editToggleOptions(page);
    // The trigger and state cards below the picker.
    await showPage(page, 'end');
  }),
  connected('toggle-options-configured', async page => {
    // The trigger and state are remembered for the key (D5) and listed with it.
    await openMode(page, 'toggle');
    await editToggleOptions(page);
    await apply(page);
    await showPage(page, page.getByText(/Configured Toggle Keys|已配置的切换按键/));
  }),

  // Null bind
  connected('null-bind', async page => {
    await openMode(page, 'null-bind');
    await showPage(page);
  }),
  connected('null-bind-one-key', async page => {
    await openMode(page, 'null-bind');
    await clickKeycap(page, KEYCAP.z);
    await showPage(page);
  }),
  connected('null-bind-pair', async page => {
    await openMode(page, 'null-bind');
    await clickKeycap(page, KEYCAP.z);
    await clickKeycap(page, KEYCAP.x);
    await showPage(page);
  }),
  connected('null-bind-bottom-out', async page => {
    await openMode(page, 'null-bind');
    await clickKeycap(page, KEYCAP.z);
    await clickKeycap(page, KEYCAP.x);
    await bottomOutSwitch(page).click();
    await showPage(page);
  }),
  connected('null-bind-rapid-trigger', async page => {
    await openMode(page, 'null-bind');
    await clickKeycap(page, KEYCAP.z);
    await clickKeycap(page, KEYCAP.x);
    await page.getByRole('switch', { name: 'Rapid Trigger Toggle' }).click();
    await showPage(page);
  }),
  connected('null-bind-key-tester', async page => {
    await openMode(page, 'null-bind');
    await clickKeycap(page, KEYCAP.z);
    await clickKeycap(page, KEYCAP.x);
    await tab(page, KEY_TESTER_TAB).click();
    await showPage(page);
  }),
  connected('null-bind-configured', async page => {
    await openMode(page, 'null-bind');
    await applyNullBind(page, { bottomOut: true });
    await showPage(page);
  }),

  // Dynamic keystroke (DKS)
  connected('dks', async page => {
    await openMode(page, 'dks');
    await showPage(page);
  }),
  connected('dks-key', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await showPage(page);
  }),
  connected('dks-bindings', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await editDksBindings(page);
    await showPage(page, 'start');
  }),
  connected('dks-performance', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await tab(page, PERFORMANCE_TAB).click();
    await showPage(page);
  }),
  connected('dks-key-tester', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await tab(page, KEY_TESTER_TAB).click();
    await showPage(page);
  }),
  connected('dks-reset', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await page.getByRole('button', { name: /Reset Configuration|重置配置/ }).click();
    await showPage(page);
  }),
  connected('dks-reloaded', async page => {
    // The Reset preset applied, then the key selected afresh: the editor loads it back from the
    // keyboard (PL-021: Space's [0,1] + [1,3] comes back as [0,3]).
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await page.getByRole('button', { name: /Reset Configuration|重置配置/ }).click();
    await apply(page);
    await clickKeycap(page, KEYCAP.w);
    await clickKeycap(page, KEYCAP.w);
    await showPage(page);
  }),
  connected('dks-configured', async page => {
    await openMode(page, 'dks');
    await clickKeycap(page, KEYCAP.w);
    await editDksBindings(page);
    await apply(page);
    // The configured list below the editor (H-2: the baseline never showed it).
    await showPage(page, 'end');
  }),
];

export default scenarios;
