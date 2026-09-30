/**
 * Keycap names for keycodes: a port of the Svelte app's `KeycodeDisplay.ts` (`keyCodeToString`),
 * which mirrors EMIKeyboardConfigurator. Output matches the Svelte app for every keycode, except
 * where it referenced enums that no longer exist: keyboard operations `Calibrate`, `Recovery` and
 * `Profile 0-3` and the keyboard-config names now come from `KeyboardKeycode` /
 * `KeyboardConfigCode` (the Svelte app showed "Keyboard" and an empty name for them).
 */
import {
  ConsumerKeycode,
  JoystickKeycode,
  KeyboardConfigCode,
  KeyboardKeycode,
  Keycode as EmiKeycode,
  LayerControlKeycode,
  MacroKeycode,
  MIDIKeycode,
  MouseKeycode,
  SystemRawKeycode,
} from 'emi-keyboard-controller';
import type { DynamicKeyKind, Keycode } from '../device/model/types';

export interface KeycodeDescription {
  /** Key name (bottom-left keycap label on Remap). */
  readonly main: string;
  /** Modifiers or category (top-left keycap label on Remap). */
  readonly sub: string;
}

type NameTable = Readonly<Partial<Record<number, string>>>;

const EXSEL: number = EmiKeycode.ExSel;
const TRANSPARENT: number = EmiKeycode.KeyTransparent;
const KEYBOARD_CONFIG_BASE: number = KeyboardKeycode.KeyboardConfigBase;

