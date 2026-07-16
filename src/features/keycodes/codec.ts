/**
 * EMI keycode codec, following libamp `keycode.h` / `keyboard.c` / `layer.c`.
 *
 * A keycode is 16 bits: the low byte selects the keycode (a HID keyboard usage up to `ExSel`, or
 * one of the EMI categories below) and the high byte is its sub-code:
 *
 * - HID keys: `code | modifiers << 8` (a standalone modifier is `modifiers << 8`)
 * - layer control: `op << 12 | layer << 8 | 0xA6`
 * - collections (mouse 0xA5, consumer 0xA8, system 0xA9, joystick 0xAA, MIDI 0xAB/0xAC,
 *   macro 0xAD, script 0xAE, gamepad 0xAF): `code | sub << 8`
 * - keyboard operation `0xFE | sub << 8`: `sub & 0x3F < 0x20` is an operation (profiles are
 *   `0x10 + n`); otherwise `sub = action << 6 | (0x20 + configIndex)` switches a keyboard config
 * - dynamic key `0xA7 | slot << 8`, user key `0xFD | n << 8`, transparent `0xFF`
 */
import {
  type ConsumerKeycode,
  type KeyboardConfigCode,
  KeyboardKeycode,
  Keycode as EmiKeycode,
  type LayerControlKeycode,
  type MouseKeycode,
} from 'emi-keyboard-controller';
import type { Keycode } from '../device/model/types';

// Low bytes of the keycode categories, widened to `number` for comparisons with raw keycodes.
const EXSEL: number = EmiKeycode.ExSel;
const MOUSE: number = EmiKeycode.MouseCollection;
const LAYER: number = EmiKeycode.LayerControl;
const DYNAMIC_KEY: number = EmiKeycode.DynamicKey;
const CONSUMER: number = EmiKeycode.ConsumerCollection;
const SYSTEM: number = EmiKeycode.SystemCollection;
const JOYSTICK: number = EmiKeycode.JoystickCollection;
const MIDI: number = EmiKeycode.MIDICollection;
const MIDI_NOTE: number = EmiKeycode.MIDINote;
const MACRO: number = EmiKeycode.MacroCollection;
const SCRIPT: number = EmiKeycode.ScriptCollection;
const GAMEPAD: number = EmiKeycode.GamepadCollection;
const USER: number = EmiKeycode.KeyUser;
const KEYBOARD: number = EmiKeycode.KeyboardOperation;
const TRANSPARENT: number = EmiKeycode.KeyTransparent;

const KEYBOARD_CONFIG_BASE: number = KeyboardKeycode.KeyboardConfigBase;
const PROFILE_0: number = KeyboardKeycode.KeyboardProfile0;

/** What a keyboard-config keycode does to its config bit. */
export type KeyboardConfigAction = 'off' | 'on' | 'toggle';

const ACTION_BITS: Readonly<Record<KeyboardConfigAction, number>> = { off: 0, on: 1, toggle: 2 };
const ACTION_BY_BITS = ['off', 'on', 'toggle', 'ignored'] as const;

