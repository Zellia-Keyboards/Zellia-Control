/**
 * Navigation configuration and path helpers of the shell (port of `config/navigation.ts` and
 * `utils/layoutHelpers.ts`). Paths are listed without the trailing slash and match the page
 * itself and everything below it, so `/remap` and `/remap/` are the same page.
 */
import type { TranslationKey } from '../lib/i18n';

/** Sidebar navigation: page path and label key. */
export const NAVIGATE = [
  ['/performance', 'nav.performance'],
  ['/remap', 'nav.remap'],
  ['/lighting', 'nav.lighting'],
  ['/dynamic', 'nav.advancedkey'],
  ['/macros', 'nav.macros'],
  ['/scripts', 'nav.scripts'],
  ['/debug', 'nav.debug'],
  ['/settings', 'nav.settings'],
  ['/update', 'nav.update'],
  ['/about', 'nav.about'],
] as const satisfies readonly (readonly [string, TranslationKey])[];

/** What the connected keyboard supports, for the sidebar entries that need it. */
export interface PageSupport {
  readonly macros: boolean;
  readonly scripts: boolean;
}

/** Entries shown only while the keyboard supports their feature (macros and scripts spec). */
const REQUIRES: Readonly<Partial<Record<(typeof NAVIGATE)[number][0], keyof PageSupport>>> = {
  '/macros': 'macros',
  '/scripts': 'scripts',
};

/** The sidebar entries for a keyboard that supports `support`. */
export function navigationFor(support: PageSupport): readonly (typeof NAVIGATE)[number][] {
  return NAVIGATE.filter(([href]) => {
    const feature = REQUIRES[href];
    return feature === undefined || support[feature];
  });
}

/** Pages that use the sidebar layout. */
export const SIDEBAR_PAGES = [
  '/performance',
  '/remap',
  '/lighting',
  '/dynamic',
  '/macros',
  '/scripts',
  '/debug',
  '/settings',
  '/about',
  '/update',
  '/profiles',
] as const;

/**
 * Pages that show the layer selector. The Svelte list still named the old `/advancedkey` route;
 * Dynamic Keys edits the selected layer as well (PL-024).
 */
export const LAYER_SELECTOR_PAGES = ['/performance', '/remap', '/dynamic'] as const;

/** Pages without the toolbar and the global keyboard (matched anywhere in the path). */
export const TOOLBAR_HIDDEN_PAGES = [
  '/about',
  '/profiles',
  '/debug',
  '/settings',
  '/update',
  '/macros',
  '/scripts',
] as const;

/** Whether `pathname` is the page `href` or below it. */
export function isActivePage(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function usesSidebarLayout(pathname: string): boolean {
  return SIDEBAR_PAGES.some(page => isActivePage(pathname, page));
}

/** The sidebar layout, or the root page (connection screen). */
export function shouldShowConfiguratorLayout(pathname: string): boolean {
  return usesSidebarLayout(pathname) || pathname === '/';
}

export function shouldShowLayerSelector(pathname: string): boolean {
  return LAYER_SELECTOR_PAGES.some(page => isActivePage(pathname, page));
}

export function hidesToolbarAndKeyboard(pathname: string): boolean {
  return TOOLBAR_HIDDEN_PAGES.some(page => pathname.includes(page));
}

/** The keycap labels a page shows on the global keyboard. */
export type KeyboardLabels = 'performance' | 'remap' | 'lighting';

/**
 * Performance values, lighting modes, or the selected layer's keycodes: on Remap, on Dynamic
 * Keys (PL-023) and on the root page, which shows the keyboard only while redirecting to Remap.
 */
export function keyboardLabelsFor(pathname: string): KeyboardLabels {
  if (isActivePage(pathname, '/performance')) return 'performance';
  if (isActivePage(pathname, '/lighting')) return 'lighting';
  return 'remap';
}
