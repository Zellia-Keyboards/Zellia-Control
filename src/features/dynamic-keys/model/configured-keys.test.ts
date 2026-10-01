import { DynamicKeyMutexMode, RGBBaseMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { DeviceConfig, DynamicKeySlot, KeyLocation, Keycode } from '../../device';
import { kc } from '../../keycodes';
import {
  configuredKeys,
  configuredMutexes,
  dashboardRows,
  dynamicKeyAt,
  dynamicKeyOfKindAt,
  dynamicKeySignature,
  locationKey,
  ownBinding,
  sameLocation,
  type DynamicKeyOf,
} from './configured-keys';

const A = 0x04;
const D = 0x07;
const F = 0x09;
const H = 0x0b;
const S = 0x16;
const LCTRL = 0x0100;
const at = (layer: number, id: number): KeyLocation => ({ layer, id });
const dk = (slot: number): Keycode => kc.dynamicKey(slot);

const STROKE: DynamicKeyOf<'stroke'> = {
  kind: 'stroke',
  bindings: [F, 0, 0, 0],
  keyControl: [0x3f, 0, 0, 0],
  distances: { pressBegin: 0.25, pressFully: 0.75, releaseBegin: 0.75, releaseFully: 0.25 },
  target: at(0, 2),
};
const MOD_TAP: DynamicKeyOf<'modTap'> = {
  kind: 'modTap',
  tap: S,
  hold: LCTRL,
  durationMs: 200,
  target: at(1, 0),
};
const TOGGLE: DynamicKeyOf<'toggle'> = { kind: 'toggle', binding: H, target: at(0, 4) };
const MUTEX: DynamicKeyOf<'mutex'> = {
  kind: 'mutex',
  bindings: [A, D],
  mode: DynamicKeyMutexMode.DKMutexLastPriority,
  targets: [at(0, 1), at(0, 3)],
};
const NONE: DynamicKeySlot = { kind: 'none' };
/** A toggle whose key was remapped: it has no key any more. */
const ORPHAN: DynamicKeySlot = { kind: 'toggle', binding: A, target: null };

/** Layer 0: mutex on 1 and 3, stroke on 2, toggle on 4. Layer 1: mod-tap on 0. */
function config(dynamicKeys: readonly DynamicKeySlot[] = [STROKE, MOD_TAP, TOGGLE, MUTEX, NONE]) {
  const value: DeviceConfig = {
    advancedKeys: [],
    keymap: [
      [0x08, dk(3), dk(0), dk(3), dk(2), 0x0a],
      [dk(1), 0x0c, 0xff, 0xff, 0xff, 0xff],
    ],
    rgbBase: {
      mode: RGBBaseMode.RgbBaseModeOff,
      color: { red: 0, green: 0, blue: 0 },
      secondaryColor: { red: 0, green: 0, blue: 0 },
      speed: 0,
      direction: 0,
      density: 0,
      brightness: 0,
    },
    rgbKeys: [],
    dynamicKeys,
    profileIndex: 0,
    profileCount: 4,
  };
  return value;
}

describe('locations', () => {
  it('names a key location by layer and id', () => {
    expect(locationKey(at(0, 12))).toBe('0:12');
    expect(locationKey(at(3, 0))).toBe('3:0');
  });

  it('compares locations by value', () => {
    expect(sameLocation(at(1, 2), at(1, 2))).toBe(true);
    expect(sameLocation(at(1, 2), at(2, 1))).toBe(false);
    expect(sameLocation(at(1, 2), null)).toBe(false);
    expect(sameLocation(null, null)).toBe(true);
  });
});

describe('dynamicKeyAt', () => {
  it('finds the dynamic key a key runs through its keymap entry, on that layer only', () => {
    expect(dynamicKeyAt(config(), at(0, 2))).toEqual({ slot: 0, dynamicKey: STROKE });
    expect(dynamicKeyAt(config(), at(1, 0))).toEqual({ slot: 1, dynamicKey: MOD_TAP });
    expect(dynamicKeyAt(config(), at(0, 0))).toBeNull();
    expect(dynamicKeyAt(config(), at(1, 2))).toBeNull();
  });

  it('finds a mutex from either of its keys', () => {
    expect(dynamicKeyAt(config(), at(0, 1))).toEqual({ slot: 3, dynamicKey: MUTEX });
    expect(dynamicKeyAt(config(), at(0, 3))).toEqual({ slot: 3, dynamicKey: MUTEX });
  });

  it('ignores keys outside the keymap, empty slots and a missing configuration', () => {
    expect(dynamicKeyAt(config(), at(5, 0))).toBeNull();
    expect(dynamicKeyAt(config(), at(0, 40))).toBeNull();
    expect(dynamicKeyAt(config([STROKE, MOD_TAP, NONE, MUTEX]), at(0, 4))).toBeNull();
    expect(dynamicKeyAt(null, at(0, 2))).toBeNull();
    expect(dynamicKeyAt(config(), null)).toBeNull();
  });

  it('filters by kind', () => {
    expect(dynamicKeyOfKindAt(config(), at(0, 2), 'stroke')).toEqual({
      slot: 0,
      dynamicKey: STROKE,
    });
    expect(dynamicKeyOfKindAt(config(), at(0, 2), 'modTap')).toBeNull();
    expect(dynamicKeyOfKindAt(config(), at(0, 3), 'mutex')?.slot).toBe(3);
  });
});

describe('configured keys', () => {
  it('lists the dynamic keys of one kind with their key', () => {
    const second: DynamicKeySlot = { kind: 'toggle', binding: F, target: at(1, 5) };
    const list = configuredKeys([TOGGLE, STROKE, second, NONE], 'toggle');
    expect(list).toEqual([
      { slot: 0, target: at(0, 4), dynamicKey: TOGGLE },
      { slot: 2, target: at(1, 5), dynamicKey: second },
    ]);
  });

  it('lists tap-hold and toggle keys by key id, then layer, as the Svelte lists did', () => {
    const modTapAt = (layer: number, id: number): DynamicKeySlot => ({
      ...MOD_TAP,
      target: at(layer, id),
    });
    const toggleAt = (layer: number, id: number): DynamicKeySlot => ({
      ...TOGGLE,
      target: at(layer, id),
    });
    const slots = [
      modTapAt(0, 30),
      toggleAt(0, 30),
      modTapAt(2, 17),
      toggleAt(1, 17),
      modTapAt(0, 17),
      toggleAt(0, 4),
    ];
    const targets = (list: readonly { target: KeyLocation }[]) => list.map(entry => entry.target);
    expect(targets(configuredKeys(slots, 'modTap'))).toEqual([at(0, 17), at(2, 17), at(0, 30)]);
    expect(targets(configuredKeys(slots, 'toggle'))).toEqual([at(0, 4), at(1, 17), at(0, 30)]);
  });

  it('lists DKS keys in slot order', () => {
    const strokeAt = (layer: number, id: number): DynamicKeySlot => ({
      ...STROKE,
      target: at(layer, id),
    });
    const slots = [strokeAt(0, 30), TOGGLE, strokeAt(0, 17), strokeAt(1, 2)];
    expect(configuredKeys(slots, 'stroke').map(entry => entry.slot)).toEqual([0, 2, 3]);
  });

  it('leaves out dynamic keys that no key runs', () => {
    expect(configuredKeys([ORPHAN, TOGGLE], 'toggle')).toEqual([
      { slot: 1, target: at(0, 4), dynamicKey: TOGGLE },
    ]);
  });

  it('lists mutexes with both keys', () => {
    const half: DynamicKeySlot = { ...MUTEX, targets: [at(0, 1), null] };
    expect(configuredMutexes([STROKE, MUTEX, half])).toEqual([
      { slot: 1, targets: [at(0, 1), at(0, 3)], dynamicKey: MUTEX },
    ]);
  });
});

describe('dashboardRows', () => {
  it('lists every configured key, a mutex once per key, by key id with the DKS keys last', () => {
    const rows = dashboardRows([STROKE, MOD_TAP, TOGGLE, MUTEX, ORPHAN, NONE]);
    expect(rows.map(row => [row.id, row.slot, row.dynamicKey.kind])).toEqual([
      ['1:0', 1, 'modTap'],
      ['0:1', 3, 'mutex'],
      ['0:3', 3, 'mutex'],
      ['0:4', 2, 'toggle'],
      ['0:2', 0, 'stroke'],
    ]);
    expect(rows[2]?.target).toEqual(at(0, 3));
  });

  it('orders keys with the same id by layer and the DKS keys by slot', () => {
    const strokeAt = (layer: number, id: number): DynamicKeySlot => ({
      ...STROKE,
      target: at(layer, id),
    });
    const toggleAt = (layer: number, id: number): DynamicKeySlot => ({
      ...TOGGLE,
      target: at(layer, id),
    });
    const rows = dashboardRows([
      strokeAt(0, 9),
      toggleAt(2, 5),
      strokeAt(1, 1),
      toggleAt(0, 5),
      toggleAt(3, 2),
    ]);
    expect(rows.map(row => row.id)).toEqual(['3:2', '0:5', '2:5', '0:9', '1:1']);
  });

  it('leaves out dynamic keys that are missing a key', () => {
    const half: DynamicKeySlot = { ...MUTEX, targets: [null, at(0, 3)] };
    expect(dashboardRows([ORPHAN, half, NONE])).toEqual([]);
  });
});

describe('dynamicKeySignature', () => {
  it('is equal for equal content and differs for any changed field', () => {
    const copy = { ...STROKE, bindings: [...STROKE.bindings] as const };
    expect(dynamicKeySignature(copy)).toBe(dynamicKeySignature(STROKE));
    expect(dynamicKeySignature({ ...STROKE, keyControl: [0x3f, 1, 0, 0] })).not.toBe(
      dynamicKeySignature(STROKE)
    );
    expect(dynamicKeySignature({ ...MUTEX, mode: 0x04 })).not.toBe(dynamicKeySignature(MUTEX));
    expect(dynamicKeySignature({ ...MUTEX, targets: [at(0, 1), at(0, 5)] })).not.toBe(
      dynamicKeySignature(MUTEX)
    );
    expect(dynamicKeySignature({ ...MOD_TAP, durationMs: 201 })).not.toBe(
      dynamicKeySignature(MOD_TAP)
    );
    expect(dynamicKeySignature({ ...TOGGLE, binding: A })).not.toBe(dynamicKeySignature(TOGGLE));
    expect(dynamicKeySignature({ ...TOGGLE, target: at(1, 4) })).not.toBe(
      dynamicKeySignature(TOGGLE)
    );
    expect(dynamicKeySignature(null)).toBe('');
  });
});

describe('ownBinding', () => {
  it('is the keymap entry of a plain key', () => {
    expect(ownBinding(config(), at(0, 0))).toBe(0x08);
    expect(ownBinding(config(), at(1, 1))).toBe(0x0c);
  });

  it("is the dynamic key's own binding for a key that runs one (mutex: per key)", () => {
    expect(ownBinding(config(), at(0, 2))).toBe(F);
    expect(ownBinding(config(), at(1, 0))).toBe(S);
    expect(ownBinding(config(), at(0, 4))).toBe(H);
    expect(ownBinding(config(), at(0, 1))).toBe(A);
    expect(ownBinding(config(), at(0, 3))).toBe(D);
  });

  it('is no key for keys outside the keymap, dangling references and no configuration', () => {
    expect(ownBinding(config(), at(4, 0))).toBe(0);
    expect(ownBinding(config([STROKE, MOD_TAP, NONE, MUTEX]), at(0, 4))).toBe(0);
    expect(ownBinding(null, at(0, 0))).toBe(0);
  });
});
