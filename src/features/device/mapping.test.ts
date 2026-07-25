import {
  AdvancedKey,
  CalibrationMode,
  DynamicKey,
  DynamicKeyModTap,
  DynamicKeyMutex,
  DynamicKeyMutexMode,
  DynamicKeyStroke4x4,
  DynamicKeyToggleKey,
  KeyMode,
  RGBBaseConfig,
  RGBBaseMode,
  RGBConfig,
  RGBMode,
  ScriptLevel,
  ZelliaStarlightController,
  type IDynamicKey,
} from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  deepFreeze,
  readDeviceConfig,
  readFeatureFlags,
  readFirmwareVersion,
  readModelInfo,
  toAdvancedKeyConfig,
  toControllerAdvancedKey,
  toControllerDynamicKey,
  toControllerKeymap,
  toControllerRgbBase,
  toControllerRgbConfig,
  toDynamicKeySlot,
  toRgbBaseConfig,
  toRgbKeyConfig,
} from './mapping';
import { MODELS } from './models';
import { dynamicKeyKeycode } from './model/dynamic-key-binding';
import type { AdvancedKeyConfig, DynamicKeySlot, RgbBaseConfig, RgbKeyConfig } from './model/types';

const ADVANCED: AdvancedKeyConfig = {
  mode: KeyMode.KeyAnalogSpeedMode,
  calibrationMode: CalibrationMode.KeyAutoCalibrationNegative,
  activation: 0.4,
  deactivation: 0.35,
  triggerDistance: 0.05,
  releaseDistance: 0.06,
  triggerSpeed: 0.02,
  releaseSpeed: 0.03,
  upperDeadzone: 0.01,
  lowerDeadzone: 0.1,
  upperBound: 2500,
  lowerBound: 150,
};

const RGB_BASE: RgbBaseConfig = {
  mode: RGBBaseMode.RgbBaseModeWave,
  color: { red: 10, green: 20, blue: 30 },
  secondaryColor: { red: 40, green: 50, blue: 60 },
  speed: 42,
  direction: 270,
  density: 12,
  brightness: 200,
};

const RGB_KEY: RgbKeyConfig = {
  mode: RGBMode.RgbModeJelly,
  color: { red: 1, green: 2, blue: 3 },
  speed: 99,
};

const SLOTS: readonly DynamicKeySlot[] = [
  { kind: 'none' },
  {
    kind: 'stroke',
    bindings: [0x09, 0x0200, 0x04, 0],
    keyControl: [0x3f, 0x04, 0x10, 0],
    distances: { pressBegin: 0.2, pressFully: 0.8, releaseBegin: 0.7, releaseFully: 0.3 },
    target: { layer: 1, id: 32 },
  },
  { kind: 'modTap', tap: 0x29, hold: 0x0100, durationMs: 250, target: { layer: 0, id: 30 } },
  { kind: 'toggle', binding: 0x39, target: { layer: 2, id: 4 } },
  {
    kind: 'mutex',
    bindings: [0x04, 0x07],
    mode: DynamicKeyMutexMode.DKMutexKey2Priority,
    targets: [
      { layer: 0, id: 31 },
      { layer: 0, id: 33 },
    ],
  },
];

describe('advanced keys', () => {
  it('round-trips through a fresh controller AdvancedKey', () => {
    const key = toControllerAdvancedKey(ADVANCED);
    expect(key).toBeInstanceOf(AdvancedKey);
    expect(key.config).toMatchObject({
      mode: ADVANCED.mode,
      calibration_mode: ADVANCED.calibrationMode,
      activation_value: 0.4,
      lower_deadzone: 0.1,
      upper_bound: 2500,
    });
    expect(toAdvancedKeyConfig(key)).toEqual(ADVANCED);
  });

  it('reads the nested config and validates device values', () => {
    const key = new AdvancedKey({
      activation_value: 1.5,
      deactivation_value: Number.NaN,
      upper_bound: 70000,
    });
    Object.assign(key.config, { mode: 9, calibration_mode: 7 });
    expect(toAdvancedKeyConfig(key)).toMatchObject({
      mode: KeyMode.KeyAnalogNormalMode,
      calibrationMode: CalibrationMode.KeyNoCalibration,
      activation: 1,
      deactivation: 0,
      upperBound: 0xffff,
    });
  });
});

