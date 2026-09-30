import { expect, test } from './fixtures';

test('the welcome screen loads without a keyboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Zellia Control');
  // No keyboard is paired: the app must boot without touching navigator.hid.
  await expect(page.locator('#root > *').first()).toBeAttached();
  expect(errors).toEqual([]);
});
