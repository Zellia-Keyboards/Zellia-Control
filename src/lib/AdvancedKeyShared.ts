import { writable } from 'svelte/store';

// Advanced key configuration types
export enum DKSAction {
    HOLD = 0,
    PRESS = 1,
    RELEASE = 2,
    TAP = 3
}

export type KeyConfiguration = {
    type: string;
    tapAction?: string;
    holdAction?: string;
    holdDelay?: number;
    toggleAction?: string;
    toggleMode?: string;
    toggleState?: boolean;
    keycodes?: string[];
    bitmap?: DKSAction[][];
    bottomOutPoint?: number;
};

// Global configuration store
export const globalConfigurations = writable<Record<string, KeyConfiguration>>({});

// Update global configuration
export function updateGlobalConfiguration(keyId: string, config: KeyConfiguration): void {
    globalConfigurations.update(configs => {
        configs[keyId] = config;
        return configs;
    });
}

// Reset global configuration
export function resetGlobalConfiguration(keyId: string): void {
    globalConfigurations.update(configs => {
        delete configs[keyId];
        return configs;
    });
}

// Key actions database
export const keyActions = [
    { id: 'KC_NO', name: 'None', category: 'Special' },
    { id: 'a', name: 'A', category: 'Letter' },
    { id: 'b', name: 'B', category: 'Letter' },
    { id: 'c', name: 'C', category: 'Letter' },
    { id: 'd', name: 'D', category: 'Letter' },
    { id: 'e', name: 'E', category: 'Letter' },
    { id: 'f', name: 'F', category: 'Letter' },
    { id: 'g', name: 'G', category: 'Letter' },
    { id: 'h', name: 'H', category: 'Letter' },
    { id: 'i', name: 'I', category: 'Letter' },
    { id: 'j', name: 'J', category: 'Letter' },
    { id: 'k', name: 'K', category: 'Letter' },
    { id: 'l', name: 'L', category: 'Letter' },
    { id: 'm', name: 'M', category: 'Letter' },
    { id: 'n', name: 'N', category: 'Letter' },
    { id: 'o', name: 'O', category: 'Letter' },
    { id: 'p', name: 'P', category: 'Letter' },
    { id: 'q', name: 'Q', category: 'Letter' },
    { id: 'r', name: 'R', category: 'Letter' },
    { id: 's', name: 'S', category: 'Letter' },
    { id: 't', name: 'T', category: 'Letter' },
    { id: 'u', name: 'U', category: 'Letter' },
    { id: 'v', name: 'V', category: 'Letter' },
    { id: 'w', name: 'W', category: 'Letter' },
    { id: 'x', name: 'X', category: 'Letter' },
    { id: 'y', name: 'Y', category: 'Letter' },
    { id: 'z', name: 'Z', category: 'Letter' },
    { id: '1', name: '1', category: 'Number' },
    { id: '2', name: '2', category: 'Number' },
    { id: '3', name: '3', category: 'Number' },
    { id: '4', name: '4', category: 'Number' },
    { id: '5', name: '5', category: 'Number' },
    { id: '6', name: '6', category: 'Number' },
    { id: '7', name: '7', category: 'Number' },
    { id: '8', name: '8', category: 'Number' },
    { id: '9', name: '9', category: 'Number' },
    { id: '0', name: '0', category: 'Number' },
    { id: 'ctrl', name: 'Ctrl', category: 'Modifier' },
    { id: 'shift', name: 'Shift', category: 'Modifier' },
    { id: 'alt', name: 'Alt', category: 'Modifier' },
    { id: 'win', name: 'Win', category: 'Modifier' },
    { id: 'caps', name: 'Caps Lock', category: 'Special' },
    { id: 'num', name: 'Num Lock', category: 'Special' },
    { id: 'scroll', name: 'Scroll Lock', category: 'Special' },
    { id: 'space', name: 'Space', category: 'Special' },
    { id: 'enter', name: 'Enter', category: 'Special' },
    { id: 'tab', name: 'Tab', category: 'Special' },
    { id: 'esc', name: 'Escape', category: 'Special' },
    { id: 'backspace', name: 'Backspace', category: 'Special' },
    { id: 'f1', name: 'F1', category: 'Function' },
    { id: 'f2', name: 'F2', category: 'Function' },
    { id: 'f3', name: 'F3', category: 'Function' },
    { id: 'f4', name: 'F4', category: 'Function' },
    { id: 'f5', name: 'F5', category: 'Function' },
    { id: 'f6', name: 'F6', category: 'Function' },
    { id: 'f7', name: 'F7', category: 'Function' },
    { id: 'f8', name: 'F8', category: 'Function' },
    { id: 'f9', name: 'F9', category: 'Function' },
    { id: 'f10', name: 'F10', category: 'Function' },
    { id: 'f11', name: 'F11', category: 'Function' },
    { id: 'f12', name: 'F12', category: 'Function' }
];