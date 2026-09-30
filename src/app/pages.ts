/**
 * The app's pages, each served at `/<path>/` and lazy-loaded from its feature. The static host
 * needs an `index.html` copy per path: keep `STATIC_ROUTES` (scripts/static-hosting.ts) in sync.
 */
import type { ComponentType } from 'react';

export const PAGE_PATHS = [
  'remap',
  'performance',
  'lighting',
  'dynamic',
  'debug',
  'settings',
  'update',
  'about',
  'profiles',
] as const;

export type PagePath = (typeof PAGE_PATHS)[number];

/** Loads a page component (its feature's chunk). */
export type PageLoader = () => Promise<ComponentType>;
export type PageLoaders = Readonly<Record<PagePath, PageLoader>>;

/** Every page from its feature's index, each in its own chunk. */
export const APP_PAGES: PageLoaders = {
  remap: async () => (await import('../features/remap')).RemapPage,
  performance: async () => (await import('../features/performance')).PerformancePage,
  lighting: async () => (await import('../features/lighting')).LightingPage,
  dynamic: async () => (await import('../features/dynamic-keys')).DynamicKeysPage,
  debug: async () => (await import('../features/debug')).DebugPage,
  settings: async () => (await import('../features/settings')).SettingsPage,
  update: async () => (await import('../features/firmware-update')).UpdatePage,
  about: async () => (await import('../features/about')).AboutPage,
  profiles: async () => (await import('../features/profiles')).ProfilesPage,
};

function isPagePath(value: string): value is PagePath {
  return PAGE_PATHS.some(path => path === value);
}

/** The page at `pathname` (`/remap` or `/remap/`), if it is one. */
function pageAt(pathname: string): PagePath | null {
  const [, first = '', rest = ''] = /^\/([^/]*)(\/?.*)$/.exec(pathname) ?? [];
  return isPagePath(first) && (rest === '' || rest === '/') ? first : null;
}

/** Whether `pathname` is a page URL without its trailing slash, e.g. `/remap`. */
export function lacksTrailingSlash(pathname: string): boolean {
  return !pathname.endsWith('/') && pageAt(pathname) !== null;
}

/**
 * Starts loading the page a link points to, so the navigation does not wait for its chunk
 * (SvelteKit preloaded pages when a link was hovered). Failures are left to the navigation.
 */
export function preloadPage(href: string, pages: PageLoaders = APP_PAGES): void {
  const page = pageAt(href);
  if (page) {
    pages[page]().catch(() => undefined);
  }
}
