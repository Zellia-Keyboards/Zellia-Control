import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// public/service-worker.js replaces the legacy SvelteKit worker at the same URL.
const source = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8');

const SCOPE = 'https://configurator.zellia.cn/';

interface ExtendableEvent {
  waitUntil(promise: Promise<unknown>): void;
}

type Listener = (event: ExtendableEvent) => void;

function startWorker(cacheNames: readonly string[], options: { failDeleting?: string } = {}) {
  const caches = new Set(cacheNames);
  const listeners = new Map<string, Listener[]>();
  const calls: string[] = [];
  const scope: Record<string, unknown> = {
    caches: {
      keys: () => Promise.resolve([...caches]),
      delete: (name: string) => {
        calls.push(`delete ${name}`);
        if (name === options.failDeleting) return Promise.reject(new Error('quota'));
        return Promise.resolve(caches.delete(name));
      },
    },
    registration: {
      scope: SCOPE,
      unregister: vi.fn(() => {
        calls.push('unregister');
        return Promise.resolve(true);
      }),
    },
    skipWaiting: vi.fn(() => Promise.resolve()),
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  scope.self = scope;
  vm.runInNewContext(source, vm.createContext(scope));

  return {
    scope,
    caches,
    calls,
    listeners,
    async dispatch(type: string): Promise<void> {
      const pending: Promise<unknown>[] = [];
      for (const listener of listeners.get(type) ?? []) {
        listener({ waitUntil: promise => pending.push(promise) });
      }
      await Promise.all(pending);
    },
  };
}

describe('public/service-worker.js (legacy kill switch)', () => {
  it('activates without waiting for open tabs', async () => {
    const worker = startWorker([]);

    await worker.dispatch('install');

    expect(worker.scope.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('deletes the caches of the legacy SvelteKit worker and keeps the current ones', async () => {
    const worker = startWorker([
      `workbox-precache-v2-${SCOPE}`,
      `workbox-precache-v2-${SCOPE}-temp`,
      'images-cache',
      'fonts-cache',
      'api-cache',
      `zellia-control-precache-v2-${SCOPE}`,
      'google-fonts-cache',
    ]);

    await worker.dispatch('activate');

    expect([...worker.caches].sort()).toEqual(
      ['google-fonts-cache', `zellia-control-precache-v2-${SCOPE}`].sort()
    );
  });

  it('unregisters itself after deleting the caches', async () => {
    const worker = startWorker(['images-cache']);

    await worker.dispatch('activate');

    expect(worker.calls).toEqual(['delete images-cache', 'unregister']);
  });

  it('still unregisters when a cache cannot be deleted', async () => {
    const worker = startWorker(['images-cache', 'api-cache'], { failDeleting: 'images-cache' });

    await worker.dispatch('activate');

    expect(worker.calls).toContain('unregister');
    expect(worker.caches.has('api-cache')).toBe(false);
  });

  it('never answers requests', () => {
    const worker = startWorker([]);

    expect(worker.listeners.has('fetch')).toBe(false);
  });
});
