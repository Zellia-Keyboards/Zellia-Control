// Dark mode store for global state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define theme colors with enhanced visibility for dark mode
export const themeColors = {
    indigo: '#8B5CF6', // Enhanced indigo for better dark mode visibility
    red: '#F87171',    // Lighter red for dark mode
    orange: '#FB923C', // Lighter orange
    amber: '#FCD34D',  // Lighter amber
    lime: '#A3E635',   // Brighter lime
    green: '#4ADE80',  // Lighter green
    teal: '#2DD4BF',   // Lighter teal
    blue: '#0e9dec',   // Alipay blue
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
        subscribe,        set: (colorName: ThemeColorName) => {
            if (browser) {
                localStorage.setItem('themeColor', colorName);
                // Apply theme color CSS variables to the document root
                const selectedColor = themeColors[colorName];
                document.documentElement.style.setProperty('--theme-color-primary', selectedColor);
                
                // Create additional theme color variants for better contrast
                document.documentElement.style.setProperty('--theme-color-hover', `color-mix(in srgb, ${selectedColor} 80%, black)`);
                document.documentElement.style.setProperty('--theme-color-light', `color-mix(in srgb, ${selectedColor} 10%, white)`);
                document.documentElement.style.setProperty('--theme-color-dark', `color-mix(in srgb, ${selectedColor} 15%, black)`);
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
    }    const storedTheme = localStorage.getItem('themeColor') as ThemeColorName;
    const currentThemeName = storedTheme && themeColors[storedTheme] ? storedTheme : 'indigo';
    if (themeColors[currentThemeName]) {
        const selectedColor = themeColors[currentThemeName];
        document.documentElement.style.setProperty('--theme-color-primary', selectedColor);
        document.documentElement.style.setProperty('--theme-color-hover', `color-mix(in srgb, ${selectedColor} 80%, black)`);
        document.documentElement.style.setProperty('--theme-color-light', `color-mix(in srgb, ${selectedColor} 10%, white)`);
        document.documentElement.style.setProperty('--theme-color-dark', `color-mix(in srgb, ${selectedColor} 15%, black)`);
    }
}
