import type { Page } from '@playwright/test';
import type { ParityScenario } from '../scenario';

/**
 * Lets a connection screen that just appeared settle for the capture: waits until its entrance
 * animations are over and its second background blob has started pulsing (after 1 s), then stops
 * the pulsing half a second before the capture. Stopped by the capture itself, or around the
 * moment the second blob starts, the blurred blobs sometimes come out one or two colour levels
 * off, in either app.
 */
export async function settleConnectionScreen(page: Page): Promise<void> {
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations === Infinity) animation.cancel();
    }
  });
  await page.waitForTimeout(500);
}

/** Connection screen shown at `/` while no keyboard is connected. */
const scenarios: readonly ParityScenario[] = [
  {
    name: 'welcome',
    path: '/',
    setup: async page => {
      await page.getByRole('button', { name: /Get Started|开始使用/ }).waitFor();
      await settleConnectionScreen(page);
    },
  },
];

export default scenarios;