/** Names of the HID keycodes below `ExSel`, plus transparent. */
const HID_KEY_NAMES: NameTable = {
  [EmiKeycode.NoEvent]: 'No Event',
  [EmiKeycode.ErrorOverflow]: 'Error Overflow',
  [EmiKeycode.PostFail]: 'Post Fail',
  [EmiKeycode.ErrorUndefined]: 'Error Undefined',

  [EmiKeycode.A]: 'A',
  [EmiKeycode.B]: 'B',
  [EmiKeycode.C]: 'C',
  [EmiKeycode.D]: 'D',
  [EmiKeycode.E]: 'E',
  [EmiKeycode.F]: 'F',
  [EmiKeycode.G]: 'G',
  [EmiKeycode.H]: 'H',
  [EmiKeycode.I]: 'I',
  [EmiKeycode.J]: 'J',
  [EmiKeycode.K]: 'K',
  [EmiKeycode.L]: 'L',
  [EmiKeycode.M]: 'M',
  [EmiKeycode.N]: 'N',
  [EmiKeycode.O]: 'O',
  [EmiKeycode.P]: 'P',
  [EmiKeycode.Q]: 'Q',
  [EmiKeycode.R]: 'R',
  [EmiKeycode.S]: 'S',
  [EmiKeycode.T]: 'T',
  [EmiKeycode.U]: 'U',
  [EmiKeycode.V]: 'V',
  [EmiKeycode.W]: 'W',
  [EmiKeycode.X]: 'X',
  [EmiKeycode.Y]: 'Y',
  [EmiKeycode.Z]: 'Z',

  [EmiKeycode.Key1]: '1',
  [EmiKeycode.Key2]: '2',
  [EmiKeycode.Key3]: '3',
  [EmiKeycode.Key4]: '4',
  [EmiKeycode.Key5]: '5',
  [EmiKeycode.Key6]: '6',
  [EmiKeycode.Key7]: '7',
  [EmiKeycode.Key8]: '8',
  [EmiKeycode.Key9]: '9',
  [EmiKeycode.Key0]: '0',

  [EmiKeycode.Enter]: 'Enter',
  [EmiKeycode.Escape]: 'Escape',
  [EmiKeycode.Backspace]: 'Backspace',
  [EmiKeycode.Tab]: 'Tab',

  [EmiKeycode.Spacebar]: 'Spacebar',
  [EmiKeycode.Minus]: '-',
  [EmiKeycode.Equal]: '=',
  [EmiKeycode.LeftBrace]: '[',
  [EmiKeycode.RightBrace]: ']',
  [EmiKeycode.Backslash]: '\\',
  [EmiKeycode.NonUsHash]: '#',
  [EmiKeycode.Semicolon]: ';',
  [EmiKeycode.Apostrophe]: "'",
  [EmiKeycode.Grave]: '`',
  [EmiKeycode.Comma]: ',',
  [EmiKeycode.Dot]: '.',
  [EmiKeycode.Slash]: '/',

  [EmiKeycode.CapsLock]: 'Caps Lock',
  [EmiKeycode.F1]: 'F1',
  [EmiKeycode.F2]: 'F2',
  [EmiKeycode.F3]: 'F3',
  [EmiKeycode.F4]: 'F4',
  [EmiKeycode.F5]: 'F5',
  [EmiKeycode.F6]: 'F6',
  [EmiKeycode.F7]: 'F7',
  [EmiKeycode.F8]: 'F8',
  [EmiKeycode.F9]: 'F9',
  [EmiKeycode.F10]: 'F10',
  [EmiKeycode.F11]: 'F11',
  [EmiKeycode.F12]: 'F12',
  [EmiKeycode.PrintScreen]: 'Print Screen',
  [EmiKeycode.ScrollLock]: 'Scroll Lock',
  [EmiKeycode.Pause]: 'Pause',

  [EmiKeycode.Insert]: 'Insert',
  [EmiKeycode.Home]: 'Home',
  [EmiKeycode.PageUp]: 'Page Up',
  [EmiKeycode.Delete]: 'Delete',
  [EmiKeycode.End]: 'End',
  [EmiKeycode.PageDown]: 'Page Down',
  [EmiKeycode.RightArrow]: '→',
  [EmiKeycode.LeftArrow]: '←',
  [EmiKeycode.DownArrow]: '↓',
  [EmiKeycode.UpArrow]: '↑',

  [EmiKeycode.NumLock]: 'Num Lock',
  [EmiKeycode.KeypadDivide]: 'Keypad /',
  [EmiKeycode.KeypadMultiply]: 'Keypad *',
  [EmiKeycode.KeypadMinus]: 'Keypad -',
  [EmiKeycode.KeypadPlus]: 'Keypad +',
  [EmiKeycode.KeypadEnter]: 'Keypad Enter',
  [EmiKeycode.Keypad1]: 'Keypad 1',
  [EmiKeycode.Keypad2]: 'Keypad 2',
  [EmiKeycode.Keypad3]: 'Keypad 3',
  [EmiKeycode.Keypad4]: 'Keypad 4',
  [EmiKeycode.Keypad5]: 'Keypad 5',
  [EmiKeycode.Keypad6]: 'Keypad 6',
  [EmiKeycode.Keypad7]: 'Keypad 7',
  [EmiKeycode.Keypad8]: 'Keypad 8',
  [EmiKeycode.Keypad9]: 'Keypad 9',
  [EmiKeycode.Keypad0]: 'Keypad 0',
  [EmiKeycode.KeypadDot]: 'Keypad .',

  [EmiKeycode.NonUsBackslash]: 'Non US Backslash',
  [EmiKeycode.Application]: 'Application',
  [EmiKeycode.Power]: 'Power',
  [EmiKeycode.KeypadEqual]: 'Keypad =',

  [EmiKeycode.F13]: 'F13',
  [EmiKeycode.F14]: 'F14',
  [EmiKeycode.F15]: 'F15',
  [EmiKeycode.F16]: 'F16',
  [EmiKeycode.F17]: 'F17',
  [EmiKeycode.F18]: 'F18',
  [EmiKeycode.F19]: 'F19',
  [EmiKeycode.F20]: 'F20',
  [EmiKeycode.F21]: 'F21',
  [EmiKeycode.F22]: 'F22',
  [EmiKeycode.F23]: 'F23',
  [EmiKeycode.F24]: 'F24',

  [EmiKeycode.Execute]: 'Execute',
  [EmiKeycode.Help]: 'Help',
  [EmiKeycode.Menu]: 'Menu',
  [EmiKeycode.Select]: 'Select',
  [EmiKeycode.Stop]: 'Stop',
  [EmiKeycode.Again]: 'Again',
  [EmiKeycode.Undo]: 'Undo',
  [EmiKeycode.Cut]: 'Cut',
  [EmiKeycode.Copy]: 'Copy',
  [EmiKeycode.Paste]: 'Paste',
  [EmiKeycode.Find]: 'Find',
  [EmiKeycode.Mute]: 'Mute',
  [EmiKeycode.VolumeUp]: 'Volume Up',
  [EmiKeycode.VolumeDown]: 'Volume Down',

  [EmiKeycode.LockingCapsLock]: 'Locking Caps Lock',
  [EmiKeycode.LockingNumLock]: 'Locking Num Lock',
  [EmiKeycode.LockingScrollLock]: 'Locking Scroll Lock',

  [EmiKeycode.KeypadComma]: 'Keypad ,',
  [EmiKeycode.KeypadEqualSign]: 'Keypad =',
  [EmiKeycode.Intl1]: 'Intl1',
  [EmiKeycode.Intl2]: 'Intl2',
  [EmiKeycode.Intl3]: 'Intl3',
  [EmiKeycode.Intl4]: 'Intl4',
  [EmiKeycode.Intl5]: 'Intl5',
  [EmiKeycode.Intl6]: 'Intl6',
  [EmiKeycode.Intl7]: 'Intl7',
  [EmiKeycode.Intl8]: 'Intl8',
  [EmiKeycode.Intl9]: 'Intl9',
  [EmiKeycode.Lang1]: 'Lang1',
  [EmiKeycode.Lang2]: 'Lang2',
  [EmiKeycode.Lang3]: 'Lang3',
  [EmiKeycode.Lang4]: 'Lang4',
  [EmiKeycode.Lang5]: 'Lang5',
  [EmiKeycode.Lang6]: 'Lang6',
  [EmiKeycode.Lang7]: 'Lang7',
  [EmiKeycode.Lang8]: 'Lang8',
  [EmiKeycode.Lang9]: 'Lang9',

  [EmiKeycode.AlternateErase]: 'Alternate Erase',
  [EmiKeycode.SysReqAttention]: 'SysReq Attention',
  [EmiKeycode.Cancel]: 'Cancel',
  [EmiKeycode.Clear]: 'Clear',
  [EmiKeycode.Prior]: 'Prior',
  [EmiKeycode.Return]: 'Return',
  [EmiKeycode.Separator]: 'Separator',
  [EmiKeycode.Out]: 'Out',
  [EmiKeycode.Oper]: 'Oper',
  [EmiKeycode.ClearAgain]: 'Clear Again',
  [EmiKeycode.CrSelProps]: 'CrSel Props',

  [EmiKeycode.KeyTransparent]: '∇',
};

