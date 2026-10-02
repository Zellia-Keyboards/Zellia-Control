import type { Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * The Macros and Scripts pages and Remap's Macro and Script groups (macros and scripts spec) on
 * the virtual Trinity Pad, whose controller declares 4 macro slots and AOT scripts. The Svelte
 * app has none of these screens: every scenario is React-only (`new`; PL-051 to PL-054).
 */

const GET_STARTED = /Get Started|开始使用/;
const KEYBOARD = { model: 'trinity-pad', seedDynamicKeys: false } as const;
const MACROS = /^(Macros|宏)$/;
const SCRIPTS = /^(Scripts|脚本)$/;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/**
 * Scrolls the sidebar back to its start. With Macros and Scripts it is 44 px taller than a
 * 1440×900 viewport, and its links still move while the Save and Disconnect buttons slide in: the
 * click on a moving link is retried with the link scrolled into view at another alignment, which
 * at times left the sidebar scrolled to its end.
 */
async function scrollSidebarToStart(page: Page): Promise<void> {
  await page.locator('.sidebar').evaluate(sidebar => {
    sidebar.scrollTop = 0;
  });
}

/** Clicks "Get Started" and waits for the Trinity Pad's keymap on Remap (key 0 is Z). */
async function connect(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Z$/ }).waitFor();
}

async function openPage(page: Page, name: RegExp, path: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name }).click();
  await page.waitForURL(`**${path}`);
}

/** Gives macro 1 a recorded Shift+A (ticks at 8000 Hz) before the app connects. */
async function seedMacro(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__virtualKeyboard !== undefined);
  await page.evaluate(() => {
    const slot = window.__virtualKeyboard?.state.macros[0];
    if (!slot) throw new Error('the keyboard has no macro 1');
    const entries = [
      { delay: 0, keycode: 0x0200, event: 3 },
      { delay: 400, keycode: 0x04, event: 3 },
      { delay: 1200, keycode: 0x04, event: 1 },
      { delay: 1600, keycode: 0x0200, event: 1 },
      // The end marker.
      { delay: 1600, keycode: 0, event: 0 },
    ];
    entries.forEach((entry, index) => {
      slot[index] = { index, keyId: 0, isVirtual: entry.keycode !== 0, ...entry };
    });
  });
}

function trinity(name: string, setup: (page: Page) => Promise<void>): ParityScenario {
  return {
    name,
    path: '/',
    reactOnly: true,
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await setup(page);
      await scrollSidebarToStart(page);
      await parkPointer(page);
    },
  };
}

const scenarios: readonly ParityScenario[] = [
  // The four slots, the limit, the tools and the empty macro.
  trinity('macros-empty', async page => {
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByText(/^0 \/ 127/).waitFor();
  }),
  // A recorded Shift+A, loaded from the keyboard.
  trinity('macros-actions', async page => {
    await seedMacro(page);
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByRole('table').waitFor();
  }),
  // Recording: Stop and the recording line.
  trinity('macros-recording', async page => {
    await seedMacro(page);
    await connect(page);
    await openPage(page, MACROS, '/macros/');
    await page.getByRole('button', { name: /^(Record|录制)$/ }).click();
    await page.getByRole('button', { name: /^(Stop|停止)$/ }).waitFor();
  }),
  // The example, compiled: the status and the bytecode section.
  trinity('scripts-example', async page => {
    await connect(page);
    await openPage(page, SCRIPTS, '/scripts/');
    await page.getByRole('textbox').waitFor();
    await page.getByRole('button', { name: /^(Load example|加载示例)$/ }).click();
    await page.getByText(/^(Compiled|已编译)/).waitFor();
  }),
  // A syntax error: the status, the error and its line.
  trinity('scripts-error', async page => {
    await connect(page);
    await openPage(page, SCRIPTS, '/scripts/');
    await page.getByRole('textbox').fill('function loop() {\n  let x = ;\n}\n');
    await page.getByText(/^(Errors|有错误)/).waitFor();
  }),
  // Remap's Extension tab with the Macro and Script groups (the tab names are English in both
  // languages, as in the Svelte app).
  trinity('remap-extension-macro', async page => {
    await connect(page);
    const remap = page.getByRole('application');
    await remap.getByRole('button', { name: 'Extension', exact: true }).click();
    const macroGroup = remap.getByRole('heading', { name: /^(Macro|宏)$/ });
    await macroGroup.waitFor();
    await remap.locator('main .absolute.inset-0').nth(1).waitFor({ state: 'detached' });
    await macroGroup.scrollIntoViewIfNeeded();
  }),
];

export default scenarios;
