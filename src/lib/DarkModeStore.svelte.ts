// Dark mode store for global state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define theme colors
export const themeColors = {
    indigo: '#6366F1', // Default
    red: '#EF4444',
    orange: '#F97316',
    amber: '#F59E0B',
    lime: '#84CC16',
    green: '#22C55E',
    teal: '#14B8A6',
    blue: '#3B82F6',
};

export type ThemeColorName = keyof typeof themeColors;

// Initialize dark mode as default (true)
const createDarkModeStore = () => {
    // Default to dark mode
    const defaultValue = true;
    
    // Get stored value from localStorage if in browser, otherwise use default
    const storedValue = browser ? localStorage.getItem('darkMode') : null;
    const initial = storedValue !== null ? storedValue === 'true' : defaultValue;
    
    const { subscribe, set, update } = writable<boolean>(initial);
    
    return {
        subscribe,
        toggle: () => update(n => {
            const newValue = !n;
            if (browser) {
                localStorage.setItem('darkMode', newValue.toString());
                // Apply dark class to document root
                if (newValue) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            return newValue;
        }),
        set: (value: boolean) => {
            if (browser) {
                localStorage.setItem('darkMode', value.toString());
                // Apply dark class to document root
                if (value) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            set(value);
        }
    };
};

export const darkMode = createDarkModeStore();

// Create a store for the selected theme color
const createThemeColorStore = () => {
    const defaultValue: ThemeColorName = 'indigo';
    const storedValue = browser ? localStorage.getItem('themeColor') as ThemeColorName : null;
    const initial = storedValue && themeColors[storedValue] ? storedValue : defaultValue;

    const { subscribe, set } = writable<ThemeColorName>(initial);

    return {
        subscribe,
        set: (colorName: ThemeColorName) => {
            if (browser) {
                localStorage.setItem('themeColor', colorName);
                // Apply theme color CSS variables to the document root
                Object.entries(themeColors).forEach(([name, value]) => {
                    if (name === colorName) {
                        document.documentElement.style.setProperty('--theme-color-primary', value);
                        // Generate lighter/darker shades if needed, or use Tailwind's opacity utilities
                        // For simplicity, we'll set a primary color and rely on Tailwind for shades or use direct values in components
                    }
                });
            }
            set(colorName);
        }
    };
};

export const selectedThemeColor = createThemeColorStore();

// Initialize dark class and theme color on document load if in browser
if (browser) {
    const storedDarkMode = localStorage.getItem('darkMode');
    const isDark = storedDarkMode !== null ? storedDarkMode === 'true' : true; // Default to dark
    if (isDark) {
        document.documentElement.classList.add('dark');
    }

    const storedTheme = localStorage.getItem('themeColor') as ThemeColorName;
    const currentThemeName = storedTheme && themeColors[storedTheme] ? storedTheme : 'indigo';
    if (themeColors[currentThemeName]) {
        document.documentElement.style.setProperty('--theme-color-primary', themeColors[currentThemeName]);
    }
}