/** Modifier names by bit (`KeyModifier` = `1 << bit`). */
const MODIFIER_NAMES = [
  'Left Ctrl',
  'Left Shift',
  'Left Alt',
  'Left GUI',
  'Right Ctrl',
  'Right Shift',
  'Right Alt',
  'Right GUI',
] as const;

const MOUSE_NAMES = {
  [MouseKeycode.MouseLButton]: 'Mouse Left Button',
  [MouseKeycode.MouseRButton]: 'Mouse Right Button',
  [MouseKeycode.MouseMButton]: 'Mouse Middle Button',
  [MouseKeycode.MouseForward]: 'Mouse Forward',
  [MouseKeycode.MouseBack]: 'Mouse Back',
  [MouseKeycode.MouseWheelUp]: 'Mouse Wheel Up',
  [MouseKeycode.MouseWheelDown]: 'Mouse Wheel Down',
  [MouseKeycode.MouseWheelLeft]: 'Mouse Wheel Left',
  [MouseKeycode.MouseWheelRight]: 'Mouse Wheel Right',
  [MouseKeycode.MouseMoveUp]: 'Mouse Move Up',
  [MouseKeycode.MouseMoveDown]: 'Mouse Move Down',
  [MouseKeycode.MouseMoveLeft]: 'Mouse Move Left',
  [MouseKeycode.MouseMoveRight]: 'Mouse Move Right',
} satisfies Record<MouseKeycode, string>;

