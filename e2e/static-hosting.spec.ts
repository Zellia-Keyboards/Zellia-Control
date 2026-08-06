import { STATIC_ROUTES } from '../scripts/static-hosting';
import { expect, test } from './fixtures';

// `vite preview` emulates the production host: plain static files, no rewrites.
test.describe('static hosting', () => {
  test('every route has its own index.html', async ({ request }) => {
    const shell = await (await request.get('/')).text();

    for (const route of STATIC_ROUTES) {
      const response = await request.get(`/${route}/`);
      expect(response.status(), `/${route}/`).toBe(200);
      expect(await response.text(), `/${route}/`).toBe(shell);
    }
  });

  test('routes without the trailing slash redirect to it', async ({ request }) => {
    const response = await request.get('/remap', { maxRedirects: 0 });

    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe('/remap/');
  });

  test('there is no SPA fallback for unknown paths', async ({ request }) => {
    expect((await request.get('/not-a-route/')).status()).toBe(404);
  });

  test('a deep link boots the app', async ({ page }) => {
    const response = await page.goto('/settings/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Zellia Control');
    await expect(page.locator('#root > *').first()).toBeAttached();
  });
});
