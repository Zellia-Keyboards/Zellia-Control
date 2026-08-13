// Production static host emulation for `vite preview`, shared by this app's preview
// (scripts/static-hosting.ts) and the Svelte baseline's server (scripts/parity/prepare-baseline.mjs)
// so both sides of a parity comparison are served identically. Plain JavaScript because Node runs
// prepare-baseline.mjs directly; static-host.d.mts types it for TypeScript.

import { existsSync } from 'node:fs';
import path from 'node:path';

/** Joins a URL path below `root`, or returns null for malformed or escaping paths. */
function safeJoin(root, urlPath, file) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const joined = path.join(root, decoded, file);
  return joined.startsWith(root + path.sep) ? joined : null;
}

/**
 * Vite plugin: `vite preview` of the build output behaves like the production static host (plain
 * files, no rewrites). There is no SPA fallback (unknown paths are 404), and a directory requested
 * without its trailing slash redirects to it (`/remap` → `/remap/`), as common static servers do.
 * The dev server is not affected.
 */
export function staticHostPreview() {
  let outDir = '';

  return {
    name: 'zellia:static-host-preview',
    config(_config, env) {
      return env.isPreview ? { appType: 'mpa' } : undefined;
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
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
