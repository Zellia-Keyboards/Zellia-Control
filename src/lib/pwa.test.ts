import type { RegisterSWOptions } from 'virtual:pwa-register';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as PwaModule from './pwa';
import type { UpdatePolicy } from './pwa';

const updateServiceWorker = vi.hoisted(() => vi.fn<(reloadPage?: boolean) => Promise<void>>());
const registerSW = vi.hoisted(() =>
  vi.fn<(options?: RegisterSWOptions) => typeof updateServiceWorker>()
);

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

/** An update policy whose idleness the test controls. */
function controllablePolicy(initiallyIdle: boolean) {
  let idle = initiallyIdle;
  const listeners = new Set<() => void>();
  const policy: UpdatePolicy = {
    isIdle: () => idle,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    policy,
    listenerCount: () => listeners.size,
    setIdle(value: boolean) {
      idle = value;
      listeners.forEach(listener => {
        listener();
      });
    },
  };
}

beforeEach(() => {
  updateServiceWorker.mockReset();
  updateServiceWorker.mockResolvedValue(undefined);
  registerSW.mockReset();
  registerSW.mockReturnValue(updateServiceWorker);
});

describe('registerServiceWorker', () => {
  it('registers the generated service worker once, after the window load event', async () => {
    const { registerServiceWorker } = await loadPwa();
    const { policy } = controllablePolicy(true);

    registerServiceWorker(policy);
    registerServiceWorker(policy);

    expect(registerSW).toHaveBeenCalledTimes(1);
    expect(lastOptions().immediate).toBeFalsy();
  });

  it('applies a waiting update right away when the app is idle', async () => {
    const { registerServiceWorker } = await loadPwa();
    const { policy } = controllablePolicy(true);

    registerServiceWorker(policy);
    lastOptions().onNeedRefresh?.();

    expect(updateServiceWorker).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('holds a waiting update until the app becomes idle, then applies it once', async () => {
    const { registerServiceWorker } = await loadPwa();
    const control = controllablePolicy(false);

    registerServiceWorker(control.policy);
    lastOptions().onNeedRefresh?.();
    expect(updateServiceWorker).not.toHaveBeenCalled();

    control.setIdle(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();

    control.setIdle(true);
    control.setIdle(true);
    expect(updateServiceWorker).toHaveBeenCalledExactlyOnceWith(true);
    expect(control.listenerCount()).toBe(0);
  });

  it('never activates an update that was not downloaded', async () => {
    const { registerServiceWorker } = await loadPwa();
    const control = controllablePolicy(false);

    registerServiceWorker(control.policy);
    control.setIdle(true);

    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('logs registration failures instead of throwing', async () => {
    const { registerServiceWorker } = await loadPwa();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('blocked');

    registerServiceWorker(controllablePolicy(true).policy);
    lastOptions().onRegisterError?.(failure);

    expect(consoleError).toHaveBeenCalledWith('Service worker registration failed', failure);
  });
});
