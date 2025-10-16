import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    tailwindcss(),
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
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
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['productivity', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    fs: {
      // Allow serving files from the src-controller directory
      allow: ['..', 'src-controller'],
    },
    watch: {
      // Ignore watching src-tauri (now removed)
      ignored: [],
    },
  },
}));