/** A keycode split into its category and fields (firmware semantics). */
export type DecodedKeycode =
  | { readonly category: 'none' }
  /** HID keyboard usage `0x01..0xA4`, optionally with modifiers held. */
  | { readonly category: 'key'; readonly code: number; readonly modifiers: number }
  /** Modifier bits only (`KeyModifier` mask), no key. */
  | { readonly category: 'modifier'; readonly modifiers: number }
  | { readonly category: 'mouse'; readonly sub: number }
  /** `op` is a `LayerControlKeycode`; `layer` is 0-based. */
  | { readonly category: 'layer'; readonly op: number; readonly layer: number }
  | { readonly category: 'dynamicKey'; readonly slot: number }
  | { readonly category: 'consumer'; readonly sub: number }
  | { readonly category: 'system'; readonly sub: number }
  /** `kind` is a `JoystickKeycode` (0 = button), `index` the button or axis. */
  | { readonly category: 'joystick'; readonly kind: number; readonly index: number }
  | { readonly category: 'midi'; readonly sub: number }
  | { readonly category: 'midiNote'; readonly note: number }
  /** `op` is a `MacroKeycode`, `index` the macro. */
  | { readonly category: 'macro'; readonly op: number; readonly index: number }
  | { readonly category: 'script'; readonly sub: number }
  | { readonly category: 'gamepad'; readonly sub: number }
  | { readonly category: 'user'; readonly index: number }
  /** `op` is a `KeyboardKeycode` below `KeyboardConfigBase`. */
  | { readonly category: 'keyboardOperation'; readonly op: number }
  /** `config` is a `KeyboardConfigCode`; action bits `3` are ignored by the firmware. */
  | {
      readonly category: 'keyboardConfig';
      readonly action: KeyboardConfigAction | 'ignored';
      readonly config: number;
    }
  | { readonly category: 'transparent' }
  /** Low bytes without a firmware meaning (`0xB0..0xFC`). */
  | { readonly category: 'reserved'; readonly code: number; readonly sub: number };

export type KeycodeCategory = DecodedKeycode['category'];

