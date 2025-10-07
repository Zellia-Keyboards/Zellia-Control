import { writable } from 'svelte/store';

// Advanced key configuration types
export enum DKSAction {
  HOLD = 0,
  PRESS = 1,
  RELEASE = 2,
  TAP = 3,
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

// Dynamic Keystroke Configuration type
export type DynamicKeystrokeConfiguration = {
  type: 'dynamic';
  keycodes: string[];
  bitmap: DKSAction[][];
  bottomOutPoint: number;
};

// Key Action type for individual key actions
export type KeyAction = {
  id: string;
  name: string;
  category: string;
};

// Global configurations type
export type GlobalConfigurations = Record<string, KeyConfiguration>;

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

// Key actions database - organized into 4 sections matching remap pages
export const keyActions: KeyAction[] = [
  // Basic - Standard Keyboard Keys (grouped by function type)
  
  // Special Keys
  { id: 'KC_ESC', name: 'Esc', category: 'Basic' },
  { id: 'KC_NO', name: 'None', category: 'Basic' },
  
  // Function Keys (F1-F24)
  { id: 'KC_F1', name: 'F1', category: 'Basic' },
  { id: 'KC_F2', name: 'F2', category: 'Basic' },
  { id: 'KC_F3', name: 'F3', category: 'Basic' },
  { id: 'KC_F4', name: 'F4', category: 'Basic' },
  { id: 'KC_F5', name: 'F5', category: 'Basic' },
  { id: 'KC_F6', name: 'F6', category: 'Basic' },
  { id: 'KC_F7', name: 'F7', category: 'Basic' },
  { id: 'KC_F8', name: 'F8', category: 'Basic' },
  { id: 'KC_F9', name: 'F9', category: 'Basic' },
  { id: 'KC_F10', name: 'F10', category: 'Basic' },
  { id: 'KC_F11', name: 'F11', category: 'Basic' },
  { id: 'KC_F12', name: 'F12', category: 'Basic' },
  { id: 'KC_F13', name: 'F13', category: 'Basic' },
  { id: 'KC_F14', name: 'F14', category: 'Basic' },
  { id: 'KC_F15', name: 'F15', category: 'Basic' },
  { id: 'KC_F16', name: 'F16', category: 'Basic' },
  { id: 'KC_F17', name: 'F17', category: 'Basic' },
  { id: 'KC_F18', name: 'F18', category: 'Basic' },
  { id: 'KC_F19', name: 'F19', category: 'Basic' },
  { id: 'KC_F20', name: 'F20', category: 'Basic' },
  { id: 'KC_F21', name: 'F21', category: 'Basic' },
  { id: 'KC_F22', name: 'F22', category: 'Basic' },
  { id: 'KC_F23', name: 'F23', category: 'Basic' },
  { id: 'KC_F24', name: 'F24', category: 'Basic' },
  
  // Numbers (0-9)
  { id: 'KC_1', name: '1', category: 'Basic' },
  { id: 'KC_2', name: '2', category: 'Basic' },
  { id: 'KC_3', name: '3', category: 'Basic' },
  { id: 'KC_4', name: '4', category: 'Basic' },
  { id: 'KC_5', name: '5', category: 'Basic' },
  { id: 'KC_6', name: '6', category: 'Basic' },
  { id: 'KC_7', name: '7', category: 'Basic' },
  { id: 'KC_8', name: '8', category: 'Basic' },
  { id: 'KC_9', name: '9', category: 'Basic' },
  { id: 'KC_0', name: '0', category: 'Basic' },
  
  // Letters (A-Z)
  { id: 'KC_A', name: 'A', category: 'Basic' },
  { id: 'KC_B', name: 'B', category: 'Basic' },
  { id: 'KC_C', name: 'C', category: 'Basic' },
  { id: 'KC_D', name: 'D', category: 'Basic' },
  { id: 'KC_E', name: 'E', category: 'Basic' },
  { id: 'KC_F', name: 'F', category: 'Basic' },
  { id: 'KC_G', name: 'G', category: 'Basic' },
  { id: 'KC_H', name: 'H', category: 'Basic' },
  { id: 'KC_I', name: 'I', category: 'Basic' },
  { id: 'KC_J', name: 'J', category: 'Basic' },
  { id: 'KC_K', name: 'K', category: 'Basic' },
  { id: 'KC_L', name: 'L', category: 'Basic' },
  { id: 'KC_M', name: 'M', category: 'Basic' },
  { id: 'KC_N', name: 'N', category: 'Basic' },
  { id: 'KC_O', name: 'O', category: 'Basic' },
  { id: 'KC_P', name: 'P', category: 'Basic' },
  { id: 'KC_Q', name: 'Q', category: 'Basic' },
  { id: 'KC_R', name: 'R', category: 'Basic' },
  { id: 'KC_S', name: 'S', category: 'Basic' },
  { id: 'KC_T', name: 'T', category: 'Basic' },
  { id: 'KC_U', name: 'U', category: 'Basic' },
  { id: 'KC_V', name: 'V', category: 'Basic' },
  { id: 'KC_W', name: 'W', category: 'Basic' },
  { id: 'KC_X', name: 'X', category: 'Basic' },
  { id: 'KC_Y', name: 'Y', category: 'Basic' },
  { id: 'KC_Z', name: 'Z', category: 'Basic' },
  
  // Symbols & Punctuation
  { id: 'KC_GRV', name: '~', category: 'Basic' },
  { id: 'KC_MINS', name: '-', category: 'Basic' },
  { id: 'KC_EQL', name: '=', category: 'Basic' },
  { id: 'KC_LBRC', name: '[', category: 'Basic' },
  { id: 'KC_RBRC', name: ']', category: 'Basic' },
  { id: 'KC_BSLS', name: '\\', category: 'Basic' },
  { id: 'KC_SCLN', name: ';', category: 'Basic' },
  { id: 'KC_QUOT', name: "'", category: 'Basic' },
  { id: 'KC_COMM', name: ',', category: 'Basic' },
  { id: 'KC_DOT', name: '.', category: 'Basic' },
  { id: 'KC_SLSH', name: '/', category: 'Basic' },
  
  // Navigation & Editing
  { id: 'KC_INS', name: 'Insert', category: 'Basic' },
  { id: 'KC_DEL', name: 'Delete', category: 'Basic' },
  { id: 'KC_HOME', name: 'Home', category: 'Basic' },
  { id: 'KC_END', name: 'End', category: 'Basic' },
  { id: 'KC_PGUP', name: 'PgUp', category: 'Basic' },
  { id: 'KC_PGDN', name: 'PgDn', category: 'Basic' },
  { id: 'KC_UP', name: '↑', category: 'Basic' },
  { id: 'KC_DOWN', name: '↓', category: 'Basic' },
  { id: 'KC_LEFT', name: '←', category: 'Basic' },
  { id: 'KC_RGHT', name: '→', category: 'Basic' },
  
  // Modifier & Control Keys
  { id: 'KC_LCTL', name: 'Left Ctrl', category: 'Basic' },
  { id: 'KC_RCTL', name: 'Right Ctrl', category: 'Basic' },
  { id: 'KC_LSFT', name: 'Left Shift', category: 'Basic' },
  { id: 'KC_RSFT', name: 'Right Shift', category: 'Basic' },
  { id: 'KC_LALT', name: 'Left Alt', category: 'Basic' },
  { id: 'KC_RALT', name: 'Right Alt', category: 'Basic' },
  { id: 'KC_LGUI', name: 'Left Win', category: 'Basic' },
  { id: 'KC_RGUI', name: 'Right Win', category: 'Basic' },
  { id: 'KC_TAB', name: 'Tab', category: 'Basic' },
  { id: 'KC_CAPS', name: 'Caps Lock', category: 'Basic' },
  { id: 'KC_BSPC', name: 'Backspace', category: 'Basic' },
  { id: 'KC_ENT', name: 'Enter', category: 'Basic' },
  { id: 'KC_SPC', name: 'Space', category: 'Basic' },
  { id: 'KC_APP', name: 'Menu', category: 'Basic' },
  { id: 'KC_PSCR', name: 'Print Screen', category: 'Basic' },
  { id: 'KC_SCRL', name: 'Scroll Lock', category: 'Basic' },
  { id: 'KC_PAUS', name: 'Pause', category: 'Basic' },
  
  // Numpad
  { id: 'KC_NUM', name: 'Num Lock', category: 'Basic' },
  { id: 'KC_PSLS', name: 'KP /', category: 'Basic' },
  { id: 'KC_PAST', name: 'KP *', category: 'Basic' },
  { id: 'KC_PMNS', name: 'KP -', category: 'Basic' },
  { id: 'KC_PPLS', name: 'KP +', category: 'Basic' },
  { id: 'KC_PENT', name: 'KP Enter', category: 'Basic' },
  { id: 'KC_P0', name: 'KP 0', category: 'Basic' },
  { id: 'KC_P1', name: 'KP 1', category: 'Basic' },
  { id: 'KC_P2', name: 'KP 2', category: 'Basic' },
  { id: 'KC_P3', name: 'KP 3', category: 'Basic' },
  { id: 'KC_P4', name: 'KP 4', category: 'Basic' },
  { id: 'KC_P5', name: 'KP 5', category: 'Basic' },
  { id: 'KC_P6', name: 'KP 6', category: 'Basic' },
  { id: 'KC_P7', name: 'KP 7', category: 'Basic' },
  { id: 'KC_P8', name: 'KP 8', category: 'Basic' },
  { id: 'KC_P9', name: 'KP 9', category: 'Basic' },
  { id: 'KC_PDOT', name: 'KP .', category: 'Basic' },
  
  // International Keys
  { id: 'KC_NUHS', name: 'Non-US #', category: 'Basic' },
  { id: 'KC_NUBS', name: 'Non-US \\', category: 'Basic' },
  { id: 'KC_INT5', name: '無変換', category: 'Basic' },
  { id: 'KC_INT4', name: '変換', category: 'Basic' },
  { id: 'KC_INT2', name: 'カタカナひらがな', category: 'Basic' },
  { id: 'KC_LNG1', name: 'IME On', category: 'Basic' },
  { id: 'KC_LNG2', name: 'IME Off', category: 'Basic' },

  // Layer - Layer Control (from Layer.svelte) - sorted by type
  { id: 'MO(1)', name: 'MO(1)', category: 'Layer' },
  { id: 'MO(2)', name: 'MO(2)', category: 'Layer' },
  { id: 'MO(3)', name: 'MO(3)', category: 'Layer' },
  { id: 'TO(0)', name: 'TO(0)', category: 'Layer' },
  { id: 'TO(1)', name: 'TO(1)', category: 'Layer' },
  { id: 'TO(2)', name: 'TO(2)', category: 'Layer' },
  { id: 'TO(3)', name: 'TO(3)', category: 'Layer' },
  { id: 'TG(0)', name: 'TG(0)', category: 'Layer' },
  { id: 'TG(1)', name: 'TG(1)', category: 'Layer' },
  { id: 'TG(2)', name: 'TG(2)', category: 'Layer' },
  { id: 'TG(3)', name: 'TG(3)', category: 'Layer' },
  { id: 'TT(0)', name: 'TT(0)', category: 'Layer' },
  { id: 'TT(1)', name: 'TT(1)', category: 'Layer' },
  { id: 'TT(2)', name: 'TT(2)', category: 'Layer' },
  { id: 'TT(3)', name: 'TT(3)', category: 'Layer' },

  // System - Media, Special, Extension (from System.svelte & Extension.svelte) - sorted by type
  // Special keys first
  { id: 'KC_TRNS', name: 'Transparent', category: 'System' },
  { id: 'KC_NO', name: 'None', category: 'System' },
  
  // Brightness
  { id: 'KC_BRID', name: 'BRT-', category: 'System' },
  { id: 'KC_BRIU', name: 'BRT+', category: 'System' },
  
  // Volume
  { id: 'KC_VOLD', name: 'Vol-', category: 'System' },
  { id: 'KC_VOLU', name: 'Vol+', category: 'System' },
  { id: 'KC_MUTE', name: 'Mute', category: 'System' },
  
  // Media Controls
  { id: 'KC_MPLY', name: 'Play/Pause', category: 'System' },
  { id: 'KC_MSTP', name: 'Stop', category: 'System' },
  { id: 'KC_MPRV', name: 'Prev', category: 'System' },
  { id: 'KC_MNXT', name: 'Next', category: 'System' },
  
  // Applications
  { id: 'KC_MAIL', name: 'Email', category: 'System' },
  { id: 'KC_CALC', name: 'Calculator', category: 'System' },
  { id: 'KC_MYCM', name: 'Explorer', category: 'System' },
  
  // Browser Controls
  { id: 'KC_WSCH', name: 'Search', category: 'System' },
  { id: 'KC_WHOM', name: 'Home', category: 'System' },
  { id: 'KC_WBAK', name: 'Back', category: 'System' },
  { id: 'KC_WFWD', name: 'Forward', category: 'System' },
  { id: 'KC_WREF', name: 'Refresh', category: 'System' },
  { id: 'KC_WFAV', name: 'Bookmarks', category: 'System' },

  // Mouse - Mouse Buttons and Movement (from Extension.svelte) - sorted by type
  // Mouse Buttons
  { id: 'KC_MS_L', name: 'Mouse Left', category: 'Mouse' },
  { id: 'KC_MS_R', name: 'Mouse Right', category: 'Mouse' },
  { id: 'KC_MS_M', name: 'Mouse Middle', category: 'Mouse' },
  { id: 'KC_MS_B4', name: 'Mouse Forward', category: 'Mouse' },
  { id: 'KC_MS_B5', name: 'Mouse Back', category: 'Mouse' },
  
  // Mouse Wheel
  { id: 'KC_WH_U', name: 'Wheel Up', category: 'Mouse' },
  { id: 'KC_WH_D', name: 'Wheel Down', category: 'Mouse' },
  { id: 'KC_WH_L', name: 'Wheel Left', category: 'Mouse' },
  { id: 'KC_WH_R', name: 'Wheel Right', category: 'Mouse' },
  
  // Mouse Movement
  { id: 'KC_MS_U', name: 'Move Up', category: 'Mouse' },
  { id: 'KC_MS_D', name: 'Move Down', category: 'Mouse' },
  { id: 'KC_MS_L2', name: 'Move Left', category: 'Mouse' },
  { id: 'KC_MS_R2', name: 'Move Right', category: 'Mouse' },
];
