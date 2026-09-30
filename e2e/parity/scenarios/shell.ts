import type { Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';
import { settleConnectionScreen } from './welcome';

/**
 * App shell and on-screen keyboard: connection states, the 404 page and the connected shell
 * (sidebar, toolbar, keyboard) on every route that shows the keyboard.
 *
 * Connected scenarios hide the page region below the keyboard (it belongs to the feature pages
 * and has scenarios of its own), so these captures compare the shell only.
 */

const GET_STARTED = /Get Started|开始使用/;
const LOADING = /Loading configurator interface|正在加载配置界面/;
/** Connected scenarios need unseeded dynamic keys: the baseline cannot load them. */
const KEYBOARD = { seedDynamicKeys: false } as const;

/** Moves the pointer onto the sidebar title, where nothing reacts to hovering. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(100, 30);
}

/** Hides the feature page rendered below the toolbar and the keyboard. */
async function hidePageRegion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '.glassmorphism-main > :nth-child(n + 3) { display: none !important; }',
  });
}

/**
 * Clicks "Get Started" and waits until `/remap/` shows the keyboard's own keymap: the Tab key
 * only has its label once the device configuration is loaded (the controller defaults put Tab
 * on a split-backspace key that is hidden by default).
 */
async function connect(page: Page): Promise<void> {
  await page.getByRole('button', { name: GET_STARTED }).click();
  await page.waitForURL('**/remap/');
  await page.locator('.keycap', { hasText: /^Tab$/ }).waitFor();
}

/** Connects, then opens a keyboard route through the sidebar. */
function connectedRoute(link: RegExp, path: string): (page: Page) => Promise<void> {
  return async page => {
    await connect(page);
    await page.getByRole('link', { name: link }).click();
    await page.waitForURL(`**${path}`);
    await page.locator('.keycap').first().waitFor();
    await hidePageRegion(page);
    await parkPointer(page);
  };
}

async function openLayoutMenu(page: Page): Promise<void> {
  await page.getByTitle('Configure keyboard layout').click();
  await page.getByText('Layout Configuration').waitFor();
}

