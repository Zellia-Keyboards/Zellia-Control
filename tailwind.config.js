/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Noto Sans SC', 'sans-serif'],
        'mono': ['Noto Sans SC', 'monospace'],
      },
    },
  },
  plugins: [],
}

