import { DynamicKeyMutexMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  bindDynamicKey,
  dynamicKeyKeycode,
  dynamicKeySlotOfKeycode,
  findSlotForTargets,
  firstFreeSlot,
  rebuildTargets,
  releaseIncompleteDynamicKeys,
  setKeymapEntries,
  unbindDynamicKey,
  unbindDynamicKeys,
  type DynamicKeyDraft,
} from './dynamic-key-binding';
import type { DynamicKeySlot, KeyLocation, Keymap } from './types';

const A = 0x04;
const D = 0x07;
const F = 0x09;
const H = 0x0b;
const S = 0x16;
const ESC = 0x29;
const LCTRL = 0x0100;
const LSHIFT = 0x0200;
const dk = dynamicKeyKeycode;
const at = (layer: number, id: number): KeyLocation => ({ layer, id });
const NONE: DynamicKeySlot = { kind: 'none' };

const DISTANCES = { pressBegin: 0.25, pressFully: 0.75, releaseBegin: 0.75, releaseFully: 0.25 };

/** Two layers × 12 keys: stroke (slot 0) on key 2, mod-tap (1) on 0, toggle (2) on 4, mutex (3) on 1 and 3. */
function fixture(slotCount = 6): { keymap: Keymap; slots: DynamicKeySlot[] } {
  const keymap = [
    [dk(1), dk(3), dk(0), dk(3), dk(2), 0x08, 0x0a, 0x0c, 0x0d, 0x0e, 0x0f, 0x10],
    Array.from({ length: 12 }, () => 0xff),
  ];
  const slots: DynamicKeySlot[] = [
    {
      kind: 'stroke',
      bindings: [F, LSHIFT, 0, 0],
      keyControl: [0x3f, 0x04, 0, 0],
      distances: DISTANCES,
      target: null,
    },
    { kind: 'modTap', tap: S, hold: LCTRL, durationMs: 200, target: null },
    { kind: 'toggle', binding: H, target: null },
    {
      kind: 'mutex',
      bindings: [A, D],
      mode: DynamicKeyMutexMode.DKMutexLastPriority,
      targets: [null, null],
    },
  ];
  while (slots.length < slotCount) slots.push(NONE);
  return { keymap, slots };
}

function bound() {
  const { keymap, slots } = fixture();
  return { keymap, slots: rebuildTargets(keymap, slots) };
}

describe('keycodes', () => {
  it('encodes and recognizes dynamic-key keycodes', () => {
    expect(dk(0)).toBe(0x00a7);
    expect(dk(31)).toBe(0x1fa7);
    expect(dynamicKeySlotOfKeycode(0x1fa7)).toBe(31);
    expect(dynamicKeySlotOfKeycode(0x00a6)).toBeNull();
    expect(dynamicKeySlotOfKeycode(A)).toBeNull();
  });
});

describe('rebuildTargets', () => {
  it('places each dynamic key on the keys that reference it, in keymap scan order', () => {
    const slots = bound().slots;
    expect(slots[0]).toMatchObject({ kind: 'stroke', target: at(0, 2) });
    expect(slots[1]).toMatchObject({ kind: 'modTap', target: at(0, 0) });
    expect(slots[2]).toMatchObject({ kind: 'toggle', target: at(0, 4) });
    expect(slots[3]).toMatchObject({ kind: 'mutex', targets: [at(0, 1), at(0, 3)] });
    expect(slots[4]).toEqual(NONE);
  });

  it('scans layer-major and uses the first reference of single-target keys', () => {
    const { slots } = fixture();
    const keymap = [
      [0, 0, 0, 0],
      [0, dk(0), 0, dk(0)],
      [dk(0), 0, 0, 0],
    ];
    expect(rebuildTargets(keymap, slots)[0]).toMatchObject({ target: at(1, 1) });
  });

  it('leaves unreferenced keys without targets and ignores references to missing slots', () => {
    const { slots } = fixture();
    const keymap = [[dk(3), dk(9), 0, 0]];
    const rebuilt = rebuildTargets(keymap, slots);
    expect(rebuilt[0]).toMatchObject({ target: null });
    expect(rebuilt[3]).toMatchObject({ targets: [at(0, 0), null] });
    expect(rebuilt).toHaveLength(slots.length);
  });

  it('keeps unchanged slots identical', () => {
    const { keymap, slots } = bound();
    const again = rebuildTargets(keymap, slots);
    again.forEach((slot, index) => {
      expect(slot).toBe(slots[index]);
    });
  });
});

