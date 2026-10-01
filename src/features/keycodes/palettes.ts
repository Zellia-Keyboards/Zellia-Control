/**
 * The five Remap tabs (Basic, System, Layer, Profile, Extension). Labels, order and rows are
 * exactly those of the Svelte tab components; keycodes are built with the shared constructors.
 * Encodings differ from the Svelte app only where it assigned the wrong keycode: PF(0-3), the
 * inert profile placeholders and "NKRO Toggle" (spec D8), and the joystick axis keys.
 */
import {
  ConsumerKeycode,
  JoystickKeycode,
  KeyboardConfigCode,
  KeyboardKeycode,
  Keycode as EmiKeycode,
  KeyModifier,
  LayerControlKeycode,
  MacroKeycode,
  MouseKeycode,
  ScriptKeycode,
} from 'emi-keyboard-controller';
import type { TranslationKey } from '../../lib/i18n/en';
import type { Keycode } from '../device/model/types';
import { kc } from './codec';

export interface PaletteKey {
  /** Button text; may contain `\n` (rendered with `whitespace-pre-line`). */
  readonly label: string;
  /** `null` = placeholder without a firmware equivalent: shown, but assigns nothing (D8). */
  readonly keycode: Keycode | null;
}

export interface RemapPalettes {
  /** Rows as laid out by the Basic tab (main block rows, numpad, international, F13-F24). */
  readonly basic: readonly (readonly PaletteKey[])[];
  readonly system: readonly PaletteKey[];
  readonly layer: readonly PaletteKey[];
  readonly profile: readonly PaletteKey[];
  readonly extension: readonly PaletteKey[];
}

const key = (label: string, code: EmiKeycode): PaletteKey => ({ label, keycode: kc.key(code) });
const modifier = (label: string, mask: KeyModifier): PaletteKey => ({
  label,
  keycode: kc.modifier(mask),
});
const layer = (label: string, op: LayerControlKeycode, n: number): PaletteKey => ({
  label,
  keycode: kc.layer(op, n),
});
const consumer = (label: string, sub: ConsumerKeycode): PaletteKey => ({
  label,
  keycode: kc.consumer(sub),
});
const mouse = (label: string, sub: MouseKeycode): PaletteKey => ({ label, keycode: kc.mouse(sub) });
/** Joystick keycode sub-code: `JoystickKeycode` kind in bits 5..7, button/axis index below. */
const joystick = (label: string, kind: JoystickKeycode, index: number): PaletteKey => ({
  label,
  keycode: kc.joystick((kind << 5) | index),
});
const operation = (label: string, op: KeyboardKeycode): PaletteKey => ({
  label,
  keycode: kc.keyboardOperation(op),
});
const inert = (label: string): PaletteKey => ({ label, keycode: null });

const { LayerMomentary, LayerTurnOn, LayerTurnOff, LayerToggle } = LayerControlKeycode;

