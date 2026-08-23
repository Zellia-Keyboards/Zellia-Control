import {
  Keycode,
  KeyModifier,
  Zellia80Controller,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  VIRTUAL_MODELS,
  cloneProfile,
  createFactoryProfile,
  createVirtualKeyboardState,
  dynamicKeyKeycode,
  expectedControllerCache,
  factoryReset,
  fractionToRaw,
  rawToFraction,
  resetActiveProfile,
  restoreProfile,
  saveProfile,
  selectProfile,
  unreachableDynamicKeySlots,
} from './state';

const DYNAMIC_KEY: number = Keycode.DynamicKey;
const dk = (slot: number) => DYNAMIC_KEY | (slot << 8);

describe('fraction conversions', () => {
  it('quantizes like the controller (u16, truncated) and decodes like it', () => {
    expect(fractionToRaw(0.5)).toBe(32767);
    expect(fractionToRaw(1)).toBe(65535);
    expect(fractionToRaw(0)).toBe(0);
    expect(rawToFraction(32767)).toBe(32767 / 65535);
  });
});

describe('createVirtualKeyboardState', () => {
  it('is deterministic', () => {
    expect(createVirtualKeyboardState()).toEqual(createVirtualKeyboardState());
  });

  it('seeds a Zellia Starlight from the controller defaults', () => {
    const state = createVirtualKeyboardState();
    const defaults = new ZelliaStarlightController();
    const profile = state.active;

    expect(state.model.id).toBe('zellia-starlight');
    expect(state.firmware).toMatchObject({ major: 0, minor: 1 });
    expect(state.profileIndex).toBe(0);
    expect(state.profiles).toHaveLength(defaults.get_profile_num());
    expect(profile).toEqual(state.profiles[0]);

    expect(profile.advancedKeys).toHaveLength(70);
    const first = defaults.get_advanced_keys()[0]?.config;
    expect(profile.advancedKeys[0]).toEqual({
      mode: first?.mode,
      calibrationMode: first?.calibration_mode,
      activation: fractionToRaw(0.5),
      deactivation: fractionToRaw(0.49),
      triggerDistance: fractionToRaw(0.08),
      releaseDistance: fractionToRaw(0.08),
      triggerSpeed: fractionToRaw(0.01),
      releaseSpeed: fractionToRaw(0.01),
      upperDeadzone: 0,
      lowerDeadzone: fractionToRaw(0.2),
      upperBound: 2600,
      lowerBound: 140,
    });

    expect(profile.keymap).toHaveLength(5);
    expect(profile.keymap.every(layer => layer.length === 64)).toBe(true);
    expect(profile.rgbBase).toEqual({
      mode: defaults.get_rgb_base_config().mode,
      color: defaults.get_rgb_base_config().rgb,
      secondaryColor: defaults.get_rgb_base_config().secondary_rgb,
      speed: 20,
      direction: 0,
      density: 0,
      brightness: 255,
    });
    expect(profile.rgbKeys).toHaveLength(70);
    expect(profile.dynamicKeys).toHaveLength(32);
    expect(state.config).toEqual([false, false, false, false, true, false]);
  });

  it('orders the Starlight keymap by layout key id, as the firmware does', () => {
    const defaults = new ZelliaStarlightController().get_keymap();
    const { keymap } = createFactoryProfile(VIRTUAL_MODELS['zellia-starlight']);

    // The controller transfers exactly as many entries as its default keymap has.
    expect(keymap.map(layer => layer.length)).toEqual(defaults.map(layer => layer.length));
    // Split backspace (14, 15) sits between Backspace (13) and Tab (16).
    expect(keymap[0]?.slice(12, 18)).toEqual([
      Keycode.Equal,
      Keycode.Backspace,
      Keycode.Backspace,
      Keycode.Delete,
      Keycode.Tab,
      Keycode.Q,
    ]);
    expect(keymap[0]?.slice(30, 32)).toEqual([Keycode.CapsLock, Keycode.A]);
    expect(keymap[0]?.[63]).toBe(Keycode.LeftArrow);
    expect(keymap[1]?.slice(16, 18)).toEqual([Keycode.KeyTransparent, Keycode.KeyTransparent]);
  });

  it('binds one dynamic key of each kind in the keymap', () => {
    const defaults = createFactoryProfile(VIRTUAL_MODELS['zellia-starlight']).keymap[0] ?? [];
    const { active } = createVirtualKeyboardState();
    const original = (id: number) => defaults[id] ?? -1;

    expect(active.dynamicKeys.slice(0, 4)).toEqual([
      {
        type: 'stroke',
        bindings: [original(32), KeyModifier.KeyLeftShift << 8, 0, 0],
        keyControl: [0x3f, 0x04, 0, 0],
        pressBegin: fractionToRaw(0.25),
        pressFully: fractionToRaw(0.75),
        releaseBegin: fractionToRaw(0.75),
        releaseFully: fractionToRaw(0.25),
        keyId: 32,
      },
      {
        type: 'modTap',
        bindings: [original(30), KeyModifier.KeyLeftCtrl << 8],
        duration: 200,
        keyId: 30,
      },
      { type: 'toggle', binding: original(34), keyId: 34 },
      { type: 'mutex', bindings: [original(31), original(33)], keyIds: [31, 33], mode: 1 },
    ]);
    expect(active.dynamicKeys.slice(4).every(key => key.type === 'none')).toBe(true);

    const layer0 = active.keymap[0] ?? [];
    expect([30, 31, 32, 33, 34].map(id => layer0[id])).toEqual([dk(1), dk(3), dk(0), dk(3), dk(2)]);
    expect(dynamicKeyKeycode(2)).toBe(dk(2));
    const otherLayers = active.keymap.slice(1).flat();
    expect(otherLayers.some(code => (code & 0xff) === DYNAMIC_KEY)).toBe(false);
  });

  it('varies per-key colours deterministically', () => {
    const { active } = createVirtualKeyboardState();
    const colours = new Set(active.rgbKeys.map(key => JSON.stringify(key.color)));
    expect(colours.size).toBeGreaterThan(30);
    expect(active.rgbKeys[0]).toEqual(createVirtualKeyboardState().active.rgbKeys[0]);
  });

  it('stores distinct profiles 1-3 without dynamic keys', () => {
    const state = createVirtualKeyboardState();
    const [first, ...others] = state.profiles;
    expect(others).toHaveLength(3);
    for (const [offset, profile] of others.entries()) {
      expect(profile.dynamicKeys.every(key => key.type === 'none')).toBe(true);
      expect(profile.rgbBase.color).not.toEqual(first?.rgbBase.color);
      expect(profile.keymap[0]?.[0]).toBe(Keycode.F13 + offset);
    }
  });

  it('seeds other models from their own controller defaults', () => {
    const state = createVirtualKeyboardState({ model: 'zellia-80' });
    const defaults = new Zellia80Controller();
    expect(state.model).toBe(VIRTUAL_MODELS['zellia-80']);
    expect(state.active.advancedKeys).toHaveLength(87);
    expect(state.active.keymap).toHaveLength(defaults.get_keymap().length);
    expect(state.active.keymap[0]).toHaveLength(87);
    expect(state.active.dynamicKeys.filter(key => key.type !== 'none')).toHaveLength(4);
  });

  it('can skip the dynamic-key seed and override the firmware version', () => {
    const state = createVirtualKeyboardState({
      seedDynamicKeys: false,
      firmware: { minor: 2, info: 'next' },
    });
    expect(state.active.dynamicKeys.every(key => key.type === 'none')).toBe(true);
    expect(state.firmware).toEqual({ major: 0, minor: 2, patch: 0, info: 'next' });
  });
});

