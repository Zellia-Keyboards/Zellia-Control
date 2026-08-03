import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

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

/** Joins a URL path below `root`, or returns null for malformed or escaping paths. */
function safeJoin(root: string, urlPath: string, file: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const joined = path.join(root, decoded, file);
  return joined.startsWith(root + path.sep) ? joined : null;
}

/**
 * Static hosting contract for the build output:
 *
 * - `vite build` emits a copy of the final `index.html` as `<route>/index.html` for each route.
 * - `vite preview` behaves like the production static host: no SPA fallback (unknown paths are
 *   404), and a directory requested without its trailing slash redirects to it (`/remap` →
 *   `/remap/`), as common static servers do. Deep links therefore only work because of the copies.
 *
 * The dev server keeps Vite's SPA fallback.
 */
export function staticHosting(routes: readonly string[] = STATIC_ROUTES): Plugin {
  for (const route of routes) {
    if (!ROUTE_NAME.test(route)) {
      throw new Error(`staticHosting: invalid route "${route}" (expected a single path segment)`);
    }
  }
  let outDir = '';

  return {
    name: 'zellia:static-hosting',
    enforce: 'post',
    config(_config, env) {
      return env.isPreview ? { appType: 'mpa' } : undefined;
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') {
        this.error('staticHosting: the build did not produce index.html');
      }
      for (const route of routes) {
        this.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: index.source });
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const isRead = req.method === 'GET' || req.method === 'HEAD';
        if (isRead && !url.pathname.endsWith('/') && path.extname(url.pathname) === '') {
          const directoryIndex = safeJoin(outDir, url.pathname, 'index.html');
          if (directoryIndex !== null && existsSync(directoryIndex)) {
            res.statusCode = 301;
            res.setHeader('Location', `${url.pathname}/${url.search}`);
            res.end();
            return;
          }
        }
        next();
      });
    },
  };
}