export const REMAP_PALETTES: RemapPalettes = {
  basic: [
    [
      key('Esc', EmiKeycode.Escape),
      key('F1', EmiKeycode.F1),
      key('F2', EmiKeycode.F2),
      key('F3', EmiKeycode.F3),
      key('F4', EmiKeycode.F4),
      key('F5', EmiKeycode.F5),
      key('F6', EmiKeycode.F6),
      key('F7', EmiKeycode.F7),
      key('F8', EmiKeycode.F8),
      key('F9', EmiKeycode.F9),
      key('F10', EmiKeycode.F10),
      key('F11', EmiKeycode.F11),
      key('F12', EmiKeycode.F12),
      key('None', EmiKeycode.NoEvent),
      key('Print\nScreen', EmiKeycode.PrintScreen),
      key('Scroll\nLock', EmiKeycode.ScrollLock),
      key('Pause\nBreak', EmiKeycode.Pause),
    ],
    [
      key('~', EmiKeycode.Grave),
      key('1', EmiKeycode.Key1),
      key('2', EmiKeycode.Key2),
      key('3', EmiKeycode.Key3),
      key('4', EmiKeycode.Key4),
      key('5', EmiKeycode.Key5),
      key('6', EmiKeycode.Key6),
      key('7', EmiKeycode.Key7),
      key('8', EmiKeycode.Key8),
      key('9', EmiKeycode.Key9),
      key('0', EmiKeycode.Key0),
      key('-', EmiKeycode.Minus),
      key('=', EmiKeycode.Equal),
      key('Backspace', EmiKeycode.Backspace),
      key('Insert', EmiKeycode.Insert),
      key('Home', EmiKeycode.Home),
      key('PgUp', EmiKeycode.PageUp),
    ],
    [
      key('Tab', EmiKeycode.Tab),
      key('Q', EmiKeycode.Q),
      key('W', EmiKeycode.W),
      key('E', EmiKeycode.E),
      key('R', EmiKeycode.R),
      key('T', EmiKeycode.T),
      key('Y', EmiKeycode.Y),
      key('U', EmiKeycode.U),
      key('I', EmiKeycode.I),
      key('O', EmiKeycode.O),
      key('P', EmiKeycode.P),
      key('[', EmiKeycode.LeftBrace),
      key(']', EmiKeycode.RightBrace),
      key('\\', EmiKeycode.Backslash),
      key('Delete', EmiKeycode.Delete),
      key('End', EmiKeycode.End),
      key('PgDn', EmiKeycode.PageDown),
    ],
    [
      key('Caps Lock', EmiKeycode.CapsLock),
      key('A', EmiKeycode.A),
      key('S', EmiKeycode.S),
      key('D', EmiKeycode.D),
      key('F', EmiKeycode.F),
      key('G', EmiKeycode.G),
      key('H', EmiKeycode.H),
      key('J', EmiKeycode.J),
      key('K', EmiKeycode.K),
      key('L', EmiKeycode.L),
      key(';', EmiKeycode.Semicolon),
      key("'", EmiKeycode.Apostrophe),
      key('Enter', EmiKeycode.Enter),
    ],
    [
      modifier('L Shift', KeyModifier.KeyLeftShift),
      key('Z', EmiKeycode.Z),
      key('X', EmiKeycode.X),
      key('C', EmiKeycode.C),
      key('V', EmiKeycode.V),
      key('B', EmiKeycode.B),
      key('N', EmiKeycode.N),
      key('M', EmiKeycode.M),
      key(',', EmiKeycode.Comma),
      key('.', EmiKeycode.Dot),
      key('/', EmiKeycode.Slash),
      modifier('R Shift', KeyModifier.KeyRightShift),
      key('↑', EmiKeycode.UpArrow),
    ],
    [
      modifier('L Ctrl', KeyModifier.KeyLeftCtrl),
      modifier('L Win', KeyModifier.KeyLeftGui),
      modifier('L Alt', KeyModifier.KeyLeftAlt),
      key('Space', EmiKeycode.Spacebar),
      modifier('R Alt', KeyModifier.KeyRightAlt),
      layer('Fn', LayerMomentary, 1),
      key('Menu', EmiKeycode.Application),
      modifier('R Ctrl', KeyModifier.KeyRightCtrl),
      key('←', EmiKeycode.LeftArrow),
      key('↓', EmiKeycode.DownArrow),
      key('→', EmiKeycode.RightArrow),
    ],
    [
      key('Num Lock', EmiKeycode.NumLock),
      key('/', EmiKeycode.KeypadDivide),
      key('*', EmiKeycode.KeypadMultiply),
      key('-', EmiKeycode.KeypadMinus),
      key('=', EmiKeycode.KeypadEqual),
      key('7\nHome', EmiKeycode.Keypad7),
      key('↑\n8', EmiKeycode.Keypad8),
      key('9\nPgUp', EmiKeycode.Keypad9),
      key('+', EmiKeycode.KeypadPlus),
      key('4 ←', EmiKeycode.Keypad4),
      key('5', EmiKeycode.Keypad5),
      key('→ 6', EmiKeycode.Keypad6),
      key('1\nEnd', EmiKeycode.Keypad1),
      key('2\n↓', EmiKeycode.Keypad2),
      key('3\nPgDn', EmiKeycode.Keypad3),
      key('Enter', EmiKeycode.KeypadEnter),
      key('0\nIns', EmiKeycode.Keypad0),
      key('.\nDel', EmiKeycode.KeypadDot),
    ],
    [
      key('Non-US =~', EmiKeycode.KeypadEqual),
      key('Non-US \\:', EmiKeycode.NonUsHash),
      key('\\', EmiKeycode.NonUsBackslash),
      key('|', EmiKeycode.Backslash),
      key('.', EmiKeycode.Dot),
      key('無変換', EmiKeycode.Intl5), // No conversion
      key('変換', EmiKeycode.Intl4), // Conversion
      key('カタカナひらがな', EmiKeycode.Intl2), // Katakana Hiragana
      key('ImeOn', EmiKeycode.Lang1),
      key('ImeOff', EmiKeycode.Lang2),
    ],
    [
      key('F13', EmiKeycode.F13),
      key('F14', EmiKeycode.F14),
      key('F15', EmiKeycode.F15),
      key('F16', EmiKeycode.F16),
      key('F17', EmiKeycode.F17),
      key('F18', EmiKeycode.F18),
      key('F19', EmiKeycode.F19),
      key('F20', EmiKeycode.F20),
      key('F21', EmiKeycode.F21),
      key('F22', EmiKeycode.F22),
      key('F23', EmiKeycode.F23),
      key('F24', EmiKeycode.F24),
    ],
  ],
  system: [
    consumer('BRT-', ConsumerKeycode.ConsumerBrightnessDown),
    consumer('BRT+', ConsumerKeycode.ConsumerBrightnessUp),
    consumer('Vol-', ConsumerKeycode.ConsumerAudioVolDown),
    consumer('Vol+', ConsumerKeycode.ConsumerAudioVolUp),
    consumer('Mute', ConsumerKeycode.ConsumerAudioMute),
    consumer('Play\nPause', ConsumerKeycode.ConsumerTransportPlayPause),
    consumer('Stop', ConsumerKeycode.ConsumerTransportStop),
    consumer('Prev', ConsumerKeycode.ConsumerTransportPrevTrack),
    consumer('Next', ConsumerKeycode.ConsumerTransportNextTrack),
    consumer('Email', ConsumerKeycode.ConsumerAlEmail),
    consumer('Calculator', ConsumerKeycode.ConsumerAlCalculator),
    consumer('Explorer', ConsumerKeycode.ConsumerAlLocalBrowser),
    consumer('Media\nPlayer', ConsumerKeycode.ConsumerTransportPlayPause),
    consumer('Control\nPanel', ConsumerKeycode.ConsumerAlControlPanel),
    consumer('Search', ConsumerKeycode.ConsumerAcSearch),
    consumer('Home', ConsumerKeycode.ConsumerAcHome),
    consumer('Back', ConsumerKeycode.ConsumerAcBack),
    consumer('Forward', ConsumerKeycode.ConsumerAcForward),
    consumer('Stop', ConsumerKeycode.ConsumerTransportStop),
    consumer('Refresh', ConsumerKeycode.ConsumerAcRefresh),
    consumer('Bookmarks', ConsumerKeycode.ConsumerAcBookmarks),
    consumer('Snapshot', ConsumerKeycode.ConsumerSnapshot),
    consumer('Record', ConsumerKeycode.ConsumerTransportRecord),
  ],
  layer: [
    layer('MO(1)', LayerMomentary, 1),
    layer('MO(2)', LayerMomentary, 2),
    layer('MO(3)', LayerMomentary, 3),
    layer('TO(0)', LayerTurnOn, 0),
    layer('TO(1)', LayerTurnOn, 1),
    layer('TO(2)', LayerTurnOn, 2),
    layer('TO(3)', LayerTurnOn, 3),
    layer('TG(0)', LayerToggle, 0),
    layer('TG(1)', LayerToggle, 1),
    layer('TG(2)', LayerToggle, 2),
    layer('TG(3)', LayerToggle, 3),
    // libamp has no tap-toggle; the Svelte tab assigned "TT" to turn-off, kept for parity.
    layer('TT(0)', LayerTurnOff, 0),
    layer('TT(1)', LayerTurnOff, 1),
    layer('TT(2)', LayerTurnOff, 2),
    layer('TT(3)', LayerTurnOff, 3),
  ],
  profile: [
    { label: 'PF(0)', keycode: kc.profile(0) },
    { label: 'PF(1)', keycode: kc.profile(1) },
    { label: 'PF(2)', keycode: kc.profile(2) },
    { label: 'PF(3)', keycode: kc.profile(3) },
    inert('↔ PF'),
    inert('↔ PF1'),
    inert('→ PF'),
    inert('← PF'),
  ],
  extension: [
    // Mouse buttons
    mouse('Mouse\nLeft', MouseKeycode.MouseLButton),
    mouse('Mouse\nRight', MouseKeycode.MouseRButton),
    mouse('Mouse\nMiddle', MouseKeycode.MouseMButton),
    mouse('Mouse\nForward', MouseKeycode.MouseForward),
    mouse('Mouse\nBack', MouseKeycode.MouseBack),
    // Mouse wheel
    mouse('Wheel\nUp', MouseKeycode.MouseWheelUp),
    mouse('Wheel\nDown', MouseKeycode.MouseWheelDown),
    mouse('Wheel\nLeft', MouseKeycode.MouseWheelLeft),
    mouse('Wheel\nRight', MouseKeycode.MouseWheelRight),
    // Mouse movement
    mouse('Move\nUp', MouseKeycode.MouseMoveUp),
    mouse('Move\nDown', MouseKeycode.MouseMoveDown),
    mouse('Move\nLeft', MouseKeycode.MouseMoveLeft),
    mouse('Move\nRight', MouseKeycode.MouseMoveRight),
    // Joystick controls: button 0 and axis 0 (X)
    joystick('Joy\nButton', JoystickKeycode.JoystickButton, 0),
    joystick('Joy\nPositive', JoystickKeycode.JoystickPositive, 0),
    joystick('Joy\nNegative', JoystickKeycode.JoystickNegative, 0),
    // Keyboard operations ("Recovery" keeps its Svelte meaning: jump to bootloader, D8)
    operation('Reboot', KeyboardKeycode.KeyboardReboot),
    operation('Recovery', KeyboardKeycode.KeyboardBootloader),
    operation('Reset', KeyboardKeycode.KeyboardFactoryReset),
    {
      label: 'NKRO\nToggle',
      keycode: kc.keyboardConfig('toggle', KeyboardConfigCode.KeyboardConfigNkro),
    },
    // Special keys
    { label: 'Transparent', keycode: kc.transparent },
    { label: 'Dynamic\nKey', keycode: kc.dynamicKey(0) },
  ],
};