describe('profile operations', () => {
  it('discards unsaved changes when switching profiles, like keyboard_profile_select', () => {
    const state = createVirtualKeyboardState();
    state.active.keymap[0]?.splice(0, 1, 0x1234);

    selectProfile(state, 2);
    expect(state.profileIndex).toBe(2);
    expect(state.active).toEqual(state.profiles[2]);

    selectProfile(state, 0);
    expect(state.active.keymap[0]?.[0]).toBe(Keycode.Escape);
  });

  it('persists the active profile on save and restores it on demand', () => {
    const state = createVirtualKeyboardState();
    state.active.keymap[0]?.splice(0, 1, 0x1234);
    saveProfile(state);
    expect(state.profiles[0]?.keymap[0]?.[0]).toBe(0x1234);

    state.active.keymap[0]?.splice(0, 1, 0x4321);
    restoreProfile(state);
    expect(state.active.keymap[0]?.[0]).toBe(0x1234);
  });

  it('keeps stored profiles independent from the active copy', () => {
    const state = createVirtualKeyboardState();
    state.active.keymap[1]?.splice(3, 1, 0x7777);
    state.active.dynamicKeys[5] = { type: 'toggle', binding: 4, keyId: 1 };
    expect(state.profiles[0]?.keymap[1]?.[3]).not.toBe(0x7777);
    expect(state.profiles[0]?.dynamicKeys[5]).toEqual({ type: 'none' });

    const copy = cloneProfile(state.active);
    copy.keymap[1]?.splice(3, 1, 1);
    expect(state.active.keymap[1]?.[3]).toBe(0x7777);
  });

  it('ignores out-of-range profile indices', () => {
    const state = createVirtualKeyboardState();
    selectProfile(state, 9);
    expect(state.profileIndex).toBe(0);
  });

  it('resets the active profile to factory defaults without saving', () => {
    const state = createVirtualKeyboardState();
    resetActiveProfile(state);
    expect(state.active).toEqual(createFactoryProfile(state.model));
    expect(state.active.dynamicKeys.every(key => key.type === 'none')).toBe(true);
    expect(state.profiles[0]?.dynamicKeys[0]?.type).toBe('stroke');
  });

  it('factory-resets every stored profile and selects profile 0', () => {
    const state = createVirtualKeyboardState();
    selectProfile(state, 3);
    factoryReset(state);
    const factory = createFactoryProfile(state.model);
    expect(state.profileIndex).toBe(0);
    expect(state.profiles).toEqual([factory, factory, factory, factory]);
    expect(state.active).toEqual(factory);
  });
});

