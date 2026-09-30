/**
 * Test helpers for the shell: renders the app's routes in a memory router, with stand-in pages
 * (each renders "<path> page") unless real loaders are given, and resets the shared stores the
 * shell touches.
 */
import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { deviceSession } from '../../features/device';
import { setFirmwareUpdateActive } from '../../features/firmware-update';
import {
  INITIAL_KEY_SELECTION,
  keySelectionStore,
  layoutOptionsStore,
} from '../../features/keyboard';
import { DEFAULT_LAYOUT_OPTIONS } from '../../features/keyboard/model';
import { setLanguage } from '../../lib/i18n';
import { bootstrapTheme, setThemeColor } from '../../lib/theme';
import type { PageLoader, PageLoaders, PagePath } from '../pages';
import { createAppRoutes } from '../routes';

function standInPage(path: PagePath): PageLoader {
  return () => {
    function StandInPage() {
      return <p data-testid="page">{path} page</p>;
    }
    return Promise.resolve(StandInPage);
  };
}

/** Pages that render "<path> page", so tests see which page the shell shows. */
export function standInPages(): PageLoaders {
  return {
    remap: standInPage('remap'),
    performance: standInPage('performance'),
    lighting: standInPage('lighting'),
    dynamic: standInPage('dynamic'),
    debug: standInPage('debug'),
    settings: standInPage('settings'),
    update: standInPage('update'),
    about: standInPage('about'),
    profiles: standInPage('profiles'),
  };
}

export interface RenderedApp extends RenderResult {
  readonly router: ReturnType<typeof createMemoryRouter>;
}

export function renderApp(path = '/', pages: PageLoaders = standInPages()): RenderedApp {
  const router = createMemoryRouter(createAppRoutes(pages), { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

/** The current location of `router` as a URL path with search and hash. */
export function currentPath(router: RenderedApp['router']): string {
  const { pathname, search, hash } = router.state.location;
  return `${pathname}${search}${hash}`;
}

/** Restores the shell's shared state; call after each test. */
export function resetShellState(): void {
  deviceSession.disconnect();
  setFirmwareUpdateActive(false);
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
  layoutOptionsStore.setState(DEFAULT_LAYOUT_OPTIONS, true);
  setLanguage('en');
  setThemeColor(null);
  // Forget the preferences, then apply the defaults as the app does on start (dark mode).
  localStorage.clear();
  bootstrapTheme();
}
