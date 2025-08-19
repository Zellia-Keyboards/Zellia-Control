// Dark mode store for global state management with Tailwind CSS integration
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define theme colors with enhanced visibility for dark mode
export const themeColors = {
  indigo: '#8B5CF6', // Enhanced indigo for better dark mode visibility
  red: '#F87171', // Lighter red for dark mode
  orange: '#FB923C', // Lighter orange
  amber: '#FCD34D', // Lighter amber
  lime: '#A3E635', // Brighter lime
  green: '#4ADE80', // Lighter green
  teal: '#2DD4BF', // Lighter teal
  blue: '#0e9dec', // Alipay blue
};

export type ThemeColorName = keyof typeof themeColors;

// Initialize dark mode as default (true)
const createDarkModeStore = () => {
  // Get stored value from localStorage if in browser, otherwise use OS preference
  const storedValue = browser ? localStorage.getItem('darkMode') : null;
  const osPrefersDark = browser ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  const defaultValue = storedValue !== null ? storedValue === 'true' : osPrefersDark;

  if (defaultValue) {
    // If dark mode is enabled, add the dark class to the document root
    document.documentElement.classList.add('dark');
  } else {
    // If dark mode is not enabled, ensure the dark class is removed
    document.documentElement.classList.remove('dark');
  }
  return {
    toggle: () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
      if (browser) {
        localStorage.setItem('darkMode', (!isDark).toString());
      }
    },
  };
};

export const darkMode = createDarkModeStore();

// Create a store for the selected theme color
const createThemeColorStore = () => {
  const defaultValue: ThemeColorName = 'indigo';
  const storedValue = browser ? (localStorage.getItem('themeColor') as ThemeColorName) : null;
  const initial = storedValue && themeColors[storedValue] ? storedValue : defaultValue;

  const { subscribe, set } = writable<ThemeColorName>(initial);

  return {
    subscribe,
    set: (colorName: ThemeColorName) => {
      if (browser) {
        localStorage.setItem('themeColor', colorName);
        // Apply theme color CSS variables to the document root with smooth transition
        const selectedColor = themeColors[colorName];

        // Apply the new theme colors
        document.documentElement.style.setProperty('--color-primary', selectedColor);

        // Force a repaint to ensure immediate theme color application
        document.documentElement.offsetHeight;
      }
      set(colorName);
    },
  };
};

export const selectedThemeColor = createThemeColorStore();

// Create a store for glassmorphism mode
const createGlassmorphismStore = () => {
  // Always enable glassmorphism mode by default
  const initial = true;
  const { subscribe, set, update } = writable<boolean>(initial);

  if (browser) {
    document.documentElement.classList.add('glassmorphism');
    localStorage.setItem('glassmorphismMode', 'true');
  }

  return {
    subscribe,
    toggle: () => {
      // Prevent disabling glassmorphism
      return true;
    },
    set: (value: boolean) => {
      // Prevent disabling glassmorphism
      set(true);
      if (browser) {
        document.documentElement.classList.add('glassmorphism');
        localStorage.setItem('glassmorphismMode', 'true');
      }
    },
  };
};

export const glassmorphismMode = createGlassmorphismStore();

// Initialize dark class and theme color on document load if in browser
if (browser) {
  // Disable transitions during initial load
  document.documentElement.classList.add('no-transition');

  const storedDarkMode = localStorage.getItem('darkMode');
  const isDark = storedDarkMode !== null ? storedDarkMode === 'true' : true; // Default to dark
  if (isDark) {
    // Add Tailwind's dark class for dark mode
    document.documentElement.classList.add('dark');
  }

  const storedTheme = localStorage.getItem('themeColor') as ThemeColorName;
  const currentThemeName = storedTheme && themeColors[storedTheme] ? storedTheme : 'indigo';
  if (themeColors[currentThemeName]) {
    const selectedColor = themeColors[currentThemeName];
    document.documentElement.style.setProperty('--color-primary', selectedColor);
  }

  // Re-enable transitions after a brief delay to prevent flash
  setTimeout(() => {
    document.documentElement.classList.remove('no-transition');
  }, 100);

  // Always enable glassmorphism mode
  document.documentElement.classList.add('glassmorphism');
  localStorage.setItem('glassmorphismMode', 'true');
}