function field(name: string, value: number, max: number): number {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${name} must be an integer in 0..${max}, got ${value}`);
  }
  return value;
}

const byte = (name: string, value: number): number => field(name, value, 0xff);
const nibble = (name: string, value: number): number => field(name, value, 0x0f);
const collection = (code: number, name: string, sub: number): Keycode =>
  code | (byte(name, sub) << 8);

function layerKeycode(op: number, layer: number): Keycode {
  return (nibble('op', op) << 12) | (nibble('layer', layer) << 8) | LAYER;
}

function keyboardOperation(op: number): Keycode {
  return KEYBOARD | (field('op', op, KEYBOARD_CONFIG_BASE - 1) << 8);
}

function keyboardConfig(action: KeyboardConfigAction | 'ignored', config: number): Keycode {
  const actionBits = action === 'ignored' ? 3 : ACTION_BITS[action];
  const sub = (actionBits << 6) | (KEYBOARD_CONFIG_BASE + field('config', config, 0x1f));
  return KEYBOARD | (sub << 8);
}

/** Keycode constructors. Every argument is range-checked against its bit field. */
export const kc = Object.freeze({
  key: (code: number): Keycode => byte('code', code),
  withModifiers: (code: number, modifierMask: number): Keycode =>
    byte('code', code) | (byte('modifierMask', modifierMask) << 8),
  modifier: (mask: number): Keycode => byte('mask', mask) << 8,
  layer: (op: LayerControlKeycode, layer: number): Keycode => layerKeycode(op, layer),
  mouse: (sub: MouseKeycode): Keycode => collection(MOUSE, 'sub', sub),
  consumer: (sub: ConsumerKeycode): Keycode => collection(CONSUMER, 'sub', sub),
  system: (sub: number): Keycode => collection(SYSTEM, 'sub', sub),
  joystick: (sub: number): Keycode => collection(JOYSTICK, 'sub', sub),
  keyboardOperation: (op: KeyboardKeycode): Keycode => keyboardOperation(op),
  keyboardConfig: (action: KeyboardConfigAction, config: KeyboardConfigCode): Keycode =>
    keyboardConfig(action, config),
  profile: (index: 0 | 1 | 2 | 3): Keycode =>
    keyboardOperation(PROFILE_0 + field('index', index, 3)),
  dynamicKey: (slot: number): Keycode => collection(DYNAMIC_KEY, 'slot', slot),
  user: (n: number): Keycode => collection(USER, 'n', n),
  transparent: TRANSPARENT,
  none: 0,
});

/** Splits a keycode into its category and fields. Total: every 16-bit value decodes. */
export function decodeKeycode(keycode: Keycode): DecodedKeycode {
  const code = keycode & 0xff;
  const sub = (keycode >> 8) & 0xff;
  if (code <= EXSEL) {
    if (code !== 0) return { category: 'key', code, modifiers: sub };
    return sub === 0 ? { category: 'none' } : { category: 'modifier', modifiers: sub };
  }
  switch (code) {
    case MOUSE:
      return { category: 'mouse', sub };
    case LAYER:
      return { category: 'layer', op: (sub >> 4) & 0x0f, layer: sub & 0x0f };
    case DYNAMIC_KEY:
      return { category: 'dynamicKey', slot: sub };
    case CONSUMER:
      return { category: 'consumer', sub };
    case SYSTEM:
      return { category: 'system', sub };
    case JOYSTICK:
      return { category: 'joystick', kind: (sub >> 5) & 0x07, index: sub & 0x1f };
    case MIDI:
      return { category: 'midi', sub };
    case MIDI_NOTE:
      return { category: 'midiNote', note: sub };
    case MACRO:
      return { category: 'macro', op: (sub >> 4) & 0x0f, index: sub & 0x0f };
    case SCRIPT:
      return { category: 'script', sub };
    case GAMEPAD:
      return { category: 'gamepad', sub };
    case USER:
      return { category: 'user', index: sub };
    case KEYBOARD: {
      const low = sub & 0x3f;
      if (low < KEYBOARD_CONFIG_BASE) return { category: 'keyboardOperation', op: low };
      const action = ACTION_BY_BITS[(sub >> 6) & 0x03] ?? 'ignored';
      return { category: 'keyboardConfig', action, config: low - KEYBOARD_CONFIG_BASE };
    }
    case TRANSPARENT:
      return { category: 'transparent' };
    default:
      return { category: 'reserved', code, sub };
  }
}

/** Inverse of {@link decodeKeycode}. */
export function encodeKeycode(decoded: DecodedKeycode): Keycode {
  switch (decoded.category) {
    case 'none':
      return 0;
    case 'key':
      return kc.withModifiers(decoded.code, decoded.modifiers);
    case 'modifier':
      return kc.modifier(decoded.modifiers);
    case 'mouse':
      return collection(MOUSE, 'sub', decoded.sub);
    case 'layer':
      return layerKeycode(decoded.op, decoded.layer);
    case 'dynamicKey':
      return kc.dynamicKey(decoded.slot);
    case 'consumer':
      return collection(CONSUMER, 'sub', decoded.sub);
    case 'system':
      return kc.system(decoded.sub);
    case 'joystick':
      return kc.joystick(
        (field('kind', decoded.kind, 0x07) << 5) | field('index', decoded.index, 0x1f)
      );
    case 'midi':
      return collection(MIDI, 'sub', decoded.sub);
    case 'midiNote':
      return collection(MIDI_NOTE, 'note', decoded.note);
    case 'macro':
      return collection(
        MACRO,
        'sub',
        (nibble('op', decoded.op) << 4) | nibble('index', decoded.index)
      );
    case 'script':
      return collection(SCRIPT, 'sub', decoded.sub);
    case 'gamepad':
      return collection(GAMEPAD, 'sub', decoded.sub);
    case 'user':
      return kc.user(decoded.index);
    case 'keyboardOperation':
      return keyboardOperation(decoded.op);
    case 'keyboardConfig':
      return keyboardConfig(decoded.action, decoded.config);
    case 'transparent':
      return TRANSPARENT;
    case 'reserved':
      return byte('code', decoded.code) | (byte('sub', decoded.sub) << 8);
  }
}

/** The dynamic-key slot bound by a `DynamicKey | slot << 8` keycode, else `null`. */
export function dynamicKeySlotOf(keycode: Keycode): number | null {
  return (keycode & 0xff) === DYNAMIC_KEY ? (keycode >> 8) & 0xff : null;
}
