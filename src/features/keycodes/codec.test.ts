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
  SystemRawKeycode,
} from 'emi-keyboard-controller';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Keycode } from '../device/model/types';
import {
  decodeKeycode,
  dynamicKeySlotOf,
  encodeKeycode,
  kc,
  type KeyboardConfigAction,
} from './codec';

/** Numeric members of a TypeScript enum object (skipping its reverse mapping). */
function numericMembers<E extends number>(enumObject: Readonly<Record<string, string | E>>): E[] {
  return Object.values(enumObject).filter((value): value is E => typeof value === 'number');
}

const ACTIONS: readonly KeyboardConfigAction[] = ['off', 'on', 'toggle'];

describe('kc constructors: firmware examples (libamp keycode.h / keyboard.c)', () => {
  it('encodes Left Ctrl as a standalone modifier (KC_LEFT_CTRL = KEY_LEFT_CTRL << 8)', () => {
    expect(kc.modifier(KeyModifier.KeyLeftCtrl)).toBe(0x0100);
  });

  it('encodes LAYER(LAYER_MOMENTARY, 1) as 0x01A6 and LAYER(LAYER_TOGGLE, 3) as 0x33A6', () => {
    expect(kc.layer(LayerControlKeycode.LayerMomentary, 1)).toBe(0x01a6);
    expect(kc.layer(LayerControlKeycode.LayerToggle, 3)).toBe(0x33a6);
  });

  it('encodes a keyboard-config toggle as 0xFE | ((2 << 6) | (0x20 + config)) << 8', () => {
    expect(kc.keyboardConfig('toggle', KeyboardConfigCode.KeyboardConfigDebug)).toBe(
      0xfe | (((2 << 6) | (0x20 + 0)) << 8)
    );
    expect(kc.keyboardConfig('toggle', KeyboardConfigCode.KeyboardConfigDebug)).toBe(0xa0fe);
    expect(kc.keyboardConfig('toggle', KeyboardConfigCode.KeyboardConfigNkro)).toBe(0xa1fe);
    expect(kc.keyboardConfig('off', KeyboardConfigCode.KeyboardConfigWinlock)).toBe(0x22fe);
    expect(kc.keyboardConfig('on', KeyboardConfigCode.KeyboardConfigNkro)).toBe(0x61fe);
  });

  it('matches the libamp QMK aliases for collections and keyboard operations', () => {
    expect(kc.keyboardOperation(KeyboardKeycode.KeyboardBootloader)).toBe(0x03fe); // QK_BOOTLOADER
    expect(kc.keyboardOperation(KeyboardKeycode.KeyboardReboot)).toBe(0x00fe); // QK_REBOOT
    expect(kc.consumer(ConsumerKeycode.ConsumerAudioVolUp)).toBe(0x0fa8); // KC_AUDIO_VOL_UP
    expect(kc.consumer(ConsumerKeycode.ConsumerTransportPlayPause)).toBe(0x0da8); // KC_MPLY
    expect(kc.system(SystemRawKeycode.SystemSleep)).toBe(0x82a9); // KC_SYSTEM_SLEEP
    expect(kc.mouse(MouseKeycode.MouseLButton)).toBe(0x00a5); // QK_MOUSE_BUTTON_1
    expect(kc.joystick(5)).toBe(0x05aa); // QK_JOYSTICK_BUTTON_5
  });

  it('encodes profile selection as KeyboardOperation | (0x10 + n) << 8', () => {
    expect([0, 1, 2, 3].map(n => kc.profile(n as 0 | 1 | 2 | 3))).toEqual([
      0x10fe, 0x11fe, 0x12fe, 0x13fe,
    ]);
  });

  it('encodes dynamic keys, user keys, transparent and none', () => {
    expect(kc.dynamicKey(0)).toBe(0x00a7);
    expect(kc.dynamicKey(31)).toBe(0x1fa7);
    expect(kc.user(7)).toBe(0x07fd);
    expect(kc.transparent).toBe(0x00ff);
    expect(kc.none).toBe(0x0000);
  });

  it('types every constructor result and constant as Keycode (so they can seed editable state)', () => {
    // A literal `0` would make `useState(kc.none)` reject any other keycode.
    expectTypeOf(kc.none).toEqualTypeOf<Keycode>();
    expectTypeOf(kc.transparent).toEqualTypeOf<Keycode>();
    expectTypeOf(kc.key).returns.toEqualTypeOf<Keycode>();
    expectTypeOf(kc.profile).returns.toEqualTypeOf<Keycode>();
  });

  it('combines a key with modifiers as code | mask << 8', () => {
    expect(kc.withModifiers(EmiKeycode.A, KeyModifier.KeyLeftShift | KeyModifier.KeyRightAlt)).toBe(
      0x4204
    );
    expect(kc.key(EmiKeycode.Escape)).toBe(0x29);
  });

  it('rejects values that do not fit their bit field', () => {
    expect(() => kc.key(0x100)).toThrow(RangeError);
    expect(() => kc.key(-1)).toThrow(RangeError);
    expect(() => kc.key(1.5)).toThrow(RangeError);
    expect(() => kc.withModifiers(EmiKeycode.A, 0x100)).toThrow(RangeError);
    expect(() => kc.modifier(0x100)).toThrow(RangeError);
    expect(() => kc.layer(LayerControlKeycode.LayerMomentary, 16)).toThrow(RangeError);
    expect(() => kc.joystick(0x100)).toThrow(RangeError);
    expect(() => kc.system(Number.NaN)).toThrow(RangeError);
    expect(() => kc.keyboardOperation(KeyboardKeycode.KeyboardConfigBase)).toThrow(RangeError);
    expect(() => kc.profile(4 as 0)).toThrow(RangeError);
    expect(() => kc.dynamicKey(0x100)).toThrow(RangeError);
    expect(() => kc.user(-1)).toThrow(RangeError);
    // Enum-typed fields are validated too (reached here through encodeKeycode).
    expect(() => encodeKeycode({ category: 'layer', op: 16, layer: 0 })).toThrow(RangeError);
    expect(() => encodeKeycode({ category: 'mouse', sub: 0x100 })).toThrow(RangeError);
    expect(() =>
      encodeKeycode({ category: 'keyboardConfig', action: 'toggle', config: 0x20 })
    ).toThrow(RangeError);
    expect(() => encodeKeycode({ category: 'joystick', kind: 8, index: 0 })).toThrow(RangeError);
  });

  it('encodes macro and script keys as MACRO_COLLECTION / SCRIPT_COLLECTION (keycode.h, macro.h)', () => {
    // MACRO_KEYCODE_GET_KEYCODE = sub >> 4, MACRO_KEYCODE_GET_INDEX = sub & 0x0F
    expect(kc.macro(MacroKeycode.MacroRecordingStart, 0)).toBe(0x10ad);
    expect(kc.macro(MacroKeycode.MacroPlayingStartOnce, 1)).toBe(0x41ad);
    expect(kc.script(ScriptKeycode.ScriptToggle)).toBe(0x05ae);
    expect(decodeKeycode(kc.macro(MacroKeycode.MacroPlayingPause, 3))).toEqual({
      category: 'macro',
      op: 9,
      index: 3,
    });
    expect(decodeKeycode(kc.script(ScriptKeycode.ScriptWatch))).toEqual({
      category: 'script',
      sub: 0,
    });
    expect(() => kc.macro(MacroKeycode.MacroPlayingStop, 16)).toThrow(RangeError);
  });
});

