/**
 * Browser keys (`KeyboardEvent.code`, UI Events) and mouse buttons (`MouseEvent.button`) and the
 * keycodes libamp plays for them: HID Keyboard/Keypad usages (page 0x07), libamp's modifier-only
 * keycodes (`mask << 8`) and its Mouse keycodes. Keys without a HID usage (Fn, media and browser
 * keys) are missing: the recorder skips and counts them.
 */
import { Keycode as EmiKeycode, KeyModifier, MouseKeycode } from 'emi-keyboard-controller';
import type { Keycode } from '../../device/model/types';
import { kc } from '../../keycodes';

type Entry = readonly [code: string, usage: number];

const LETTERS = Array.from({ length: 26 }, (_, index): Entry => [
  `Key${String.fromCharCode(0x41 + index)}`,
  EmiKeycode.A + index,
]);

const DIGITS: readonly Entry[] = [
  ...Array.from({ length: 9 }, (_, index): Entry => [`Digit${index + 1}`, EmiKeycode.Key1 + index]),
  ['Digit0', EmiKeycode.Key0],
];

const FUNCTION_KEYS: readonly Entry[] = [
  ...Array.from({ length: 12 }, (_, index): Entry => [`F${index + 1}`, EmiKeycode.F1 + index]),
  ...Array.from({ length: 12 }, (_, index): Entry => [`F${index + 13}`, EmiKeycode.F13 + index]),
];

const NUMPAD_DIGITS: readonly Entry[] = [
  ...Array.from({ length: 9 }, (_, index): Entry => [
    `Numpad${index + 1}`,
    EmiKeycode.Keypad1 + index,
  ]),
  ['Numpad0', EmiKeycode.Keypad0],
];

const OTHER_KEYS: readonly Entry[] = [
  ['Enter', EmiKeycode.Enter],
  ['Escape', EmiKeycode.Escape],
  ['Backspace', EmiKeycode.Backspace],
  ['Tab', EmiKeycode.Tab],
  ['Space', EmiKeycode.Spacebar],
  ['Minus', EmiKeycode.Minus],
  ['Equal', EmiKeycode.Equal],
  ['BracketLeft', EmiKeycode.LeftBrace],
  ['BracketRight', EmiKeycode.RightBrace],
  ['Backslash', EmiKeycode.Backslash],
  ['Semicolon', EmiKeycode.Semicolon],
  ['Quote', EmiKeycode.Apostrophe],
  ['Backquote', EmiKeycode.Grave],
  ['Comma', EmiKeycode.Comma],
  ['Period', EmiKeycode.Dot],
  ['Slash', EmiKeycode.Slash],
  ['CapsLock', EmiKeycode.CapsLock],
  ['PrintScreen', EmiKeycode.PrintScreen],
  ['ScrollLock', EmiKeycode.ScrollLock],
  ['Pause', EmiKeycode.Pause],
  ['Insert', EmiKeycode.Insert],
  ['Home', EmiKeycode.Home],
  ['PageUp', EmiKeycode.PageUp],
  ['Delete', EmiKeycode.Delete],
  ['End', EmiKeycode.End],
  ['PageDown', EmiKeycode.PageDown],
  ['ArrowRight', EmiKeycode.RightArrow],
  ['ArrowLeft', EmiKeycode.LeftArrow],
  ['ArrowDown', EmiKeycode.DownArrow],
  ['ArrowUp', EmiKeycode.UpArrow],
  ['NumLock', EmiKeycode.NumLock],
  ['NumpadDivide', EmiKeycode.KeypadDivide],
  ['NumpadMultiply', EmiKeycode.KeypadMultiply],
  ['NumpadSubtract', EmiKeycode.KeypadMinus],
  ['NumpadAdd', EmiKeycode.KeypadPlus],
  ['NumpadEnter', EmiKeycode.KeypadEnter],
  ['NumpadDecimal', EmiKeycode.KeypadDot],
  ['NumpadEqual', EmiKeycode.KeypadEqual],
  ['NumpadComma', EmiKeycode.KeypadComma],
  ['IntlBackslash', EmiKeycode.NonUsBackslash],
  ['ContextMenu', EmiKeycode.Application],
  ['Power', EmiKeycode.Power],
  ['Help', EmiKeycode.Help],
  ['Again', EmiKeycode.Again],
  ['Undo', EmiKeycode.Undo],
  ['Cut', EmiKeycode.Cut],
  ['Copy', EmiKeycode.Copy],
  ['Paste', EmiKeycode.Paste],
  ['Find', EmiKeycode.Find],
  ['AudioVolumeMute', EmiKeycode.Mute],
  ['AudioVolumeUp', EmiKeycode.VolumeUp],
  ['AudioVolumeDown', EmiKeycode.VolumeDown],
  ['IntlRo', EmiKeycode.Intl1],
  ['KanaMode', EmiKeycode.Intl2],
  ['IntlYen', EmiKeycode.Intl3],
  ['Convert', EmiKeycode.Intl4],
  ['NonConvert', EmiKeycode.Intl5],
  ['Lang1', EmiKeycode.Lang1],
  ['Lang2', EmiKeycode.Lang2],
  ['Lang3', EmiKeycode.Lang3],
  ['Lang4', EmiKeycode.Lang4],
  ['Lang5', EmiKeycode.Lang5],
];

const MODIFIERS: readonly (readonly [code: string, mask: KeyModifier])[] = [
  ['ControlLeft', KeyModifier.KeyLeftCtrl],
  ['ShiftLeft', KeyModifier.KeyLeftShift],
  ['AltLeft', KeyModifier.KeyLeftAlt],
  ['MetaLeft', KeyModifier.KeyLeftGui],
  ['ControlRight', KeyModifier.KeyRightCtrl],
  ['ShiftRight', KeyModifier.KeyRightShift],
  ['AltRight', KeyModifier.KeyRightAlt],
  ['MetaRight', KeyModifier.KeyRightGui],
];

/** `KeyboardEvent.code` → the keycode the recorder records. */
export const BROWSER_KEYCODES: ReadonlyMap<string, Keycode> = new Map<string, Keycode>([
  ...[...LETTERS, ...DIGITS, ...FUNCTION_KEYS, ...NUMPAD_DIGITS, ...OTHER_KEYS].map(
    ([code, usage]): [string, Keycode] => [code, kc.key(usage)]
  ),
  ...MODIFIERS.map(([code, mask]): [string, Keycode] => [code, kc.modifier(mask)]),
]);

/** The keycode of a browser key, or null when it has no HID usage. */
export function hidKeycodeOf(code: string): Keycode | null {
  return BROWSER_KEYCODES.get(code) ?? null;
}

/**
 * `MouseEvent.button` → its Mouse keycode, as upstream maps them: main (left), auxiliary
 * (middle), secondary (right), back, forward.
 */
const MOUSE_BUTTONS: readonly MouseKeycode[] = [
  MouseKeycode.MouseLButton,
  MouseKeycode.MouseMButton,
  MouseKeycode.MouseRButton,
  MouseKeycode.MouseBack,
  MouseKeycode.MouseForward,
];

/** The keycode of a mouse button, or null for buttons beyond the fifth. */
export function mouseButtonKeycodeOf(button: number): Keycode | null {
  const sub = MOUSE_BUTTONS[button];
  return sub === undefined ? null : kc.mouse(sub);
}