const scenarios: readonly ParityScenario[] = [
  {
    name: 'shell-not-connected',
    path: '/performance/',
    setup: async page => {
      await page.getByText('No Keyboard Connected').waitFor();
    },
  },
  {
    name: 'shell-not-found',
    path: '/',
    setup: async page => {
      await page.getByRole('button', { name: GET_STARTED }).waitFor();
      // A client-side navigation both routers follow: a popstate to a pushed entry. SvelteKit
      // only handles entries that carry its history indices.
      await page.evaluate(() => {
        const state = { 'sveltekit:history': 1_000_000, 'sveltekit:navigation': 1_000_000 };
        history.pushState(state, '', '/not-a-route/');
        window.dispatchEvent(new PopStateEvent('popstate', { state }));
      });
      await page.getByText('Not Found').waitFor();
    },
  },
  {
    name: 'shell-theme-colors',
    path: '/',
    setup: async page => {
      await page.getByRole('button', { name: /Theme Colors|主题颜色/ }).click();
      await page.getByTitle('Teal', { exact: true }).click();
      await parkPointer(page);
      // Let the recoloured, blurred background blobs settle before the capture.
      await settleConnectionScreen(page);
    },
  },
  {
    name: 'shell-connection-error',
    path: '/',
    virtualKeyboard: { ...KEYBOARD, picker: 'cancel' },
    setup: async page => {
      // From the keyboard: the new "Get Started" button would appear under the pointer, and
      // its highlight follows the pointer.
      await page.getByRole('button', { name: GET_STARTED }).focus();
      await page.keyboard.press('Enter');
      await page.getByText('No compatible keyboards found').waitFor();
      // The connection screen is shown afresh.
      await settleConnectionScreen(page);
    },
  },
  {
    name: 'shell-loading-overlay',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      // The browser's device chooser stays open: both apps show their loading overlay.
      await page.evaluate(() => {
        const hid: unknown = Reflect.get(navigator, 'hid');
        if (typeof hid !== 'object' || hid === null) throw new Error('navigator.hid is missing');
        Object.defineProperty(hid, 'requestDevice', {
          configurable: true,
          value: () => new Promise<never>(() => undefined),
        });
      });
      await page.getByRole('button', { name: GET_STARTED }).click();
      await page.getByText(LOADING).waitFor();
      await parkPointer(page);
    },
  },
  {
    // PL-003: the React app keeps the overlay and the waiting sidebar until the first
    // configuration arrives; the baseline shows /remap/ with the controller's defaults and a
    // connected sidebar meanwhile.
    name: 'shell-loading-config',
    path: '/',
    virtualKeyboard: { ...KEYBOARD, latencyMs: 1000 },
    setup: async page => {
      await page.getByRole('button', { name: GET_STARTED }).click();
      await Promise.race([
        page.getByText(LOADING).waitFor(),
        page.locator('.keycap').first().waitFor(),
      ]);
      await page.waitForTimeout(500);
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  {
    name: 'shell-remap',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  ...[2, 3, 4].map((layer): ParityScenario => ({
    name: `shell-remap-layer-${layer}`,
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await page.getByTitle(`Layer ${layer}`, { exact: true }).click();
      await hidePageRegion(page);
      await parkPointer(page);
    },
  })),
  {
    name: 'shell-remap-selection',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      const keycaps = page.locator('.keycap');
      await keycaps.nth(0).click();
      // Drag across the number row: pressing on "1" and entering "2" and "3" selects all three.
      const box = async (index: number) => {
        const rect = await keycaps.nth(index).boundingBox();
        if (!rect) throw new Error(`keycap ${index} is not visible`);
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      };
      const start = await box(1);
      const end = await box(3);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await page.mouse.up();
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  {
    name: 'shell-remap-hover',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await hidePageRegion(page);
      await page.locator('.keycap', { hasText: /^Tab$/ }).hover();
    },
  },
  {
    name: 'shell-layout-menu',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await openLayoutMenu(page);
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  {
    name: 'shell-layout-variants',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await openLayoutMenu(page);
      await page.getByText('7u (Tsangan)').click();
      // The 6.25u split-spacebar option slides out while the 7u one slides in.
      await page.getByText('(2.25u + 1.25u + 2.75u)').waitFor({ state: 'detached' });
      await page.getByText('Split spacebar').click();
      await page.getByText('Right shift split').click();
      await page.getByText('Split backspace').click();
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  {
    name: 'shell-layout-variants-closed',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await openLayoutMenu(page);
      await page.getByText('Split spacebar').click();
      await page.getByText('Split backspace').click();
      // Any click outside the menu closes it.
      await page.mouse.click(100, 30);
      await page.getByText('Layout Configuration').waitFor({ state: 'detached' });
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
  {
    name: 'shell-performance',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: connectedRoute(/Performance|性能/, '/performance/'),
  },
  {
    name: 'shell-lighting',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: connectedRoute(/Lighting|灯光/, '/lighting/'),
  },
  {
    name: 'shell-dynamic',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: connectedRoute(/Dynamic Keys|动态按键/, '/dynamic/'),
  },
  {
    name: 'shell-settings',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await page.getByRole('link', { name: /Settings|设置/ }).click();
      await page.waitForURL('**/settings/');
      // No toolbar and no keyboard here: hide the whole page.
      await page.addStyleTag({
        content: '.glassmorphism-main > * { display: none !important; }',
      });
      await parkPointer(page);
    },
  },
  {
    // PL-004: unplugging returns to the connection screen (the baseline ignored it).
    name: 'shell-unplugged',
    path: '/',
    virtualKeyboard: KEYBOARD,
    setup: async page => {
      await connect(page);
      await page.evaluate(() => {
        window.__virtualKeyboard?.disconnect();
      });
      await settleConnectionScreen(page);
      await hidePageRegion(page);
      await parkPointer(page);
    },
  },
];

export default scenarios;
