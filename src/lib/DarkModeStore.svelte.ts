// Dark mode store for global state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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

// Initialize dark class on document load if in browser
if (browser) {
    const storedValue = localStorage.getItem('darkMode');
    const isDark = storedValue !== null ? storedValue === 'true' : true; // Default to dark
    if (isDark) {
        document.documentElement.classList.add('dark');
    }
}