/** Keyboard operations; `KeyboardConfigBase` starts the config range and has no name. */
const KEYBOARD_OPERATION_NAMES = {
  [KeyboardKeycode.KeyboardReboot]: 'Reboot',
  [KeyboardKeycode.KeyboardFactoryReset]: 'Factory Reset',
  [KeyboardKeycode.KeyboardSave]: 'Save to flash',
  [KeyboardKeycode.KeyboardBootloader]: 'Jump to Bootloader',
  [KeyboardKeycode.KeyboardResetToDefault]: 'Reset to Default',
  [KeyboardKeycode.KeyboardRgbBrightnessUp]: 'Brightness Up',
  [KeyboardKeycode.KeyboardRgbBrightnessDown]: 'Brightness Down',
  [KeyboardKeycode.KeyboardCalibrate]: 'Calibrate',
  [KeyboardKeycode.KeyboardRecovery]: 'Recovery',
  [KeyboardKeycode.KeyboardProfile0]: 'Profile 0',
  [KeyboardKeycode.KeyboardProfile1]: 'Profile 1',
  [KeyboardKeycode.KeyboardProfile2]: 'Profile 2',
  [KeyboardKeycode.KeyboardProfile3]: 'Profile 3',
} satisfies Record<Exclude<KeyboardKeycode, KeyboardKeycode.KeyboardConfigBase>, string>;

const KEYBOARD_CONFIG_NAMES = {
  [KeyboardConfigCode.KeyboardConfigDebug]: 'Debug',
  [KeyboardConfigCode.KeyboardConfigNkro]: 'NKRO',
  [KeyboardConfigCode.KeyboardConfigWinlock]: 'Winlock',
  [KeyboardConfigCode.KeyboardConfigContinousPoll]: 'Continous poll',
  [KeyboardConfigCode.KeyboardConfigEnableReport]: 'Enable Report',
  [KeyboardConfigCode.KeyboardConfigConsole]: 'Console',
  [KeyboardConfigCode.KeyboardConfigNum]: 'Num',
} satisfies Record<KeyboardConfigCode, string>;

/** Keyboard-config action by `sub >> 6` (action 3 has no label). */
const KEYBOARD_CONFIG_ACTION_NAMES = ['Turn off', 'Turn on', 'Toggle', ''] as const;

const LAYER_CONTROL_NAMES = {
  [LayerControlKeycode.LayerMomentary]: 'Temporarily switch to',
  [LayerControlKeycode.LayerTurnOn]: 'Turn on',
  [LayerControlKeycode.LayerTurnOff]: 'Turn off',
  [LayerControlKeycode.LayerToggle]: 'Toggle',
} satisfies Record<LayerControlKeycode, string>;

const JOYSTICK_NAMES = {
  [JoystickKeycode.JoystickButton]: 'Joystick Button',
  [JoystickKeycode.JoystickPositive]: 'Positive',
  [JoystickKeycode.JoystickNegative]: 'Negative',
  [JoystickKeycode.JoystickWhole]: 'Whole',
  [JoystickKeycode.JoystickWholeInvert]: 'Whole Invert',
} satisfies Record<JoystickKeycode, string>;

