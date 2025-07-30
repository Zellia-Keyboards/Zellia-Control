/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans SC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Noto Sans SC', 'ui-monospace', 'Cascadia Code', 'Source Code Pro', 'monospace'],
      },
      colors: {
        primary: {
          50: 'color-mix(in srgb, #8B5CF6, 5%, white)',
          100: 'color-mix(in srgb, #8B5CF6, 10%, white)',
          200: 'color-mix(in srgb, #8B5CF6, 20%, white)',
          300: 'color-mix(in srgb, #8B5CF6, 30%, white)',
          400: 'color-mix(in srgb, #8B5CF6, 40%, white)',
          500: '#8B5CF6',
          600: 'color-mix(in srgb, #8B5CF6, 80%, black)',
          700: 'color-mix(in srgb, #8B5CF6, 70%, black)',
          800: 'color-mix(in srgb, #8B5CF6, 60%, black)',
          900: 'color-mix(in srgb, #8B5CF6, 50%, black)',
        },
      },
      animation: {
        'glassmorphism-pulse': 'glassmorphism-pulse 0.6s ease-out',
        'glassmorphism-activate': 'glassmorphism-activate 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'glassmorphism-content-fade-in':
          'glassmorphism-content-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        glass: '20px',
        'glass-light': '15px',
        'glass-subtle': '12px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
