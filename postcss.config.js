import { fileURLToPath } from 'node:url';

// Tailwind's engine is pinned to 4.1.10 (the version the Svelte app shipped with) for pixel
// parity. The 4.1.10 Vite plugin does not support Vite 8, so it runs through PostCSS.
//
// Class candidates are detected in the app sources only (`base`), so tooling, tests and docs never
// add utilities or theme variables to the app stylesheet.
export default {
  plugins: {
    '@tailwindcss/postcss': { base: fileURLToPath(new URL('./src', import.meta.url)) },
  },
};