const CONSUMER_NAMES = {
  [ConsumerKeycode.ConsumerSnapshot]: 'Snapshot',
  [ConsumerKeycode.ConsumerBrightnessUp]: 'Brightness Up',
  [ConsumerKeycode.ConsumerBrightnessDown]: 'Brightness Down',
  [ConsumerKeycode.ConsumerTransportRecord]: 'Record',
  [ConsumerKeycode.ConsumerTransportFastForward]: 'Fast Forward',
  [ConsumerKeycode.ConsumerTransportRewind]: 'Rewind',
  [ConsumerKeycode.ConsumerTransportNextTrack]: 'Next Track',
  [ConsumerKeycode.ConsumerTransportPrevTrack]: 'Previous Track',
  [ConsumerKeycode.ConsumerTransportStop]: 'Stop',
  [ConsumerKeycode.ConsumerTransportEject]: 'Eject',
  [ConsumerKeycode.ConsumerTransportRandomPlay]: 'Random Play',
  [ConsumerKeycode.ConsumerTransportStopEject]: 'Stop and Eject',
  [ConsumerKeycode.ConsumerTransportPlayPause]: 'Play/Pause',
  [ConsumerKeycode.ConsumerAudioMute]: 'Mute',
  [ConsumerKeycode.ConsumerAudioVolUp]: 'Volume Up',
  [ConsumerKeycode.ConsumerAudioVolDown]: 'Volume Down',
  [ConsumerKeycode.ConsumerAlCcConfig]: 'Consumer Control Configuration',
  [ConsumerKeycode.ConsumerAlEmail]: 'Email',
  [ConsumerKeycode.ConsumerAlCalculator]: 'Calculator',
  [ConsumerKeycode.ConsumerAlLocalBrowser]: 'Local Browser',
  [ConsumerKeycode.ConsumerAlLock]: 'Lock',
  [ConsumerKeycode.ConsumerAlControlPanel]: 'Control Panel',
  [ConsumerKeycode.ConsumerAlAssistant]: 'Assistant',
  [ConsumerKeycode.ConsumerAlKeyboardLayout]: 'Keyboard Layout',
  [ConsumerKeycode.ConsumerAcNew]: 'New',
  [ConsumerKeycode.ConsumerAcOpen]: 'Open',
  [ConsumerKeycode.ConsumerAcClose]: 'Close',
  [ConsumerKeycode.ConsumerAcExit]: 'Exit',
  [ConsumerKeycode.ConsumerAcMaximize]: 'Maximize',
  [ConsumerKeycode.ConsumerAcMinimize]: 'Minimize',
  [ConsumerKeycode.ConsumerAcSave]: 'Save',
  [ConsumerKeycode.ConsumerAcPrint]: 'Print',
  [ConsumerKeycode.ConsumerAcProperties]: 'Properties',
  [ConsumerKeycode.ConsumerAcUndo]: 'Undo',
  [ConsumerKeycode.ConsumerAcCopy]: 'Copy',
  [ConsumerKeycode.ConsumerAcCut]: 'Cut',
  [ConsumerKeycode.ConsumerAcPaste]: 'Paste',
  [ConsumerKeycode.ConsumerAcSelectAll]: 'Select All',
  [ConsumerKeycode.ConsumerAcFind]: 'Find',
  [ConsumerKeycode.ConsumerAcSearch]: 'Search',
  [ConsumerKeycode.ConsumerAcHome]: 'Home',
  [ConsumerKeycode.ConsumerAcBack]: 'Back',
  [ConsumerKeycode.ConsumerAcForward]: 'Forward',
  [ConsumerKeycode.ConsumerAcStop]: 'Stop',
  [ConsumerKeycode.ConsumerAcRefresh]: 'Refresh',
  [ConsumerKeycode.ConsumerAcBookmarks]: 'Bookmarks',
  [ConsumerKeycode.ConsumerAcNextKeyboardLayoutSelect]: 'Next Keyboard Layout',
  [ConsumerKeycode.ConsumerAcDesktopShowAllWindows]: 'Show All Windows',
  [ConsumerKeycode.ConsumerAcSoftKeyLeft]: 'Soft Key Left',
} satisfies Record<ConsumerKeycode, string>;

const SYSTEM_NAMES = {
  [SystemRawKeycode.SystemPowerDown]: 'Power Down',
  [SystemRawKeycode.SystemSleep]: 'Sleep',
  [SystemRawKeycode.SystemWakeUp]: 'Wake Up',
  [SystemRawKeycode.SystemRestart]: 'Restart',
  [SystemRawKeycode.SystemDisplayToggleIntExt]: 'Display Toggle Int Ext',
} satisfies Record<SystemRawKeycode, string>;

const MACRO_NAMES = {
  [MacroKeycode.MacroEnd]: 'End',
  [MacroKeycode.MacroRecordingStart]: 'Start Recording',
  [MacroKeycode.MacroRecordingStop]: 'Stop Recording',
  [MacroKeycode.MacroRecordingToggle]: 'Toggle Recording',
  [MacroKeycode.MacroPlayingStartOnce]: 'Start Playing Once',
  [MacroKeycode.MacroPlayingStartCircularly]: 'Start Playing Circularly',
  [MacroKeycode.MacroPlayingStartOnceNoGap]: 'Start Playing Once No Gap',
  [MacroKeycode.MacroPlayingStartCircularlyNoGap]: 'Start Playing Circularly No Gap',
  [MacroKeycode.MacroPlayingStop]: 'Stop Playing',
  [MacroKeycode.MacroPlayingPause]: 'Pause Playing',
  [MacroKeycode.MacroBegin]: '',
} satisfies Record<MacroKeycode, string>;