describe('decodeKeycode', () => {
  it('decodes every category by its low byte', () => {
    expect(decodeKeycode(0x0000)).toEqual({ category: 'none' });
    expect(decodeKeycode(0x0029)).toEqual({ category: 'key', code: 0x29, modifiers: 0 });
    expect(decodeKeycode(0x0229)).toEqual({ category: 'key', code: 0x29, modifiers: 0x02 });
    expect(decodeKeycode(0x00a4)).toEqual({ category: 'key', code: 0xa4, modifiers: 0 });
    expect(decodeKeycode(0x0200)).toEqual({ category: 'modifier', modifiers: 0x02 });
    expect(decodeKeycode(0x13a5)).toEqual({ category: 'mouse', sub: MouseKeycode.MouseMoveRight });
    expect(decodeKeycode(0x01a6)).toEqual({ category: 'layer', op: 0, layer: 1 });
    expect(decodeKeycode(0x33a6)).toEqual({ category: 'layer', op: 3, layer: 3 });
    expect(decodeKeycode(0x05a7)).toEqual({ category: 'dynamicKey', slot: 5 });
    expect(decodeKeycode(0x0fa8)).toEqual({ category: 'consumer', sub: 0x0f });
    expect(decodeKeycode(0x82a9)).toEqual({ category: 'system', sub: 0x82 });
    expect(decodeKeycode(0x20aa)).toEqual({ category: 'joystick', kind: 1, index: 0 });
    expect(decodeKeycode(0xe3aa)).toEqual({ category: 'joystick', kind: 7, index: 3 });
    expect(decodeKeycode(0x05ab)).toEqual({ category: 'midi', sub: 5 });
    expect(decodeKeycode(0x3cac)).toEqual({ category: 'midiNote', note: 60 });
    expect(decodeKeycode(0x12ad)).toEqual({ category: 'macro', op: 1, index: 2 });
    expect(decodeKeycode(0x02ae)).toEqual({ category: 'script', sub: 2 });
    expect(decodeKeycode(0x0baf)).toEqual({ category: 'gamepad', sub: 0x0b });
    expect(decodeKeycode(0x07fd)).toEqual({ category: 'user', index: 7 });
    expect(decodeKeycode(0x03fe)).toEqual({ category: 'keyboardOperation', op: 3 });
    expect(decodeKeycode(0x12fe)).toEqual({ category: 'keyboardOperation', op: 0x12 });
    expect(decodeKeycode(0x00ff)).toEqual({ category: 'transparent' });
    expect(decodeKeycode(0x01b0)).toEqual({ category: 'reserved', code: 0xb0, sub: 0x01 });
  });

  it('decodes keyboard-config keycodes into action and config index (keyboard.c semantics)', () => {
    expect(decodeKeycode(0xa0fe)).toEqual({
      category: 'keyboardConfig',
      action: 'toggle',
      config: 0,
    });
    expect(decodeKeycode(0xa1fe)).toEqual({
      category: 'keyboardConfig',
      action: 'toggle',
      config: 1,
    });
    expect(decodeKeycode(0x22fe)).toEqual({ category: 'keyboardConfig', action: 'off', config: 2 });
    expect(decodeKeycode(0x65fe)).toEqual({ category: 'keyboardConfig', action: 'on', config: 5 });
    // Action bits 3 are ignored by the firmware (libamp's own QK_DEBUG_TOGGLE alias uses them).
    expect(decodeKeycode(0xe0fe)).toEqual({
      category: 'keyboardConfig',
      action: 'ignored',
      config: 0,
    });
  });

  it('uses the firmware operation mask (sub & 0x3F) for keyboard operations', () => {
    expect(decodeKeycode(0x43fe)).toEqual({ category: 'keyboardOperation', op: 3 });
  });

  it('round-trips every 16-bit keycode through encodeKeycode, normalizing only ignored bits', () => {
    const isNormalized = (keycode: number): boolean => {
      const code = keycode & 0xff;
      const sub = (keycode >> 8) & 0xff;
      if (code === 0xff) return sub !== 0; // KEYCODE_GET_MAIN(keycode) == KEY_TRANSPARENT
      return code === 0xfe && (sub & 0x3f) < 0x20 && (sub & 0xc0) !== 0; // switch (modifier & 0x3F)
    };
    let normalized = 0;
    for (let keycode = 0; keycode <= 0xffff; keycode++) {
      const decoded = decodeKeycode(keycode);
      const encoded = encodeKeycode(decoded);
      if (isNormalized(keycode)) {
        normalized++;
        expect(decodeKeycode(encoded)).toEqual(decoded);
      } else if (encoded !== keycode) {
        expect.unreachable(`0x${keycode.toString(16)} re-encoded as 0x${encoded.toString(16)}`);
      }
    }
    expect(normalized).toBe(255 + 32 * 3);
  });
});

