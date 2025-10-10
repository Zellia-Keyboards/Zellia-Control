import { SIDEBAR_PAGES, LAYER_SELECTOR_PAGES } from '$lib/config/navigation';

/**
 * Check if the current path should use the sidebar layout
 */
export function usesSidebarLayout(pathname: string): boolean {
  return SIDEBAR_PAGES.some(
    sidebarPage => pathname === sidebarPage || pathname.startsWith(sidebarPage + '/')
  );
}

/**
 * Check if the current path should show the configurator layout
 * (sidebar layout or root page)
 */
export function shouldShowConfiguratorLayout(pathname: string): boolean {
  return usesSidebarLayout(pathname) || pathname === '/';
}

/**
 * Check if the current path should show the layer selector
 */
export function shouldShowLayerSelector(pathname: string): boolean {
  return LAYER_SELECTOR_PAGES.some(
    page => pathname === page || pathname.startsWith(page + '/')
  );
}

/**
 * Check if a given href is the active page
 */
export function isActivePage(currentPath: string, href: string): boolean {
  return currentPath === href || currentPath.startsWith(href + '/');
}
