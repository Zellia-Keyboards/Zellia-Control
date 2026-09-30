import type { Page } from '@playwright/test';
import { STATIC_ROUTES } from '../scripts/static-hosting';
import { expect, test } from './fixtures';

/** Clicks "Get Started" on the welcome screen and waits for Remap with the keyboard's keymap. */
async function connect(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.waitForURL('**/remap/');
  await expect(page.locator('.keycap[data-key-id="16"]')).toHaveText('Tab');
}

/** A client-side navigation to `path` (the router follows history entries it did not create). */
async function followHistory(page: Page, path: string): Promise<void> {
  await page.evaluate(target => {
    history.pushState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

const sidebar = (page: Page) => page.locator('.sidebar');

test.describe('app shell', () => {
  test('connects the keyboard and opens Remap', async ({ page, virtualKeyboard }) => {
    await connect(page);

    await expect(sidebar(page).getByText('ZelliaKB')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
    await expect(page.getByTitle('Layer 1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTitle('Configure keyboard layout')).toBeVisible();
    // Remap replaced the history entry of / (about:blank, then /remap/).
    expect(await page.evaluate(() => history.length)).toBe(2);

    const keyboard = await virtualKeyboard.handle();
    const reads = await keyboard.evaluate(vk => vk.sentPackets.length);
    expect(reads).toBeGreaterThan(0);
  });

  test('navigates the pages from the sidebar', async ({ page, virtualKeyboard }) => {
    await connect(page);
    const pages: readonly (readonly [string, string, boolean])[] = [
      ['Performance', '/performance/', true],
      ['Lighting', '/lighting/', true],
      ['Dynamic Keys', '/dynamic/', true],
      ['Debug', '/debug/', false],
      ['Settings', '/settings/', false],
      ['Update', '/update/', false],
      ['About', '/about/', false],
      ['Remap', '/remap/', true],
    ];

    for (const [name, path, showsKeyboard] of pages) {
      const link = page.getByRole('navigation').getByRole('link', { name, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(link).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.keycap').first()).toBeVisible({ visible: showsKeyboard });
      await expect(page.getByTitle('Configure keyboard layout')).toBeVisible({
        visible: showsKeyboard,
      });
    }

    await page.getByRole('link', { name: 'Profiles' }).click();
    await expect(page).toHaveURL(/\/profiles\/$/);
    await expect(page.locator('.keycap')).toHaveCount(0);
    // Client-side navigation keeps the keyboard session.
    expect(await (await virtualKeyboard.handle()).evaluate(vk => vk.connected)).toBe(true);
    await expect(sidebar(page).getByText('ZelliaKB')).toBeVisible();
  });

  test('selects keys on the keyboard and follows the layer', async ({ page, virtualKeyboard }) => {
    await connect(page);
    const keyboard = await virtualKeyboard.handle();
    await keyboard.evaluate(vk => {
      vk.clearHistory();
    });
    const escape = page.locator('.keycap[data-key-id="0"]');
    const one = page.locator('.keycap[data-key-id="1"]');

    await escape.hover();
    await page.mouse.down();
    await one.hover();
    await page.mouse.up();

    await expect(escape).toHaveAttribute('aria-pressed', 'true');
    await expect(one).toHaveAttribute('aria-pressed', 'true');

    await page.getByTitle('Layer 2').click();
    await expect(page.getByTitle('Layer 2')).toHaveAttribute('aria-pressed', 'true');
    await expect(escape).toHaveAttribute('aria-pressed', 'true');
    // Selecting keys and switching layers never writes to the keyboard.
    expect(await keyboard.evaluate(vk => vk.sentPackets.length)).toBe(0);
  });

  test('returns to the connection screen when the keyboard is unplugged', async ({
    page,
    virtualKeyboard,
  }) => {
    await connect(page);
    await page.getByRole('link', { name: 'Lighting' }).click();
    await expect(page).toHaveURL(/\/lighting\/$/);

    await (
      await virtualKeyboard.handle()
    ).evaluate(vk => {
      vk.disconnect();
    });

    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(sidebar(page).getByText('Waiting to connect')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toHaveCount(0);
  });

  test('disconnects from the sidebar', async ({ page, virtualKeyboard }) => {
    await connect(page);

    await page.getByRole('button', { name: 'Disconnect' }).click();

    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(sidebar(page).getByText('Waiting to connect')).toBeVisible();
    // One new history entry, like Svelte's goto('/'): about:blank, /remap/, /.
    expect(await page.evaluate(() => history.length)).toBe(3);

    // The keyboard stays plugged in and connects again.
    expect(await (await virtualKeyboard.handle()).evaluate(vk => vk.connected)).toBe(true);
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.waitForURL('**/remap/');
    await expect(sidebar(page).getByText('ZelliaKB')).toBeVisible();
  });

  test('keeps the theme color, language and dark mode across reloads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Theme Colors' }).click();
    await page.getByRole('button', { name: 'Teal' }).click();
    await page.getByRole('button', { name: '中文' }).click();
    await page.getByRole('button', { name: '深色模式' }).click();

    await page.reload();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'zh');
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(html).toHaveClass(/glassmorphism/);
    expect(
      await page.evaluate(() => document.documentElement.style.getPropertyValue('--color-primary'))
    ).toBe('#2DD4BF');
    await expect(page.getByRole('button', { name: '开始使用' })).toBeVisible();
    await expect(page.getByRole('button', { name: '浅色模式' })).toBeVisible();
    await page.getByRole('button', { name: '主题颜色' }).click();
    await expect(page.getByRole('button', { name: 'Teal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('opens every page URL of the static host inside the shell', async ({ page }) => {
    for (const route of STATIC_ROUTES) {
      await page.goto(`/${route}/`);
      await expect(page.getByText('No Keyboard Connected'), `/${route}/`).toBeVisible();
    }

    await page.getByRole('button', { name: 'Go to Home' }).click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });

  test('adds the trailing slash and shows a 404 page on client-side navigation', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();

    await followHistory(page, '/settings?tab=2#top');
    await expect(page).toHaveURL(/\/settings\/\?tab=2#top$/);
    await expect(page.getByText('No Keyboard Connected')).toBeVisible();

    await followHistory(page, '/not-a-route/');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Not Found')).toBeVisible();
    await expect(sidebar(page)).toHaveCount(0);
  });
});
