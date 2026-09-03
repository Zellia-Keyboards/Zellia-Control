import type { ParityScenario } from '../scenario';

/** Connection screen shown at `/` while no keyboard is connected. */
const scenarios: readonly ParityScenario[] = [
  {
    name: 'welcome',
    path: '/',
    setup: async page => {
      await page.getByRole('button', { name: /Get Started|开始使用/ }).waitFor();
      // The second blurred background blob starts pulsing after 1 s: a capture around that
      // moment can catch it one colour level off in either app.
      await page.waitForTimeout(1500);
    },
  },
];

export default scenarios;