describe('slot lookup', () => {
  it('finds the slot already bound to one of the targets', () => {
    const { keymap, slots } = bound();
    expect(findSlotForTargets(keymap, slots, [at(0, 3)])).toBe(3);
    expect(findSlotForTargets(keymap, slots, [at(0, 9), at(0, 4)])).toBe(2);
    expect(findSlotForTargets(keymap, slots, [at(0, 9)])).toBeNull();
    expect(findSlotForTargets([[dk(9)]], slots, [at(0, 0)])).toBeNull();
  });

  it('returns the first empty slot that no key references', () => {
    const { keymap, slots } = bound();
    expect(firstFreeSlot(keymap, slots)).toBe(4);
    const stray = keymap.map((layer, index) => (index === 1 ? [dk(4), ...layer.slice(1)] : layer));
    expect(firstFreeSlot(stray, slots)).toBe(5);
    expect(firstFreeSlot(keymap, fixture(4).slots)).toBeNull();
  });
});

describe('bindDynamicKey', () => {
  const toggle = (target: KeyLocation, binding = ESC): DynamicKeyDraft => ({
    kind: 'toggle',
    target,
    binding,
  });

  it('uses the first free slot for an unbound key', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, toggle(at(1, 5)));
    expect(result?.slot).toBe(4);
    expect(result?.slots[4]).toEqual({ kind: 'toggle', binding: ESC, target: at(1, 5) });
    expect(result?.changedSlots).toEqual([4]);
    expect(result?.changedKeymapEntries).toEqual([{ layer: 1, id: 5, keycode: dk(4) }]);
    expect(result?.keymap[1]?.[5]).toBe(dk(4));
    expect(keymap[1]?.[5]).toBe(0xff);
  });

  it('reuses the slot already bound to the key, changing its kind', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, {
      kind: 'modTap',
      target: at(0, 2),
      tap: F,
      hold: LSHIFT,
      durationMs: 150,
    });
    expect(result?.slot).toBe(0);
    expect(result?.slots[0]).toEqual({
      kind: 'modTap',
      tap: F,
      hold: LSHIFT,
      durationMs: 150,
      target: at(0, 2),
    });
    expect(result?.changedSlots).toEqual([0]);
    expect(result?.changedKeymapEntries).toEqual([]);
  });

  it('rejects the draft when no slot is free', () => {
    const { keymap, slots } = fixture(4);
    expect(bindDynamicKey(keymap, rebuildTargets(keymap, slots), toggle(at(1, 0)))).toBeNull();
  });

  it('re-targets a reused mutex and restores the key it no longer covers', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, {
      kind: 'mutex',
      targets: [at(0, 1), at(0, 7)],
      bindings: [A, 0x0c],
      mode: DynamicKeyMutexMode.DKMutexNeutral,
    });
    expect(result?.slot).toBe(3);
    expect(result?.slots[3]).toEqual({
      kind: 'mutex',
      bindings: [A, 0x0c],
      mode: DynamicKeyMutexMode.DKMutexNeutral,
      targets: [at(0, 1), at(0, 7)],
    });
    expect(result?.changedKeymapEntries).toEqual([
      { layer: 0, id: 3, keycode: D },
      { layer: 0, id: 7, keycode: dk(3) },
    ]);
    expect(result?.changedSlots).toEqual([3]);
  });

  it('releases a dynamic key that loses its only key to the new one', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, {
      kind: 'mutex',
      targets: [at(0, 0), at(0, 2)],
      bindings: [S, F],
      mode: DynamicKeyMutexMode.DKMutexDistancePriority,
    });
    expect(result?.slot).toBe(1);
    expect(result?.slots[0]).toEqual(NONE);
    expect(result?.slots[1]).toMatchObject({ kind: 'mutex', targets: [at(0, 0), at(0, 2)] });
    expect(result?.changedSlots).toEqual([0, 1]);
    expect(result?.changedKeymapEntries).toEqual([{ layer: 0, id: 2, keycode: dk(1) }]);
  });

  it('orders mutex keys by keymap scan order, swapping bindings and key priority', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, {
      kind: 'mutex',
      targets: [at(1, 2), at(0, 9)],
      bindings: [0x1d, 0x1b],
      mode: DynamicKeyMutexMode.DKMutexKey1Priority,
    });
    expect(result?.slots[result.slot]).toEqual({
      kind: 'mutex',
      targets: [at(0, 9), at(1, 2)],
      bindings: [0x1b, 0x1d],
      mode: DynamicKeyMutexMode.DKMutexKey2Priority,
    });
    const rebuilt = result && rebuildTargets(result.keymap, result.slots)[result.slot];
    expect(rebuilt).toBe(result?.slots[result.slot]);
  });

  it('keeps symmetric mutex modes when swapping', () => {
    const { keymap, slots } = bound();
    const result = bindDynamicKey(keymap, slots, {
      kind: 'mutex',
      targets: [at(0, 9), at(0, 8)],
      bindings: [1, 2],
      mode: DynamicKeyMutexMode.DKMutexLastPriority,
    });
    expect(result?.slots[4]).toMatchObject({
      bindings: [2, 1],
      mode: DynamicKeyMutexMode.DKMutexLastPriority,
    });
  });

  it('clears stray references to a slot it takes over', () => {
    const { keymap, slots } = bound();
    const strayKeymap = [keymap[0] ?? [], [dk(4), dk(4), ...(keymap[1] ?? []).slice(2)]];
    const result = bindDynamicKey(strayKeymap, slots, toggle(at(1, 0)));
    expect(result?.slot).toBe(4);
    expect(result?.changedKeymapEntries).toEqual([{ layer: 1, id: 1, keycode: 0 }]);
    expect(result?.slots[4]).toEqual({ kind: 'toggle', binding: ESC, target: at(1, 0) });

    const elsewhere = bindDynamicKey(strayKeymap, slots, toggle(at(0, 9)));
    expect(elsewhere?.slot).toBe(5);
  });

  it('rejects targets outside the keymap and identical mutex keys', () => {
    const { keymap, slots } = bound();
    expect(() => bindDynamicKey(keymap, slots, toggle(at(2, 0)))).toThrow(RangeError);
    expect(() => bindDynamicKey(keymap, slots, toggle(at(0, 12)))).toThrow(RangeError);
    expect(() => bindDynamicKey(keymap, slots, toggle(at(0, -1)))).toThrow(RangeError);
    expect(() =>
      bindDynamicKey(keymap, slots, {
        kind: 'mutex',
        targets: [at(0, 5), at(0, 5)],
        bindings: [1, 2],
        mode: DynamicKeyMutexMode.DKMutexNeutral,
      })
    ).toThrow(RangeError);
  });
});

