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
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeEnabled();
  await expect(page.getByRole('heading', { level: 1, name: 'ZELLIA Control' })).toHaveCount(2);
  await expect(page.getByText('Waiting to connect')).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(8);
  await expect(page.getByText('Display Too Small')).toBeHidden();
  // Dark mode and the glass style are the defaults.
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(page.locator('html')).toHaveClass(/glassmorphism/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});

test('small windows get the larger-display notice instead of the app', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Display Too Small' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeHidden();
});
