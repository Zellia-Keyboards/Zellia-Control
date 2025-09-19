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
        
        // Update accent color if no theme is selected
        const storedTheme = localStorage.getItem('themeColor');
        if (storedTheme === 'null' || !storedTheme || !themeColors[storedTheme as ThemeColorName]) {
          const plainColor = !isDark ? '#ffffff' : '#000000'; // Inverted because we just toggled
          document.documentElement.style.setProperty('--color-primary', plainColor);
        }
      }
    },
  };
};

export const darkMode = createDarkModeStore();

// Create a store for the selected theme color
const createThemeColorStore = () => {
  const storedValue = browser ? localStorage.getItem('themeColor') : null;
  // Allow null value for no theme (plain black/white)
  const initial: ThemeColorName | null = storedValue === 'null' || storedValue === '' ? null : 
    (storedValue && themeColors[storedValue as ThemeColorName] ? storedValue as ThemeColorName : null);

  const { subscribe, set } = writable<ThemeColorName | null>(initial);

  return {
    subscribe,
    set: (colorName: ThemeColorName | null) => {
      if (browser) {
        if (colorName === null) {
          localStorage.setItem('themeColor', 'null');
          // Set pure white/black based on current dark mode state
          const isDark = document.documentElement.classList.contains('dark');
          const plainColor = isDark ? '#ffffff' : '#000000';
          document.documentElement.style.setProperty('--color-primary', plainColor);
        } else {
          localStorage.setItem('themeColor', colorName);
          // Apply theme color CSS variables to the document root
          const selectedColor = themeColors[colorName];
          document.documentElement.style.setProperty('--color-primary', selectedColor);
        }
      }
      set(colorName);
    },
  };
};

export const selectedThemeColor = createThemeColorStore();

// Function to update theme color based on current dark mode (for when dark mode toggles)
export const updateThemeForDarkMode = () => {
  if (browser) {
    const storedTheme = localStorage.getItem('themeColor');
    if (storedTheme === 'null' || !storedTheme || !themeColors[storedTheme as ThemeColorName]) {
      // No theme selected, update to appropriate plain color
      const isDark = document.documentElement.classList.contains('dark');
      const plainColor = isDark ? '#ffffff' : '#000000';
      document.documentElement.style.setProperty('--color-primary', plainColor);
    }
  }
};

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

  const storedTheme = localStorage.getItem('themeColor');
  if (storedTheme && storedTheme !== 'null' && themeColors[storedTheme as ThemeColorName]) {
    const currentThemeName = storedTheme as ThemeColorName;
    const selectedColor = themeColors[currentThemeName];
    document.documentElement.style.setProperty('--color-primary', selectedColor);
  } else {
    // No theme selected, use pure white/black based on dark mode
    const plainColor = isDark ? '#ffffff' : '#000000';
    document.documentElement.style.setProperty('--color-primary', plainColor);
  }

  // Re-enable transitions after a brief delay to prevent flash
  setTimeout(() => {
    document.documentElement.classList.remove('no-transition');
  }, 100);

  // Always enable glassmorphism mode
  document.documentElement.classList.add('glassmorphism');
  localStorage.setItem('glassmorphismMode', 'true');
}
