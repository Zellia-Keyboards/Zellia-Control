import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    prerender: {
      handleHttpError: ({ status, path }) => {
        // Ignore errors for assets that will be provided by PWA
        if (status === 404 && (path.includes('/favicon') || path.includes('/manifest'))) {
          return;
        }
        throw new Error(`${status} ${path}`);
      },
    },
  },
  extensions: ['.svelte', '.svx'],
};

export default config;