describe('unreachableDynamicKeySlots', () => {
  it('lists dynamic keys behind the first empty slot, which libamp never runs', () => {
    const state = createVirtualKeyboardState();
    expect(unreachableDynamicKeySlots(state.active)).toEqual([]);
    state.active.dynamicKeys[1] = { type: 'none' };
    expect(unreachableDynamicKeySlots(state.active)).toEqual([2, 3]);
    state.active.dynamicKeys[0] = { type: 'none' };
    expect(unreachableDynamicKeySlots(state.active)).toEqual([2, 3]);
    expect(
      unreachableDynamicKeySlots(createVirtualKeyboardState({ seedDynamicKeys: false }).active)
    ).toEqual([]);
  });
});

describe('expectedControllerCache', () => {
  it('describes a profile the way the controller caches it after a load', () => {
    const { active } = createVirtualKeyboardState();
    const cache = expectedControllerCache(active);
    expect(cache.advancedKeys[0]).toEqual({
      mode: active.advancedKeys[0]?.mode,
      calibration_mode: active.advancedKeys[0]?.calibrationMode,
      activation_value: 32767 / 65535,
      deactivation_value: fractionToRaw(0.49) / 65535,
      trigger_distance: fractionToRaw(0.08) / 65535,
      release_distance: fractionToRaw(0.08) / 65535,
      trigger_speed: fractionToRaw(0.01) / 65535,
      release_speed: fractionToRaw(0.01) / 65535,
      upper_deadzone: 0,
      lower_deadzone: fractionToRaw(0.2) / 65535,
      upper_bound: 2600,
      lower_bound: 140,
    });
    expect(cache.keymap).toEqual(active.keymap);
    const defaults = createFactoryProfile(VIRTUAL_MODELS['zellia-starlight']).keymap[0] ?? [];
    expect(cache.dynamicKeys[3]).toEqual({
      type: 4,
      bindings: [defaults[31], defaults[33]],
      mode: 1,
    });
    expect(cache.dynamicKeys[1]).toEqual({
      type: 2,
      bindings: [defaults[30], KeyModifier.KeyLeftCtrl << 8],
      duration: 200,
    });
    expect(cache.dynamicKeys[4]).toEqual({ type: 0 });
    expect(cache.rgbBase).toEqual({
      mode: active.rgbBase.mode,
      rgb: active.rgbBase.color,
      secondary_rgb: active.rgbBase.secondaryColor,
      speed: active.rgbBase.speed,
      direction: active.rgbBase.direction,
      density: active.rgbBase.density,
      brightness: active.rgbBase.brightness,
    });
    expect(cache.rgbConfigs[1]).toEqual({
      mode: active.rgbKeys[1]?.mode,
      rgb: active.rgbKeys[1]?.color,
      speed: active.rgbKeys[1]?.speed,
    });
  });
});
