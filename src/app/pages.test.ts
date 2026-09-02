import { describe, expect, it, vi } from 'vitest';
import staticHostingSource from '../../scripts/static-hosting.ts?raw';
import { PAGE_PATHS, lacksTrailingSlash, preloadPage, type PageLoaders } from './pages';

function spyLoaders(): PageLoaders {
  const loader = () => vi.fn(() => Promise.resolve(() => null));
  return {
    remap: loader(),
    performance: loader(),
    lighting: loader(),
    dynamic: loader(),
    debug: loader(),
    settings: loader(),
    update: loader(),
    about: loader(),
    profiles: loader(),
  };
}

/** `STATIC_ROUTES` of scripts/static-hosting.ts (a node module, read as text here). */
function staticRoutes(): string[] {
  const list = /export const STATIC_ROUTES = \[([^\]]*)\]/.exec(staticHostingSource)?.[1] ?? '';
  return [...list.matchAll(/'([^']*)'/g)].map(([, route]) => route ?? '');
}

describe('PAGE_PATHS', () => {
  it('lists the routes the static host copies index.html to', () => {
    expect([...PAGE_PATHS].sort()).toEqual(staticRoutes().sort());
  });
});

describe('lacksTrailingSlash', () => {
  it('is true for page URLs without the trailing slash only', () => {
    for (const path of PAGE_PATHS) {
      expect(lacksTrailingSlash(`/${path}`)).toBe(true);
      expect(lacksTrailingSlash(`/${path}/`)).toBe(false);
    }
    expect(lacksTrailingSlash('/')).toBe(false);
    expect(lacksTrailingSlash('/not-a-route')).toBe(false);
    expect(lacksTrailingSlash('/remap/extra')).toBe(false);
  });
});

describe('preloadPage', () => {
  it('starts loading the page of a link, as SvelteKit preloaded on hover', () => {
    const loaders = spyLoaders();

    preloadPage('/debug/', loaders);
    preloadPage('/profiles', loaders);

    expect(loaders.debug).toHaveBeenCalledTimes(1);
    expect(loaders.profiles).toHaveBeenCalledTimes(1);
    expect(loaders.remap).not.toHaveBeenCalled();
  });

  it('ignores other paths and loading failures', async () => {
    const loaders = { ...spyLoaders(), about: vi.fn(() => Promise.reject(new Error('offline'))) };

    preloadPage('/', loaders);
    preloadPage('/not-a-route/', loaders);
    preloadPage('/about/', loaders);

    expect(loaders.about).toHaveBeenCalledTimes(1);
    // The rejection is handled: the navigation itself reports the failure.
    await Promise.resolve();
  });
});
