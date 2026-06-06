import { writable } from 'svelte/store';

export type ToolbarDropdownId = 'profile' | 'layout';

export const activeToolbarDropdown = writable<ToolbarDropdownId | null>(null);
