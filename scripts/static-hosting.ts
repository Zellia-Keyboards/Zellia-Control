import type { Plugin } from 'vite';
import { staticHostPreview } from './static-host.mjs';

/**
 * Client-side routes (besides `/`) served as trailing-slash URLs such as `/remap/`. The host is a
 * plain static file server without rewrites (spec D19), so every route needs its own
 * `<route>/index.html` for deep links and reloads to work.
 */
export const STATIC_ROUTES = [
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

const ROUTE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Static hosting contract for the build output:
 *
 * - `vite build` emits a copy of the final `index.html` as `<route>/index.html` for each route.
 * - `vite preview` behaves like the production static host (scripts/static-host.mjs, which also
 *   serves the Svelte baseline for parity): no SPA fallback (unknown paths are 404), and a
 *   directory requested without its trailing slash redirects to it (`/remap` → `/remap/`). Deep
 *   links therefore only work because of the copies.
 *
 * The dev server keeps Vite's SPA fallback.
 */
export function staticHosting(routes: readonly string[] = STATIC_ROUTES): Plugin[] {
  for (const route of routes) {
    if (!ROUTE_NAME.test(route)) {
      throw new Error(`staticHosting: invalid route "${route}" (expected a single path segment)`);
    }
  }

  return [
    {
      name: 'zellia:static-hosting',
      // After every other plugin, so the copies match the final index.html.
      enforce: 'post',
      generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (index?.type !== 'asset') {
          this.error('staticHosting: the build did not produce index.html');
        }
        for (const route of routes) {
          this.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: index.source });
        }
      },
    },
    staticHostPreview(),
  ];
}
