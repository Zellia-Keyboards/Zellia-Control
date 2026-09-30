import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { AppShell } from './layout/AppShell';
import { NotFound } from './layout/NotFound';
import { HomePage, PageLoading, RouteError } from './layout/RoutePlaceholders';
import { PAGE_PATHS, type PagePath } from './pages';

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

/**
 * The route table: the shell (`AppShell`) at `/` with every page as a lazy child route. Paths are
 * matched case-sensitively; the shell redirects page URLs to their trailing-slash form.
 */
export function createAppRoutes(pages: PageLoaders = APP_PAGES): RouteObject[] {
  return [
    {
      path: '/',
      Component: AppShell,
      ErrorBoundary: RouteError,
      children: [
        { index: true, Component: HomePage },
        ...PAGE_PATHS.map((path): RouteObject => ({
          path,
          caseSensitive: true,
          HydrateFallback: PageLoading,
          lazy: async () => ({ Component: await pages[path]() }),
        })),
        { path: '*', Component: NotFound },
      ],
    },
  ];
}
