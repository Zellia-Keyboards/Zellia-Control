/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const controllerEntry = fileURLToPath(new URL('./src-controller/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2,jpg}'],
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
  ],
  resolve: {
    alias: { 'emi-keyboard-controller': controllerEntry },
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
