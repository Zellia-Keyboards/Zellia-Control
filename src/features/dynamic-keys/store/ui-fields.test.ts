import { RGBBaseMode } from 'emi-keyboard-controller';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DeviceConfig, DynamicKeySlot, KeyLocation, Keycode } from '../../device';
import { kc } from '../../keycodes';
import { uiFields, uiFieldsStore, useUiFields } from './ui-fields';

const at = (layer: number, id: number): KeyLocation => ({ layer, id });
const NULL_BIND = { bottomOutMm: 3, actuationMm: 1.5, rtDown: 0.1, rtUp: 0, continuous: false };
const NONE: DynamicKeySlot = { kind: 'none' };
const MOD_TAP: DynamicKeySlot = { kind: 'modTap', tap: 4, hold: 5, durationMs: 150, target: at(0, 1) };
const TOGGLE: DynamicKeySlot = { kind: 'toggle', binding: 6, target: at(0, 2) };
const MUTEX: DynamicKeySlot = { kind: 'mutex', bindings: [7, 8], mode: 1, targets: [at(0, 3), at(0, 4)] };

/** A snapshot whose layer 0 is `keys` and whose dynamic keys are `dynamicKeys`. */
function config(keys: readonly Keycode[], dynamicKeys: readonly DynamicKeySlot[]): DeviceConfig {
  return {
    advancedKeys: [],
    keymap: [[...keys]],
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
}

const dk = (slot: number) => kc.dynamicKey(slot);
/** Mod-tap on key 1, toggle on key 2, mutex on keys 3 and 4. */
const BEFORE = config([0x08, dk(0), dk(1), dk(2), dk(2)], [MOD_TAP, TOGGLE, MUTEX, NONE]);
/** BEFORE without the mod-tap: its key has its tap back, the mutex moved down into slot 0. */
const WITHOUT_MOD_TAP = config([0x08, 4, dk(1), dk(0), dk(0)], [MUTEX, TOGGLE, NONE, NONE]);

function rememberAll(): void {
  uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
  uiFields.setToggle(at(0, 2), { trigger: 'release', state: true });
  uiFields.setNullBind(at(0, 3), NULL_BIND);
}

afterEach(() => {
  uiFields.reset();
});

describe('dynamic-key UI fields (session memory, D5)', () => {
  it('keeps each kind’s fields per key location', () => {
    uiFields.setTapHold(at(0, 12), { holdDelayMs: 450 });
    uiFields.setToggle(at(1, 12), { trigger: 'release', state: true });
    uiFields.setNullBind(at(0, 31), NULL_BIND);

    const state = uiFieldsStore.getState();
    expect(state.tapHold['0:12']).toEqual({ holdDelayMs: 450 });
    expect(state.tapHold['1:12']).toBeUndefined();
    expect(state.toggle['1:12']).toEqual({ trigger: 'release', state: true });
    expect(state.nullBind['0:31']).toEqual(NULL_BIND);
  });

  it('replaces a key’s record and forgets the given keys', () => {
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
    uiFields.setTapHold(at(0, 2), { holdDelayMs: 400 });
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 500 });
    uiFields.forget('tapHold', [at(0, 2)]);

    expect(uiFieldsStore.getState().tapHold).toEqual({ '0:1': { holdDelayMs: 500 } });
  });

  it('forgets the fields of a deleted dynamic key', () => {
    uiFields.setTapHold(at(0, 1), { holdDelayMs: 300 });
    uiFields.setToggle(at(0, 1), { trigger: 'release', state: true });
    uiFields.setNullBind(at(0, 2), NULL_BIND);

    uiFields.forgetDynamicKey({ kind: 'modTap', tap: 4, hold: 5, durationMs: 1, target: at(0, 1) });
    expect(uiFieldsStore.getState().tapHold).toEqual({});
    expect(uiFieldsStore.getState().toggle['0:1']).toBeDefined();

    uiFields.forgetDynamicKey({
      kind: 'mutex',
      bindings: [4, 5],
      mode: 1,
      targets: [at(0, 2), at(0, 3)],
    });
    expect(uiFieldsStore.getState().nullBind).toEqual({});
  });

  it('forgets the fields of what a command removed, also when slots moved', () => {
    rememberAll();
    uiFields.forgetRemoved(BEFORE, WITHOUT_MOD_TAP);
    expect(uiFieldsStore.getState()).toEqual({
      tapHold: {},
      toggle: { '0:2': { trigger: 'release', state: true } },
      nullBind: { '0:3': NULL_BIND },
    });

    const empty = config([0x08, 4, 6, 7, 8], [NONE, NONE, NONE, NONE]);
    uiFields.forgetRemoved(WITHOUT_MOD_TAP, empty);
    expect(uiFieldsStore.getState()).toEqual({ tapHold: {}, toggle: {}, nullBind: {} });
  });

  it('keeps the fields when the command was rejected or the keyboard is gone', () => {
    rememberAll();
    const remembered = uiFieldsStore.getState();
    // A rejected command leaves the snapshot as it was.
    uiFields.forgetRemoved(BEFORE, BEFORE);
    uiFields.forgetRemoved(BEFORE, null);
    uiFields.forgetRemoved(null, WITHOUT_MOD_TAP);
    expect(uiFieldsStore.getState()).toEqual(remembered);
  });

  it('serves the store to components and follows updates', () => {
    const all = renderHook(() => useUiFields(state => state.tapHold));
    expect(all.result.current).toEqual({});

    act(() => {
      uiFields.setTapHold(at(0, 5), { holdDelayMs: 250 });
      uiFields.setNullBind(at(0, 5), NULL_BIND);
    });

    expect(all.result.current).toEqual({ '0:5': { holdDelayMs: 250 } });
  });
});
