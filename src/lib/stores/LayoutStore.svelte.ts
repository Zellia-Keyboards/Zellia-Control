import { writable } from 'svelte/store';

// Store for the keyboard layout JSON
export const keyboardLayout = writable<string>('[]');