const MIDI_NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/** Keycap name per dynamic-key kind (Svelte `DynamicKeyToKeyName`). */
export const DYNAMIC_KEY_KIND_NAMES: Readonly<Record<DynamicKeyKind, string>> = {
  none: 'None',
  stroke: 'Dynamic Key Stroke',
  modTap: 'Mod Tap',
  toggle: 'Toggle Key',
  mutex: 'Mutex',
};

const nameOf = (table: NameTable, key: number): string | undefined => table[key];

/** Names of the modifier bits set in the keycode's sub-code, each followed by a space. */
function modifierNames(modifier: number): string {
  return MODIFIER_NAMES.filter((_, bit) => (modifier & (1 << bit)) !== 0)
    .map(name => `${name} `)
    .join('');
}

type Describer = (modifier: number) => KeycodeDescription;

/** Keycodes at or above `ExSel` (except transparent), by low byte. Others describe as empty. */
const DESCRIBERS: Readonly<Partial<Record<number, Describer>>> = {
  [EmiKeycode.MouseCollection]: m => ({ main: nameOf(MOUSE_NAMES, m) ?? 'Mouse', sub: '' }),
  [EmiKeycode.LayerControl]: m => ({
    main: `Layer${m & 0x0f}`,
    sub: nameOf(LAYER_CONTROL_NAMES, (m >> 4) & 0x0f) ?? '',
  }),
  [EmiKeycode.KeyboardOperation]: m => {
    const low = m & 0x3f;
    if (low < KEYBOARD_CONFIG_BASE) {
      // Looked up by the full sub-code, like the Svelte code (high bits make it "Keyboard").
      return { main: nameOf(KEYBOARD_OPERATION_NAMES, m) ?? 'Keyboard', sub: '' };
    }
    return {
      main: nameOf(KEYBOARD_CONFIG_NAMES, low - KEYBOARD_CONFIG_BASE) ?? '',
      sub: KEYBOARD_CONFIG_ACTION_NAMES[(m >> 6) & 0x03] ?? '',
    };
  },
  [EmiKeycode.KeyUser]: m => ({ main: `User ${m}`, sub: '' }),
  [EmiKeycode.DynamicKey]: m => ({ main: String(m), sub: 'Dynamic Key' }),
  [EmiKeycode.ConsumerCollection]: m => ({
    main: nameOf(CONSUMER_NAMES, m) ?? 'Consumer',
    sub: '',
  }),
  [EmiKeycode.SystemCollection]: m => ({ main: nameOf(SYSTEM_NAMES, m) ?? 'System', sub: '' }),
  [EmiKeycode.JoystickCollection]: m => ({
    main: `${nameOf(JOYSTICK_NAMES, (m >> 5) & 0x0f) ?? ''}${m & 0x1f}`,
    sub: 'Joystick',
  }),
  [EmiKeycode.MIDICollection]: m => ({ main: MIDIKeycode[m] ?? String(m), sub: 'MIDI' }),
  [EmiKeycode.MIDINote]: m => ({
    main: `${MIDI_NOTE_NAMES[m % 12] ?? ''}${(m - (m % 12)) / 12}`,
    sub: 'MIDI Note',
  }),
  [EmiKeycode.MacroCollection]: m => ({
    main: `${nameOf(MACRO_NAMES, (m >> 4) & 0x0f) ?? ''}${m & 0x0f}`,
    sub: 'Macro',
  }),
};

/** Keycap name and sub-label of a keycode (Svelte `keyCodeToString`). */
export function describeKeycode(keycode: Keycode): KeycodeDescription {
  const modifier = (keycode >> 8) & 0xff;
  const code = keycode & 0xff;
  if (code < EXSEL || code === TRANSPARENT) {
    return { main: nameOf(HID_KEY_NAMES, code) ?? '', sub: modifierNames(modifier) };
  }
  return DESCRIBERS[code]?.(modifier) ?? { main: '', sub: '' };
}