describe('unbindDynamicKey', () => {
  it("restores each key to the dynamic key's own binding and frees the slot", () => {
    const { keymap, slots } = bound();
    expect(unbindDynamicKey(keymap, slots, 0)).toMatchObject({
      changedSlots: [0],
      changedKeymapEntries: [{ layer: 0, id: 2, keycode: F }],
    });
    expect(unbindDynamicKey(keymap, slots, 1).changedKeymapEntries).toEqual([
      { layer: 0, id: 0, keycode: S },
    ]);
    expect(unbindDynamicKey(keymap, slots, 2).changedKeymapEntries).toEqual([
      { layer: 0, id: 4, keycode: H },
    ]);
    const mutex = unbindDynamicKey(keymap, slots, 3);
    expect(mutex.changedKeymapEntries).toEqual([
      { layer: 0, id: 1, keycode: A },
      { layer: 0, id: 3, keycode: D },
    ]);
    expect(mutex.slots[3]).toEqual(NONE);
    expect(mutex.slots[0]).toBe(slots[0]);
  });

  it('does nothing for empty or missing slots', () => {
    const { keymap, slots } = bound();
    for (const slot of [4, 40, -1]) {
      const result = unbindDynamicKey(keymap, slots, slot);
      expect(result).toMatchObject({ changedSlots: [], changedKeymapEntries: [] });
      expect(result.keymap).toBe(keymap);
    }
  });

  it('unbinds several slots at once', () => {
    const { keymap, slots } = bound();
    const result = unbindDynamicKeys(keymap, slots, [0, 2]);
    expect(result.changedSlots).toEqual([0, 2]);
    expect(result.changedKeymapEntries).toEqual([
      { layer: 0, id: 2, keycode: F },
      { layer: 0, id: 4, keycode: H },
    ]);
  });
});

