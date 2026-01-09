// Store for managing the currently selected layer
// Layer 1 is the default layer
// Layer 2+ are for custom settings (RGB, macros, etc.)

import { writable } from 'svelte/store';

export const selectedLayer = writable<number>(1);