describe('every controller enum member round-trips through its constructor', () => {
  it('basic HID keycodes (<= ExSel)', () => {
    const codes: readonly number[] = numericMembers(EmiKeycode);
    for (const code of codes.filter(value => value <= 0xa4)) {
      const decoded = decodeKeycode(kc.key(code));
      expect(decoded).toEqual(
        code === 0 ? { category: 'none' } : { category: 'key', code, modifiers: 0 }
      );
      expect(encodeKeycode(decoded)).toBe(code);
    }
  });

  it('modifiers, alone and combined with a key', () => {
    const modifiers: readonly number[] = numericMembers(KeyModifier);
    for (const modifier of modifiers.filter(value => value !== 0)) {
      expect(decodeKeycode(kc.modifier(modifier))).toEqual({
        category: 'modifier',
        modifiers: modifier,
      });
    }
    for (let mask = 0; mask <= 0xff; mask++) {
      expect(decodeKeycode(kc.withModifiers(EmiKeycode.Z, mask))).toEqual({
        category: 'key',
        code: EmiKeycode.Z,
        modifiers: mask,
      });
    }
  });

  it('mouse, consumer and system collections', () => {
    for (const sub of numericMembers(MouseKeycode)) {
      expect(decodeKeycode(kc.mouse(sub))).toEqual({ category: 'mouse', sub });
    }
    for (const sub of numericMembers(ConsumerKeycode)) {
      expect(decodeKeycode(kc.consumer(sub))).toEqual({ category: 'consumer', sub });
    }
    for (const sub of numericMembers(SystemRawKeycode)) {
      expect(decodeKeycode(kc.system(sub))).toEqual({ category: 'system', sub });
    }
  });

  it('joystick kinds × indices (sub = kind << 5 | index)', () => {
    for (const kind of numericMembers(JoystickKeycode)) {
      for (let index = 0; index < 32; index++) {
        expect(decodeKeycode(kc.joystick((kind << 5) | index))).toEqual({
          category: 'joystick',
          kind,
          index,
        });
      }
    }
  });

  it('layer operations × layers 0..15', () => {
    for (const op of numericMembers(LayerControlKeycode)) {
      for (let layer = 0; layer < 16; layer++) {
        expect(decodeKeycode(kc.layer(op, layer))).toEqual({ category: 'layer', op, layer });
      }
    }
  });

  it('keyboard operations (renamed KeyboardProfileN included)', () => {
    const operations = numericMembers(KeyboardKeycode).filter(
      op => op < KeyboardKeycode.KeyboardConfigBase
    );
    expect(operations).toContain(KeyboardKeycode.KeyboardProfile3);
    for (const op of operations) {
      expect(decodeKeycode(kc.keyboardOperation(op))).toEqual({
        category: 'keyboardOperation',
        op,
      });
    }
    const profiles = [
      KeyboardKeycode.KeyboardProfile0,
      KeyboardKeycode.KeyboardProfile1,
      KeyboardKeycode.KeyboardProfile2,
      KeyboardKeycode.KeyboardProfile3,
    ] as const;
    for (const index of [0, 1, 2, 3] as const) {
      expect(kc.profile(index)).toBe(kc.keyboardOperation(profiles[index]));
    }
  });

  it('keyboard configs (KeyboardConfigCode) × off/on/toggle', () => {
    for (const config of numericMembers(KeyboardConfigCode)) {
      for (const action of ACTIONS) {
        expect(decodeKeycode(kc.keyboardConfig(action, config))).toEqual({
          category: 'keyboardConfig',
          action,
          config,
        });
      }
    }
  });

  it('dynamic keys and user keys', () => {
    for (let n = 0; n <= 0xff; n++) {
      expect(decodeKeycode(kc.dynamicKey(n))).toEqual({ category: 'dynamicKey', slot: n });
      expect(decodeKeycode(kc.user(n))).toEqual({ category: 'user', index: n });
    }
  });
});

describe('dynamicKeySlotOf', () => {
  it('returns the slot of DynamicKey | slot << 8 entries and null otherwise', () => {
    expect(dynamicKeySlotOf(0x00a7)).toBe(0);
    expect(dynamicKeySlotOf(0x1fa7)).toBe(31);
    expect(dynamicKeySlotOf(kc.dynamicKey(12))).toBe(12);
    expect(dynamicKeySlotOf(0x0029)).toBeNull();
    expect(dynamicKeySlotOf(0x05a6)).toBeNull();
    expect(dynamicKeySlotOf(0xa700)).toBeNull();
  });
});