describe('lighting', () => {
  it('round-trips the RGB base config through a controller RGBBaseConfig', () => {
    const config = toControllerRgbBase(RGB_BASE);
    expect(config).toBeInstanceOf(RGBBaseConfig);
    expect(config).toMatchObject({ rgb: { red: 10 }, secondary_rgb: { blue: 60 }, speed: 42 });
    expect(toRgbBaseConfig(config)).toEqual(RGB_BASE);
  });

  it('round-trips per-key RGB configs', () => {
    expect(toControllerRgbConfig(RGB_KEY)).toEqual({
      mode: RGB_KEY.mode,
      rgb: RGB_KEY.color,
      speed: 99,
    });
    expect(toRgbKeyConfig(toControllerRgbConfig(RGB_KEY))).toEqual(RGB_KEY);
  });

  it('validates colours and modes', () => {
    const invalid = Object.assign(new RGBConfig(), {
      mode: 99,
      rgb: { red: 300, green: -4, blue: 12.7 },
      speed: -1,
    });
    expect(toRgbKeyConfig(invalid)).toEqual({
      mode: RGBMode.RgbModeFixed,
      color: { red: 255, green: 0, blue: 12 },
      speed: 0,
    });
  });
});

describe('dynamic keys', () => {
  it('builds the matching controller class with target key locations', () => {
    const [none, stroke, modTap, toggle, mutex] = SLOTS.map(toControllerDynamicKey);
    expect(none).toBeInstanceOf(DynamicKey);
    expect(stroke).toBeInstanceOf(DynamicKeyStroke4x4);
    expect(stroke).toMatchObject({
      type: 1,
      bindings: [0x09, 0x0200, 0x04, 0],
      key_control: [0x3f, 0x04, 0x10, 0],
      press_begin_distance: 0.2,
      release_fully_distance: 0.3,
      target_keys_location: [{ layer: 1, id: 32 }],
    });
    expect(modTap).toBeInstanceOf(DynamicKeyModTap);
    expect(modTap).toMatchObject({ bindings: [0x29, 0x0100], duration: 250 });
    expect(toggle).toBeInstanceOf(DynamicKeyToggleKey);
    expect(toggle).toMatchObject({ bindings: [0x39], target_keys_location: [{ layer: 2, id: 4 }] });
    expect(mutex).toBeInstanceOf(DynamicKeyMutex);
    expect(mutex).toMatchObject({
      bindings: [0x04, 0x07],
      mode: DynamicKeyMutexMode.DKMutexKey2Priority,
      target_keys_location: [
        { layer: 0, id: 31 },
        { layer: 0, id: 33 },
      ],
    });
  });

  it('round-trips every kind (targets are not read back from the controller)', () => {
    for (const slot of SLOTS) {
      const back = toDynamicKeySlot(toControllerDynamicKey(slot));
      const expected =
        slot.kind === 'none'
          ? slot
          : slot.kind === 'mutex'
            ? { ...slot, targets: [null, null] }
            : { ...slot, target: null };
      expect(back).toEqual(expected);
    }
  });

  it('omits missing targets and treats unknown or inconsistent keys as empty', () => {
    expect(
      toControllerDynamicKey({ kind: 'toggle', binding: 4, target: null }).target_keys_location
    ).toEqual([]);
    const odd = new DynamicKey();
    odd.type = 1;
    expect(toDynamicKeySlot(odd)).toEqual({ kind: 'none' });
    const unknown: IDynamicKey = new DynamicKeyToggleKey();
    unknown.type = 42;
    expect(toDynamicKeySlot(unknown)).toEqual({ kind: 'none' });
  });
});