describe('setKeymapEntries', () => {
  it('reports only entries that change', () => {
    const { keymap, slots } = bound();
    const result = setKeymapEntries(keymap, slots, [
      { layer: 1, id: 0, keycode: A },
      { layer: 0, id: 5, keycode: 0x08 },
    ]);
    expect(result.changedKeymapEntries).toEqual([{ layer: 1, id: 0, keycode: A }]);
    expect(result.changedSlots).toEqual([]);
    expect(result.slots).toBe(slots);
  });

  it('releases a dynamic key whose key is overwritten', () => {
    const { keymap, slots } = bound();
    const result = setKeymapEntries(keymap, slots, [{ layer: 0, id: 2, keycode: A }]);
    expect(result.slots[0]).toEqual(NONE);
    expect(result.changedSlots).toEqual([0]);
    expect(result.changedKeymapEntries).toEqual([{ layer: 0, id: 2, keycode: A }]);
  });

  it('releases a mutex that loses one key and restores the other', () => {
    const { keymap, slots } = bound();
    const result = setKeymapEntries(keymap, slots, [{ layer: 0, id: 3, keycode: ESC }]);
    expect(result.slots[3]).toEqual(NONE);
    expect(result.changedKeymapEntries).toEqual([
      { layer: 0, id: 1, keycode: A },
      { layer: 0, id: 3, keycode: ESC },
    ]);
  });

  it('re-targets a dynamic key referenced from an earlier key', () => {
    const { keymap, slots } = bound();
    const result = setKeymapEntries(keymap, slots, [{ layer: 0, id: 1, keycode: dk(2) }]);
    expect(result.slots[2]).toMatchObject({ kind: 'toggle', target: at(0, 1) });
    expect(result.slots[3]).toEqual(NONE);
    expect(result.changedSlots).toEqual([2, 3]);
    expect(result.changedKeymapEntries).toEqual([
      { layer: 0, id: 1, keycode: dk(2) },
      { layer: 0, id: 3, keycode: D },
    ]);
  });

  it('rejects entries outside the keymap', () => {
    const { keymap, slots } = bound();
    expect(() => setKeymapEntries(keymap, slots, [{ layer: 0, id: 99, keycode: A }])).toThrow(
      RangeError
    );
    expect(() => setKeymapEntries(keymap, slots, [{ layer: 0, id: 1, keycode: 0x10000 }])).toThrow(
      RangeError
    );
  });
});

describe('releaseIncompleteDynamicKeys', () => {
  it('frees dynamic keys without keys and half-bound mutexes', () => {
    const { slots } = fixture();
    const keymap = [[0, dk(3), 0, 0, dk(2)]];
    const result = releaseIncompleteDynamicKeys(keymap, rebuildTargets(keymap, slots));
    expect(result.changedSlots).toEqual([0, 1, 3]);
    expect(result.slots[2]).toMatchObject({ kind: 'toggle', target: at(0, 4) });
    expect(result.changedKeymapEntries).toEqual([{ layer: 0, id: 1, keycode: A }]);
  });

  it('changes nothing when every dynamic key is placed', () => {
    const { keymap, slots } = bound();
    expect(releaseIncompleteDynamicKeys(keymap, slots)).toMatchObject({
      changedSlots: [],
      changedKeymapEntries: [],
    });
  });
});
