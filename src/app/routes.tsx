import type { RouteObject } from 'react-router';
import { AppShell } from './layout/AppShell';
import { NotFound } from './layout/NotFound';
import { HomePage, PageLoading, RouteError } from './layout/RoutePlaceholders';
import { APP_PAGES, PAGE_PATHS, type PageLoaders } from './pages';

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
