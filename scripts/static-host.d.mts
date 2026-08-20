import type { Plugin } from 'vite';

/**
 * Vite plugin: `vite preview` of the build output behaves like the production static host (plain
 * files, no rewrites). There is no SPA fallback (unknown paths are 404), and a directory requested
 * without its trailing slash redirects to it (`/remap` → `/remap/`), as common static servers do.
 * The dev server is not affected.
 */
export declare function staticHostPreview(): Plugin;
