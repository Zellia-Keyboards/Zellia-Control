import type { RegisterSWOptions } from 'virtual:pwa-register';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type * as PwaModule from './pwa';

const registerSW = vi.hoisted(() => vi.fn<(options?: RegisterSWOptions) => () => Promise<void>>());

vi.mock('virtual:pwa-register', () => ({ registerSW }));

/** Fresh module instance per test (registration state is module-level). */
async function loadPwa(): Promise<typeof PwaModule> {
  vi.resetModules();
  return import('./pwa');
}

function lastOptions(): RegisterSWOptions {
  const options = registerSW.mock.lastCall?.[0];
  if (!options) throw new Error('registerSW was not called with options');
  return options;
}

beforeEach(() => {
  registerSW.mockReset();
  registerSW.mockReturnValue(() => Promise.resolve());
});

describe('registerServiceWorker', () => {
  it('registers the generated service worker once', async () => {
    const { registerServiceWorker } = await loadPwa();

    registerServiceWorker();
    registerServiceWorker();

    expect(registerSW).toHaveBeenCalledTimes(1);
  });

  it('defers registration to the window load event', async () => {
    const { registerServiceWorker } = await loadPwa();

    registerServiceWorker();

    expect(lastOptions().immediate).toBeFalsy();
  });

  it('always leaves the reload after an update to autoUpdate', async () => {
    const { registerServiceWorker } = await loadPwa();

    // With skipWaiting + clientsClaim (vite.config.ts) the new worker has already taken over the
    // page and deleted the old build's precache when vite-plugin-pwa would call onNeedReload, and
    // the deploy's rsync --delete removed the old chunks. A page that postponed the reload could no
    // longer load its lazy routes, so callers cannot take the reload over.
    expectTypeOf(registerServiceWorker).parameters.toEqualTypeOf<[]>();
    registerServiceWorker();

    // vite-plugin-pwa reloads the page itself when no onNeedReload handler is given.
    expect(lastOptions()).not.toHaveProperty('onNeedReload');
  });

  it('logs registration failures instead of throwing', async () => {
    const { registerServiceWorker } = await loadPwa();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('blocked');

    registerServiceWorker();
    lastOptions().onRegisterError?.(failure);

    expect(consoleError).toHaveBeenCalledWith('Service worker registration failed', failure);
  });
});