describe('readDeviceConfig', () => {
  function seededController() {
    const controller = new ZelliaStarlightController();
    const keymap = controller.get_keymap().map(layer => [...layer]);
    keymap[0]?.splice(2, 1, dynamicKeyKeycode(1));
    controller.set_keymap(keymap);
    const toggle = new DynamicKeyToggleKey();
    toggle.bindings = [0x39];
    const keys = controller.get_dynamic_keys();
    keys[1] = toggle;
    controller.set_dynamic_keys(keys);
    return controller;
  }

  it('maps every cache into plain, deeply frozen domain values', () => {
    const controller = seededController();
    const config = readDeviceConfig(controller);
    expect(config.advancedKeys).toHaveLength(70);
    expect(config.keymap).toEqual(controller.get_keymap());
    expect(config.rgbKeys).toHaveLength(70);
    expect(config.dynamicKeys).toHaveLength(32);
    expect(config.profileIndex).toBe(0);
    expect(config.profileCount).toBe(4);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.keymap[0])).toBe(true);
    expect(Object.isFrozen(config.advancedKeys[0])).toBe(true);
    expect(Object.isFrozen(config.rgbBase.color)).toBe(true);
  });

  it('rebuilds dynamic-key targets from the keymap', () => {
    const config = readDeviceConfig(seededController());
    expect(config.dynamicKeys[1]).toEqual({
      kind: 'toggle',
      binding: 0x39,
      target: { layer: 0, id: 2 },
    });
  });

  it('shares nothing with the controller caches', () => {
    const controller = seededController();
    const config = readDeviceConfig(controller);
    controller.get_keymap()[0]?.splice(0, 1, 0x1234);
    const first = controller.get_advanced_keys()[0];
    if (first) first.config.activation_value = 0.9;
    controller.get_rgb_base_config().rgb.red = 1;
    const rgbKey = controller.get_rgb_configs()[0];
    if (rgbKey) rgbKey.rgb.green = 2;
    expect(config.keymap[0]?.[0]).not.toBe(0x1234);
    expect(config.advancedKeys[0]?.activation).not.toBe(0.9);
    expect(config.rgbBase.color.red).toBe(163);
    expect(config.rgbKeys[0]?.color.green).toBe(55);
  });

  it('produces controller objects that share nothing with the domain values', () => {
    const config = readDeviceConfig(seededController());
    const keymap = toControllerKeymap(config.keymap);
    keymap[0]?.splice(0, 1, 0x4321);
    expect(config.keymap[0]?.[0]).not.toBe(0x4321);
    const base = toControllerRgbBase(config.rgbBase);
    base.rgb.red = 7;
    expect(config.rgbBase.color.red).toBe(163);
  });
});

describe('metadata', () => {
  it('reads feature flags, firmware version and model info', () => {
    const controller = new ZelliaStarlightController();
    expect(readFeatureFlags(controller.get_feature())).toEqual({
      advancedKeys: true,
      rgb: true,
      scriptLevel: ScriptLevel.Disable,
      pollingRate: 8000,
      bootloader: { enabled: true, download: true, upload: true },
    });
    expect(readFirmwareVersion({ major: 0, minor: 1, patch: 3, info: 'x' })).toEqual({
      major: 0,
      minor: 1,
      patch: 3,
      info: 'x',
    });
    const [starlight] = MODELS;
    const info = readModelInfo(starlight, controller);
    expect(info).toMatchObject({ id: 'zellia-starlight', displayName: 'Zellia Starlight' });
    expect(info.layoutJson).toBe(controller.get_layout_json());
    expect(info.layoutLabels).toEqual(controller.get_layout_labels());
    expect(Object.isFrozen(info.layoutLabels[0])).toBe(true);
  });

  it('deep-freezes nested values once', () => {
    const value = deepFreeze({ list: [{ a: 1 }], nested: { b: [2] } });
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.nested.b)).toBe(true);
  });
});
