import type { RegisterSWOptions } from 'virtual:pwa-register';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('keeps the autoUpdate reload unless the caller takes over', async () => {
    const { registerServiceWorker } = await loadPwa();

    registerServiceWorker();

    // vite-plugin-pwa reloads the page itself when no onNeedReload handler is given.
    expect(lastOptions()).not.toHaveProperty('onNeedReload');
  });

  it('forwards a custom reload handler', async () => {
    const { registerServiceWorker } = await loadPwa();
    const onNeedReload = vi.fn();

    registerServiceWorker({ onNeedReload });
    lastOptions().onNeedReload?.();

    expect(onNeedReload).toHaveBeenCalledTimes(1);
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