/** A key of the Extension tab's Macro and Script groups; its label is translated. */
export interface GroupPaletteKey {
  readonly label: TranslationKey;
  readonly keycode: Keycode;
}

/** Each macro slot's keys (libamp `MacroKeycode`), in column order. */
const MACRO_KEYS: readonly (readonly [MacroKeycode, TranslationKey])[] = [
  [MacroKeycode.MacroRecordingStart, 'remap.macroRecordStart'],
  [MacroKeycode.MacroRecordingStop, 'remap.macroRecordStop'],
  [MacroKeycode.MacroRecordingToggle, 'remap.macroRecordToggle'],
  [MacroKeycode.MacroPlayingStartOnce, 'remap.macroPlayOnce'],
  [MacroKeycode.MacroPlayingStartCircularly, 'remap.macroPlayLoop'],
  [MacroKeycode.MacroPlayingStartOnceNoGap, 'remap.macroPlayOnceNoGap'],
  [MacroKeycode.MacroPlayingStartCircularlyNoGap, 'remap.macroPlayLoopNoGap'],
  [MacroKeycode.MacroPlayingStop, 'remap.macroStop'],
  [MacroKeycode.MacroPlayingPause, 'remap.macroPause'],
];

/** The Macro group: one row of keys per macro slot (0-based). */
export function macroPalette(slots: number): readonly (readonly GroupPaletteKey[])[] {
  return Array.from({ length: slots }, (_, slot) =>
    MACRO_KEYS.map(([op, label]) => ({ label, keycode: kc.macro(op, slot) }))
  );
}

/** The Script group (libamp `ScriptKeycode`). */
export const SCRIPT_PALETTE: readonly GroupPaletteKey[] = [
  { label: 'remap.scriptWatch', keycode: kc.script(ScriptKeycode.ScriptWatch) },
  { label: 'remap.scriptStart', keycode: kc.script(ScriptKeycode.ScriptStart) },
  { label: 'remap.scriptStop', keycode: kc.script(ScriptKeycode.ScriptStop) },
  { label: 'remap.scriptSuspend', keycode: kc.script(ScriptKeycode.ScriptSuspend) },
  { label: 'remap.scriptRestart', keycode: kc.script(ScriptKeycode.ScriptRestart) },
  { label: 'remap.scriptToggle', keycode: kc.script(ScriptKeycode.ScriptToggle) },
];
