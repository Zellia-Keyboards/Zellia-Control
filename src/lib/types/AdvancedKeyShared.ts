import { writable } from 'svelte/store';
import { Keycode, 
         MouseKeycode, 
         ConsumerKeycode, 
         LayerControlKeycode, 
         KeyModifier } from '../../../src-controller/src/interface';

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
  keycode: Keycode | KeyModifier;
  name: string;
  category: string;
  subcode?: MouseKeycode | ConsumerKeycode | LayerControlKeycode | number;
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

// Key actions database - organized by category matching the Keycode enum
export const keyActions: KeyAction[] = [
  // Basic - Special Keys
  { keycode: Keycode.Escape, name: 'Esc', category: 'Basic' },
  { keycode: Keycode.NoEvent, name: 'None', category: 'Basic' },
  
  // Function Keys (F1-F24)
  { keycode: Keycode.F1, name: 'F1', category: 'Basic' },
  { keycode: Keycode.F2, name: 'F2', category: 'Basic' },
  { keycode: Keycode.F3, name: 'F3', category: 'Basic' },
  { keycode: Keycode.F4, name: 'F4', category: 'Basic' },
  { keycode: Keycode.F5, name: 'F5', category: 'Basic' },
  { keycode: Keycode.F6, name: 'F6', category: 'Basic' },
  { keycode: Keycode.F7, name: 'F7', category: 'Basic' },
  { keycode: Keycode.F8, name: 'F8', category: 'Basic' },
  { keycode: Keycode.F9, name: 'F9', category: 'Basic' },
  { keycode: Keycode.F10, name: 'F10', category: 'Basic' },
  { keycode: Keycode.F11, name: 'F11', category: 'Basic' },
  { keycode: Keycode.F12, name: 'F12', category: 'Basic' },
  { keycode: Keycode.F13, name: 'F13', category: 'Basic' },
  { keycode: Keycode.F14, name: 'F14', category: 'Basic' },
  { keycode: Keycode.F15, name: 'F15', category: 'Basic' },
  { keycode: Keycode.F16, name: 'F16', category: 'Basic' },
  { keycode: Keycode.F17, name: 'F17', category: 'Basic' },
  { keycode: Keycode.F18, name: 'F18', category: 'Basic' },
  { keycode: Keycode.F19, name: 'F19', category: 'Basic' },
  { keycode: Keycode.F20, name: 'F20', category: 'Basic' },
  { keycode: Keycode.F21, name: 'F21', category: 'Basic' },
  { keycode: Keycode.F22, name: 'F22', category: 'Basic' },
  { keycode: Keycode.F23, name: 'F23', category: 'Basic' },
  { keycode: Keycode.F24, name: 'F24', category: 'Basic' },
  
  // Numbers (0-9)
  { keycode: Keycode.Key1, name: '1', category: 'Basic' },
  { keycode: Keycode.Key2, name: '2', category: 'Basic' },
  { keycode: Keycode.Key3, name: '3', category: 'Basic' },
  { keycode: Keycode.Key4, name: '4', category: 'Basic' },
  { keycode: Keycode.Key5, name: '5', category: 'Basic' },
  { keycode: Keycode.Key6, name: '6', category: 'Basic' },
  { keycode: Keycode.Key7, name: '7', category: 'Basic' },
  { keycode: Keycode.Key8, name: '8', category: 'Basic' },
  { keycode: Keycode.Key9, name: '9', category: 'Basic' },
  { keycode: Keycode.Key0, name: '0', category: 'Basic' },
  
  // Letters (A-Z)
  { keycode: Keycode.A, name: 'A', category: 'Basic' },
  { keycode: Keycode.B, name: 'B', category: 'Basic' },
  { keycode: Keycode.C, name: 'C', category: 'Basic' },
  { keycode: Keycode.D, name: 'D', category: 'Basic' },
  { keycode: Keycode.E, name: 'E', category: 'Basic' },
  { keycode: Keycode.F, name: 'F', category: 'Basic' },
  { keycode: Keycode.G, name: 'G', category: 'Basic' },
  { keycode: Keycode.H, name: 'H', category: 'Basic' },
  { keycode: Keycode.I, name: 'I', category: 'Basic' },
  { keycode: Keycode.J, name: 'J', category: 'Basic' },
  { keycode: Keycode.K, name: 'K', category: 'Basic' },
  { keycode: Keycode.L, name: 'L', category: 'Basic' },
  { keycode: Keycode.M, name: 'M', category: 'Basic' },
  { keycode: Keycode.N, name: 'N', category: 'Basic' },
  { keycode: Keycode.O, name: 'O', category: 'Basic' },
  { keycode: Keycode.P, name: 'P', category: 'Basic' },
  { keycode: Keycode.Q, name: 'Q', category: 'Basic' },
  { keycode: Keycode.R, name: 'R', category: 'Basic' },
  { keycode: Keycode.S, name: 'S', category: 'Basic' },
  { keycode: Keycode.T, name: 'T', category: 'Basic' },
  { keycode: Keycode.U, name: 'U', category: 'Basic' },
  { keycode: Keycode.V, name: 'V', category: 'Basic' },
  { keycode: Keycode.W, name: 'W', category: 'Basic' },
  { keycode: Keycode.X, name: 'X', category: 'Basic' },
  { keycode: Keycode.Y, name: 'Y', category: 'Basic' },
  { keycode: Keycode.Z, name: 'Z', category: 'Basic' },
  
  // Symbols & Punctuation
  { keycode: Keycode.Grave, name: '~', category: 'Basic' },
  { keycode: Keycode.Minus, name: '-', category: 'Basic' },
  { keycode: Keycode.Equal, name: '=', category: 'Basic' },
  { keycode: Keycode.LeftBrace, name: '[', category: 'Basic' },
  { keycode: Keycode.RightBrace, name: ']', category: 'Basic' },
  { keycode: Keycode.Backslash, name: '\\', category: 'Basic' },
  { keycode: Keycode.Semicolon, name: ';', category: 'Basic' },
  { keycode: Keycode.Apostrophe, name: "'", category: 'Basic' },
  { keycode: Keycode.Comma, name: ',', category: 'Basic' },
  { keycode: Keycode.Dot, name: '.', category: 'Basic' },
  { keycode: Keycode.Slash, name: '/', category: 'Basic' },
  
  // Navigation & Editing
  { keycode: Keycode.Insert, name: 'Insert', category: 'Basic' },
  { keycode: Keycode.Delete, name: 'Delete', category: 'Basic' },
  { keycode: Keycode.Home, name: 'Home', category: 'Basic' },
  { keycode: Keycode.End, name: 'End', category: 'Basic' },
  { keycode: Keycode.PageUp, name: 'PgUp', category: 'Basic' },
  { keycode: Keycode.PageDown, name: 'PgDn', category: 'Basic' },
  { keycode: Keycode.UpArrow, name: '↑', category: 'Basic' },
  { keycode: Keycode.DownArrow, name: '↓', category: 'Basic' },
  { keycode: Keycode.LeftArrow, name: '←', category: 'Basic' },
  { keycode: Keycode.RightArrow, name: '→', category: 'Basic' },
  
  // Modifier Keys
  { keycode: KeyModifier.KeyLeftCtrl, name: 'Left Ctrl', category: 'Basic' },
  { keycode: KeyModifier.KeyRightCtrl, name: 'Right Ctrl', category: 'Basic' },
  { keycode: KeyModifier.KeyLeftShift, name: 'Left Shift', category: 'Basic' },
  { keycode: KeyModifier.KeyRightShift, name: 'Right Shift', category: 'Basic' },
  { keycode: KeyModifier.KeyLeftAlt, name: 'Left Alt', category: 'Basic' },
  { keycode: KeyModifier.KeyRightAlt, name: 'Right Alt', category: 'Basic' },
  { keycode: KeyModifier.KeyLeftGui, name: 'Left Win', category: 'Basic' },
  { keycode: KeyModifier.KeyRightGui, name: 'Right Win', category: 'Basic' },
  
  // Control Keys
  { keycode: Keycode.Tab, name: 'Tab', category: 'Basic' },
  { keycode: Keycode.CapsLock, name: 'Caps Lock', category: 'Basic' },
  { keycode: Keycode.Backspace, name: 'Backspace', category: 'Basic' },
  { keycode: Keycode.Enter, name: 'Enter', category: 'Basic' },
  { keycode: Keycode.Spacebar, name: 'Space', category: 'Basic' },
  { keycode: Keycode.Application, name: 'Menu', category: 'Basic' },
  { keycode: Keycode.PrintScreen, name: 'Print Screen', category: 'Basic' },
  { keycode: Keycode.ScrollLock, name: 'Scroll Lock', category: 'Basic' },
  { keycode: Keycode.Pause, name: 'Pause', category: 'Basic' },
  
  // Numpad
  { keycode: Keycode.NumLock, name: 'Num Lock', category: 'Basic' },
  { keycode: Keycode.KeypadDivide, name: 'KP /', category: 'Basic' },
  { keycode: Keycode.KeypadMultiply, name: 'KP *', category: 'Basic' },
  { keycode: Keycode.KeypadMinus, name: 'KP -', category: 'Basic' },
  { keycode: Keycode.KeypadPlus, name: 'KP +', category: 'Basic' },
  { keycode: Keycode.KeypadEnter, name: 'KP Enter', category: 'Basic' },
  { keycode: Keycode.Keypad0, name: 'KP 0', category: 'Basic' },
  { keycode: Keycode.Keypad1, name: 'KP 1', category: 'Basic' },
  { keycode: Keycode.Keypad2, name: 'KP 2', category: 'Basic' },
  { keycode: Keycode.Keypad3, name: 'KP 3', category: 'Basic' },
  { keycode: Keycode.Keypad4, name: 'KP 4', category: 'Basic' },
  { keycode: Keycode.Keypad5, name: 'KP 5', category: 'Basic' },
  { keycode: Keycode.Keypad6, name: 'KP 6', category: 'Basic' },
  { keycode: Keycode.Keypad7, name: 'KP 7', category: 'Basic' },
  { keycode: Keycode.Keypad8, name: 'KP 8', category: 'Basic' },
  { keycode: Keycode.Keypad9, name: 'KP 9', category: 'Basic' },
  { keycode: Keycode.KeypadDot, name: 'KP .', category: 'Basic' },
  
  // International Keys
  { keycode: Keycode.NonUsHash, name: 'Non-US #', category: 'Basic' },
  { keycode: Keycode.NonUsBackslash, name: 'Non-US \\', category: 'Basic' },
  { keycode: Keycode.Intl5, name: '無変換', category: 'Basic' },
  { keycode: Keycode.Intl4, name: '変換', category: 'Basic' },
  { keycode: Keycode.Intl2, name: 'カタカナひらがな', category: 'Basic' },
  { keycode: Keycode.Lang1, name: 'IME On', category: 'Basic' },
  { keycode: Keycode.Lang2, name: 'IME Off', category: 'Basic' },

  // Layer - Layer Control
  { keycode: Keycode.LayerControl, name: 'MO(1)', category: 'Layer', subcode: LayerControlKeycode.LayerMomentary | (1 << 8) },
  { keycode: Keycode.LayerControl, name: 'MO(2)', category: 'Layer', subcode: LayerControlKeycode.LayerMomentary | (2 << 8) },
  { keycode: Keycode.LayerControl, name: 'MO(3)', category: 'Layer', subcode: LayerControlKeycode.LayerMomentary | (3 << 8) },
  { keycode: Keycode.LayerControl, name: 'TO(0)', category: 'Layer', subcode: LayerControlKeycode.LayerTurnOn | (0 << 8) },
  { keycode: Keycode.LayerControl, name: 'TO(1)', category: 'Layer', subcode: LayerControlKeycode.LayerTurnOn | (1 << 8) },
  { keycode: Keycode.LayerControl, name: 'TO(2)', category: 'Layer', subcode: LayerControlKeycode.LayerTurnOn | (2 << 8) },
  { keycode: Keycode.LayerControl, name: 'TO(3)', category: 'Layer', subcode: LayerControlKeycode.LayerTurnOn | (3 << 8) },
  { keycode: Keycode.LayerControl, name: 'TG(0)', category: 'Layer', subcode: LayerControlKeycode.LayerToggle | (0 << 8) },
  { keycode: Keycode.LayerControl, name: 'TG(1)', category: 'Layer', subcode: LayerControlKeycode.LayerToggle | (1 << 8) },
  { keycode: Keycode.LayerControl, name: 'TG(2)', category: 'Layer', subcode: LayerControlKeycode.LayerToggle | (2 << 8) },
  { keycode: Keycode.LayerControl, name: 'TG(3)', category: 'Layer', subcode: LayerControlKeycode.LayerToggle | (3 << 8) },

  // System - Media and Consumer Controls
  { keycode: Keycode.ConsumerCollection, name: 'BRT-', category: 'System', subcode: ConsumerKeycode.ConsumerBrightnessDown },
  { keycode: Keycode.ConsumerCollection, name: 'BRT+', category: 'System', subcode: ConsumerKeycode.ConsumerBrightnessUp },
  { keycode: Keycode.ConsumerCollection, name: 'Vol-', category: 'System', subcode: ConsumerKeycode.ConsumerAudioVolDown },
  { keycode: Keycode.ConsumerCollection, name: 'Vol+', category: 'System', subcode: ConsumerKeycode.ConsumerAudioVolUp },
  { keycode: Keycode.ConsumerCollection, name: 'Mute', category: 'System', subcode: ConsumerKeycode.ConsumerAudioMute },
  { keycode: Keycode.ConsumerCollection, name: 'Play/Pause', category: 'System', subcode: ConsumerKeycode.ConsumerTransportPlayPause },
  { keycode: Keycode.ConsumerCollection, name: 'Stop', category: 'System', subcode: ConsumerKeycode.ConsumerTransportStop },
  { keycode: Keycode.ConsumerCollection, name: 'Prev', category: 'System', subcode: ConsumerKeycode.ConsumerTransportPrevTrack },
  { keycode: Keycode.ConsumerCollection, name: 'Next', category: 'System', subcode: ConsumerKeycode.ConsumerTransportNextTrack },
  { keycode: Keycode.ConsumerCollection, name: 'Email', category: 'System', subcode: ConsumerKeycode.ConsumerAlEmail },
  { keycode: Keycode.ConsumerCollection, name: 'Calculator', category: 'System', subcode: ConsumerKeycode.ConsumerAlCalculator },
  { keycode: Keycode.ConsumerCollection, name: 'Explorer', category: 'System', subcode: ConsumerKeycode.ConsumerAlLocalBrowser },

  // Mouse - Mouse Buttons and Controls
  { keycode: Keycode.MouseCollection, name: 'Mouse Left', category: 'Mouse', subcode: MouseKeycode.MouseLButton },
  { keycode: Keycode.MouseCollection, name: 'Mouse Right', category: 'Mouse', subcode: MouseKeycode.MouseRButton },
  { keycode: Keycode.MouseCollection, name: 'Mouse Middle', category: 'Mouse', subcode: MouseKeycode.MouseMButton },
  { keycode: Keycode.MouseCollection, name: 'Mouse Forward', category: 'Mouse', subcode: MouseKeycode.MouseForward },
  { keycode: Keycode.MouseCollection, name: 'Mouse Back', category: 'Mouse', subcode: MouseKeycode.MouseBack },
  { keycode: Keycode.MouseCollection, name: 'Wheel Up', category: 'Mouse', subcode: MouseKeycode.MouseWheelUp },
  { keycode: Keycode.MouseCollection, name: 'Wheel Down', category: 'Mouse', subcode: MouseKeycode.MouseWheelDown },
  { keycode: Keycode.MouseCollection, name: 'Wheel Left', category: 'Mouse', subcode: MouseKeycode.MouseWheelLeft },
  { keycode: Keycode.MouseCollection, name: 'Wheel Right', category: 'Mouse', subcode: MouseKeycode.MouseWheelRight },
  { keycode: Keycode.MouseCollection, name: 'Move Up', category: 'Mouse', subcode: MouseKeycode.MouseMoveUp },
  { keycode: Keycode.MouseCollection, name: 'Move Down', category: 'Mouse', subcode: MouseKeycode.MouseMoveDown },
  { keycode: Keycode.MouseCollection, name: 'Move Left', category: 'Mouse', subcode: MouseKeycode.MouseMoveLeft },
  { keycode: Keycode.MouseCollection, name: 'Move Right', category: 'Mouse', subcode: MouseKeycode.MouseMoveRight },

  // System - Special keys  
  { keycode: Keycode.KeyTransparent, name: 'Transparent', category: 'System' },
];
