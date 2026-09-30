/**
 * The app's pages, each served at `/<path>/` and lazy-loaded from its feature. The static host
 * needs an `index.html` copy per path: keep `STATIC_ROUTES` (scripts/static-hosting.ts) in sync.
 */
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

const PAGES: ReadonlySet<string> = new Set(PAGE_PATHS.map(path => `/${path}`));

/** Whether `pathname` is a page URL without its trailing slash, e.g. `/remap`. */
export function lacksTrailingSlash(pathname: string): boolean {
  return PAGES.has(pathname);
}
