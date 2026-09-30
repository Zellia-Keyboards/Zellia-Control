// Tailwind's engine is pinned to 4.1.10 (the version the Svelte app shipped with) for pixel
// parity. The 4.1.10 Vite plugin does not support Vite 8, so it runs through PostCSS.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
