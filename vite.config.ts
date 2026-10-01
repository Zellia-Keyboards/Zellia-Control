/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { STATIC_ROUTES, staticHosting } from './scripts/static-hosting.js';

const controllerEntry = fileURLToPath(new URL('./src-controller/src/index.ts', import.meta.url));
// libamp's script compiler (generated, see vendor/mqjs/PROVENANCE.md).
const mqjsEntry = fileURLToPath(new URL('./vendor/mqjs/mqjs_wasm.js', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Registered by src/lib/pwa.ts through `virtual:pwa-register`. 'prompt': a new deployment
      // waits until src/app/update-policy.ts reports the app idle (no keyboard, no flash).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'robots.txt'],
      manifest: {
        name: 'Zellia Control',
        short_name: 'Zellia',
        description: 'Configure Zellia Hall Effect keyboards with advanced customization options',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
        categories: ['productivity', 'utilities'],
      },
      workbox: {
        // No skipWaiting: an update waits and the old worker keeps serving the running page (and its
        // precached lazy chunks) until src/lib/pwa.ts applies it while idle. clientsClaim only lets
        // the very first install control the page at once (offline right after the first visit).
        clientsClaim: true,
        // Distinct from the legacy SvelteKit worker's `workbox-precache-*` caches, which the
        // public/service-worker.js kill switch deletes.
        cacheId: 'zellia-control',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2,jpg,wasm}'],
        // Route copies are identical to index.html (navigateFallback serves them offline); the
        // kill switch is only for legacy registrations.
        globIgnores: [
          '**/node_modules/**/*',
          'service-worker.js',
          ...STATIC_ROUTES.map(route => `${route}/index.html`),
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    // build/<route>/index.html copies for deep links on the static host; preview emulates it.
    staticHosting(),
  ],
  resolve: {
    alias: { 'emi-keyboard-controller': controllerEntry, 'mqjs-compiler': mqjsEntry },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/testing/setup.ts'],
          restoreMocks: true,
        },
      },
      {
        // Build tooling, Vite plugins, parity harness and the service-worker kill switch.
        test: {
          name: 'tooling',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
          restoreMocks: true,
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'controller',
          root: './src-controller',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          // Upstream test/implementation mismatch; see src-controller/UPSTREAM.md.
          exclude: ['test/device-detection.test.ts'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
    ],
  },
});
