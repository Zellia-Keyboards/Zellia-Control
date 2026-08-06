import { expect, test } from './fixtures';

test.describe('service worker', () => {
  test('the app works offline once the service worker is installed', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15_000,
    });
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(
      /\/sw\.js$/
    );

    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle('Zellia Control');
    await expect(page.locator('#root > *').first()).toBeAttached();

    // Deep links are served from the precached shell as well.
    await page.goto('/remap/');
    await expect(page).toHaveTitle('Zellia Control');
    await expect(page.locator('#root > *').first()).toBeAttached();
  });

  test('the legacy /service-worker.js removes its caches and unregisters', async ({ page }) => {
    // A same-origin document that does not start the app (which registers /sw.js).
    await page.goto('/favicon.png');
    const scope = await page.evaluate(() => new URL('/', location.href).href);
    const legacyCaches = [
      'images-cache',
      'fonts-cache',
      'api-cache',
      `workbox-precache-v2-${scope}`,
    ];
    const currentCaches = [`zellia-control-precache-v2-${scope}`, 'google-fonts-cache'];
    await page.evaluate(
      async names => {
        for (const name of names) {
          await (await caches.open(name)).put('/probe', new Response('cached'));
        }
      },
      [...legacyCaches, ...currentCaches]
    );

    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/service-worker.js');
    });

    await expect
      .poll(() =>
        page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
      )
      .toBe(0);
    expect((await page.evaluate(() => caches.keys())).sort()).toEqual([...currentCaches].sort());
  });
});
