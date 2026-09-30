/**
 * Device-side state of the virtual libamp keyboard, modelled on the firmware:
 *
 * - `active` is the working configuration (`g_keymap`, `g_keyboard_advanced_keys`, RGB, dynamic
 *   keys). GET requests read it and SET requests write it.
 * - `profiles` are the persisted profile files. `KeyboardSave` copies `active` into the current
 *   profile; selecting a profile (or rebooting) restores `active` from storage, discarding unsaved
 *   changes (`keyboard_profile_select` → `keyboard_profile_restore`).
 * - `config` (NKRO, debug, …) is global and volatile, like `g_keyboard_config`.
 *
 * Values are stored exactly as they travel on the wire (raw u16 fractions, integer codes), so
 * tests can compare the controller's cache with `rawToFraction(raw)` without rounding noise.
 * Tests may mutate the state directly to simulate changes made on the keyboard itself.
 */
import {
  Keycode,
  KeyModifier,
  OholeoKeyboardController,
  RGBMode,
  TrinityPadController,
  Zellia60Controller,
  Zellia80Controller,
  ZelliaStarlightController,
  type IAdvancedKey,
  type IDynamicKey,
  type IFeature,
  type IMacroAction,
  type IRGBBaseConfig,
  type IRGBConfig,
} from 'emi-keyboard-controller';
import type {
  WireAdvancedKey,
  WireDynamicKey,
  WireFeature,
  WireMacroAction,
  WireRgb,
  WireRgbBase,
  WireRgbKey,
  WireVersion,
} from './protocol';

export type VirtualModelId =
  'zellia-starlight' | 'zellia-60' | 'zellia-80' | 'oholeo' | 'trinity-pad';

/** The subset of a vendored controller used to read its model defaults. */
interface ControllerDefaults {
  get_advanced_keys(): IAdvancedKey[];
  get_keymap(): number[][];
  get_rgb_base_config(): IRGBBaseConfig;
  get_rgb_configs(): IRGBConfig[];
  get_dynamic_keys(): IDynamicKey[];
  get_profile_num(): number;
  get_macros(): IMacroAction[][];
  get_feature(): IFeature;
}

export interface VirtualBootloader {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
}

export interface VirtualModel {
  readonly id: VirtualModelId;
  /** HID identity matched by the model's `detect()` rules. */
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly usagePage: number;
  readonly usage: number;
  /** DFU device exposed after `KeyboardBootloader`; null when the controller has no DFU filter. */
  readonly bootloader: VirtualBootloader | null;
  /** Key ids (layer 0) of the seeded stroke, mod-tap, toggle and mutex (two keys) dynamic keys. */
  readonly seedKeyIds: readonly [number, number, number, number, number];
  readonly createController: () => ControllerDefaults;
}

const RAW_HID = { usagePage: 0xff60, usage: 0x61 } as const;
const AT32_DFU: VirtualBootloader = {
  vendorId: 0x2e3c,
  productId: 0xdf11,
  productName: 'AT32 Bootloader DFU',
};
const STM32_DFU: VirtualBootloader = {
  vendorId: 0x0483,
  productId: 0xdf11,
  productName: 'STM32 BOOTLOADER',
};
const FULL_SIZE_SEED_KEYS = [32, 30, 34, 31, 33] as const;

export const VIRTUAL_MODELS: Readonly<Record<VirtualModelId, VirtualModel>> = {
  'zellia-starlight': {
    id: 'zellia-starlight',
    vendorId: 0xfeed,
    productId: 22319,
    productName: 'ZelliaKB',
    ...RAW_HID,
    bootloader: AT32_DFU,
    seedKeyIds: FULL_SIZE_SEED_KEYS,
    createController: () => new ZelliaStarlightController(),
  },
  'zellia-60': {
    id: 'zellia-60',
    vendorId: 0xfeed,
    productId: 22319,
    productName: 'Zellia 60 HE',
    ...RAW_HID,
    bootloader: AT32_DFU,
    seedKeyIds: FULL_SIZE_SEED_KEYS,
    createController: () => new Zellia60Controller(),
  },
  'zellia-80': {
    id: 'zellia-80',
    vendorId: 0xfeed,
    productId: 22319,
    productName: 'Zellia 80 HE',
    ...RAW_HID,
    bootloader: null,
    seedKeyIds: FULL_SIZE_SEED_KEYS,
    createController: () => new Zellia80Controller(),
  },
  oholeo: {
    id: 'oholeo',
    vendorId: 0xfeed,
    productId: 22319,
    productName: 'Oholeo Keyboard',
    ...RAW_HID,
    bootloader: STM32_DFU,
    seedKeyIds: FULL_SIZE_SEED_KEYS,
    createController: () => new OholeoKeyboardController(),
  },
  'trinity-pad': {
    id: 'trinity-pad',
    vendorId: 0xfeed,
    productId: 0xffff,
    productName: 'Trinity Pad',
    ...RAW_HID,
    bootloader: null,
    seedKeyIds: [0, 1, 2, 3, 4],
    createController: () => new TrinityPadController(),
  },
};

export interface VirtualProfile {
  advancedKeys: WireAdvancedKey[];
  /** `[layer][key]`. */
  keymap: number[][];
  rgbBase: WireRgbBase;
  rgbKeys: WireRgbKey[];
  dynamicKeys: WireDynamicKey[];
}

export interface VirtualScripts {
  source: Uint8Array;
  bytecode: Uint8Array;
}

export interface VirtualKeyboardState {
  readonly model: VirtualModel;
  firmware: WireVersion;
  feature: WireFeature;
  /** `g_keyboard_config` bits indexed by `KeyboardConfigCode` (debug, NKRO, …). */
  config: boolean[];
  profileIndex: number;
  /** Working configuration the firmware runs on. */
  active: VirtualProfile;
  /** Persisted profile files. */
  profiles: VirtualProfile[];
  /** `[macro][action]`; the seed contains no recorded macros (all actions are MacroEnd). */
  macros: WireMacroAction[][];
  scripts: VirtualScripts;
}

export interface VirtualKeyboardStateOptions {
  model?: VirtualModelId;
  /** Overrides of the reported firmware version (default 0.1.0). */
  firmware?: Partial<WireVersion>;
  /** Seed one dynamic key of each kind into profile 0 (default true). */
  seedDynamicKeys?: boolean;
}

export const DEFAULT_FIRMWARE: WireVersion = {
  major: 0,
  minor: 1,
  patch: 0,
  info: 'libamp-virtual',
};

/** `KeyboardConfig` defaults: only `enable_report` is on. */
const DEFAULT_CONFIG = [false, false, false, false, true, false] as const;

/** Volatile keyboard config after a (re)boot, indexed by `KeyboardConfigCode`. */
export function createDefaultConfig(): boolean[] {
  return [...DEFAULT_CONFIG];
}

const PROFILE_BASE_COLORS: readonly WireRgb[] = [
  { red: 255, green: 96, blue: 0 },
  { red: 0, green: 200, blue: 120 },
  { red: 30, green: 144, blue: 255 },
];

/** Quantizes a fraction of travel like the controller's `setUint16(value * 65535)`. */
export function fractionToRaw(fraction: number): number {
  const scaled = Math.trunc(fraction * 65535);
  return ((scaled % 65536) + 65536) % 65536;
}

/** Decodes a raw u16 fraction exactly like the controller (`raw / 65535`). */
export function rawToFraction(raw: number): number {
  return raw / 65535;
}

/** Keymap entry that routes a key to dynamic-key `slot`. */
export function dynamicKeyKeycode(slot: number): number {
  return Keycode.DynamicKey | (slot << 8);
}

function hueColor(hue: number): WireRgb {
  const sector = (((hue % 360) + 360) % 360) / 60;
  const rising = Math.round(255 * (1 - Math.abs((sector % 2) - 1)));
  if (sector < 1) return { red: 255, green: rising, blue: 0 };
  if (sector < 2) return { red: rising, green: 255, blue: 0 };
  if (sector < 3) return { red: 0, green: 255, blue: rising };
  if (sector < 4) return { red: 0, green: rising, blue: 255 };
  if (sector < 5) return { red: rising, green: 0, blue: 255 };
  return { red: 255, green: 0, blue: rising };
}

function wireAdvancedKey(key: IAdvancedKey): WireAdvancedKey {
  const { config } = key;
  return {
    mode: config.mode,
    calibrationMode: config.calibration_mode,
    activation: fractionToRaw(config.activation_value),
    deactivation: fractionToRaw(config.deactivation_value),
    triggerDistance: fractionToRaw(config.trigger_distance),
    releaseDistance: fractionToRaw(config.release_distance),
    triggerSpeed: fractionToRaw(config.trigger_speed),
    releaseSpeed: fractionToRaw(config.release_speed),
    upperDeadzone: fractionToRaw(config.upper_deadzone),
    lowerDeadzone: fractionToRaw(config.lower_deadzone),
    upperBound: Math.trunc(config.upper_bound),
    lowerBound: Math.trunc(config.lower_bound),
  };
}

function wireRgb(color: WireRgb): WireRgb {
  return { red: color.red, green: color.green, blue: color.blue };
}

function wireRgbBase(config: IRGBBaseConfig): WireRgbBase {
  return {
    mode: config.mode,
    color: wireRgb(config.rgb),
    secondaryColor: wireRgb(config.secondary_rgb),
    speed: config.speed,
    direction: config.direction % 65536,
    density: config.density % 256,
    brightness: config.brightness % 256,
  };
}

function wireRgbKey(config: IRGBConfig): WireRgbKey {
  return { mode: config.mode, color: wireRgb(config.rgb), speed: config.speed };
}

/** Factory defaults of a model: its controller's default cache, quantized to wire values. */
export function createFactoryProfile(model: VirtualModel): VirtualProfile {
  const defaults = model.createController();
  return {
    advancedKeys: defaults.get_advanced_keys().map(wireAdvancedKey),
    keymap: defaults.get_keymap().map(layer => [...layer]),
    rgbBase: wireRgbBase(defaults.get_rgb_base_config()),
    rgbKeys: defaults.get_rgb_configs().map(wireRgbKey),
    dynamicKeys: defaults.get_dynamic_keys().map((): WireDynamicKey => ({ type: 'none' })),
  };
}

function withVariedColors(profile: VirtualProfile, hueOffset: number): VirtualProfile {
  const count = Math.max(profile.rgbKeys.length, 1);
  return {
    ...profile,
    rgbKeys: profile.rgbKeys.map((key, index) => ({
      mode: index % 7 === 0 ? RGBMode.RgbModeStatic : key.mode,
      color: hueColor(hueOffset + (index * 360) / count),
      speed: key.speed,
    })),
  };
}

function withSeededDynamicKeys(profile: VirtualProfile, model: VirtualModel): VirtualProfile {
  const [strokeId, modTapId, toggleId, mutexFirstId, mutexSecondId] = model.seedKeyIds;
  const base = profile.keymap[0] ?? [];
  const original = (id: number) => base[id] ?? Keycode.NoEvent;
  const seeded: readonly WireDynamicKey[] = [
    {
      type: 'stroke',
      bindings: [original(strokeId), KeyModifier.KeyLeftShift << 8, 0, 0],
      // Binding 0 held from press-begin to release-fully; binding 1 tapped at press-fully.
      keyControl: [0x3f, 0x04, 0, 0],
      pressBegin: fractionToRaw(0.25),
      pressFully: fractionToRaw(0.75),
      releaseBegin: fractionToRaw(0.75),
      releaseFully: fractionToRaw(0.25),
      keyId: strokeId,
    },
    {
      type: 'modTap',
      bindings: [original(modTapId), KeyModifier.KeyLeftCtrl << 8],
      duration: 200,
      keyId: modTapId,
    },
    { type: 'toggle', binding: original(toggleId), keyId: toggleId },
    {
      type: 'mutex',
      bindings: [original(mutexFirstId), original(mutexSecondId)],
      keyIds: [mutexFirstId, mutexSecondId],
      mode: 1,
    },
  ];
  const slotByKey = new Map<number, number>([
    [strokeId, 0],
    [modTapId, 1],
    [toggleId, 2],
    [mutexFirstId, 3],
    [mutexSecondId, 3],
  ]);
  return {
    ...profile,
    keymap: profile.keymap.map((layer, layerIndex) =>
      layer.map((keycode, id) => {
        const slot = layerIndex === 0 ? slotByKey.get(id) : undefined;
        return slot === undefined ? keycode : dynamicKeyKeycode(slot);
      })
    ),
    dynamicKeys: profile.dynamicKeys.map((key, slot) => seeded[slot] ?? key),
  };
}

function createSeedProfile(model: VirtualModel, index: number, seedDynamicKeys: boolean) {
  const factory = createFactoryProfile(model);
  if (index === 0) {
    const coloured = withVariedColors(factory, 0);
    return seedDynamicKeys ? withSeededDynamicKeys(coloured, model) : coloured;
  }
  const variant = withVariedColors(factory, index * 90);
  return {
    ...variant,
    rgbBase: {
      ...variant.rgbBase,
      color: PROFILE_BASE_COLORS[(index - 1) % 3] ?? variant.rgbBase.color,
    },
    keymap: variant.keymap.map((layer, layerIndex) =>
      layerIndex === 0
        ? layer.map((keycode, id) => (id === 0 ? Keycode.F13 + index - 1 : keycode))
        : layer
    ),
  };
}

function wireFeature(feature: IFeature, profile: VirtualProfile, macros: readonly unknown[][]) {
  // Virtual-keyboard-defined bits (libamp's feature handler is still a TODO and the controller
  // never requests it): 0 advanced keys, 1 RGB, 2 dynamic keys, 3 macros.
  const features =
    (feature.advanced_key_flag ? 1 : 0) |
    (feature.rgb_flag ? 2 : 0) |
    (profile.dynamicKeys.length > 0 ? 4 : 0) |
    (macros.some(actions => actions.length > 0) ? 8 : 0);
  return { features, rgbFeatures: 0, scriptSupport: feature.script_level };
}

/** A deterministic device state: model defaults plus seeded dynamic keys and colours. */
export function createVirtualKeyboardState(
  options: VirtualKeyboardStateOptions = {}
): VirtualKeyboardState {
  const model = VIRTUAL_MODELS[options.model ?? 'zellia-starlight'];
  const defaults = model.createController();
  const seedDynamicKeys = options.seedDynamicKeys ?? true;
  const profiles = Array.from({ length: Math.max(defaults.get_profile_num(), 1) }, (_, index) =>
    createSeedProfile(model, index, seedDynamicKeys)
  );
  const [first] = profiles;
  const active = first ? cloneProfile(first) : createFactoryProfile(model);
  const macros = defaults.get_macros().map(actions =>
    actions.map((_, index): WireMacroAction => ({
      index,
      delay: 0,
      keyId: 0,
      isVirtual: false,
      event: 0,
      keycode: 0,
    }))
  );
  return {
    model,
    firmware: { ...DEFAULT_FIRMWARE, ...options.firmware },
    feature: wireFeature(defaults.get_feature(), active, macros),
    config: createDefaultConfig(),
    profileIndex: 0,
    active,
    profiles,
    macros,
    scripts: { source: new Uint8Array(0), bytecode: new Uint8Array(0) },
  };
}

/** Copies a profile; wire records are immutable, so sharing them is safe. */
export function cloneProfile(profile: VirtualProfile): VirtualProfile {
  return {
    advancedKeys: [...profile.advancedKeys],
    keymap: profile.keymap.map(layer => [...layer]),
    rgbBase: profile.rgbBase,
    rgbKeys: [...profile.rgbKeys],
    dynamicKeys: [...profile.dynamicKeys],
  };
}

/** `keyboard_profile_restore`: reload the working configuration from storage. */
export function restoreProfile(state: VirtualKeyboardState): void {
  const stored = state.profiles[state.profileIndex];
  if (stored) state.active = cloneProfile(stored);
}

/** `keyboard_profile_select`: switch (when valid), then restore from storage. */
export function selectProfile(state: VirtualKeyboardState, index: number): void {
  if (Number.isInteger(index) && index >= 0 && index < state.profiles.length) {
    state.profileIndex = index;
  }
  restoreProfile(state);
}

/** `keyboard_profile_save`: persist the working configuration into the current profile. */
export function saveProfile(state: VirtualKeyboardState): void {
  state.profiles[state.profileIndex] = cloneProfile(state.active);
}

/** `keyboard_profile_reset_to_default`: factory values in RAM only. */
export function resetActiveProfile(state: VirtualKeyboardState): void {
  state.active = createFactoryProfile(state.model);
}

/** `keyboard_factory_reset`: every profile back to factory values, profile 0 selected. */
export function factoryReset(state: VirtualKeyboardState): void {
  const factory = createFactoryProfile(state.model);
  state.profiles = state.profiles.map(() => cloneProfile(factory));
  state.profileIndex = 0;
  restoreProfile(state);
}

// ---------------------------------------------------------------------------------------------
// What a controller should hold after loading a profile (for integration assertions)

export interface ControllerAdvancedKeyView {
  mode: number;
  calibration_mode: number;
  activation_value: number;
  deactivation_value: number;
  trigger_distance: number;
  release_distance: number;
  trigger_speed: number;
  release_speed: number;
  upper_deadzone: number;
  lower_deadzone: number;
  upper_bound: number;
  lower_bound: number;
}

export type ControllerDynamicKeyView =
  | { type: 0 }
  | {
      type: 1;
      bindings: number[];
      key_control: number[];
      press_begin_distance: number;
      press_fully_distance: number;
      release_begin_distance: number;
      release_fully_distance: number;
    }
  | { type: 2; bindings: number[]; duration: number }
  | { type: 3; bindings: number[] }
  | { type: 4; bindings: number[]; mode: number };

export interface ControllerCacheView {
  advancedKeys: ControllerAdvancedKeyView[];
  keymap: number[][];
  rgbBase: {
    mode: number;
    rgb: WireRgb;
    secondary_rgb: WireRgb;
    speed: number;
    direction: number;
    density: number;
    brightness: number;
  };
  rgbConfigs: { mode: number; rgb: WireRgb; speed: number }[];
  /** The fields the controller parses (targets are never read back). */
  dynamicKeys: ControllerDynamicKeyView[];
}

function dynamicKeyView(key: WireDynamicKey): ControllerDynamicKeyView {
  switch (key.type) {
    case 'none':
      return { type: 0 };
    case 'stroke':
      return {
        type: 1,
        bindings: [...key.bindings],
        key_control: [...key.keyControl],
        press_begin_distance: rawToFraction(key.pressBegin),
        press_fully_distance: rawToFraction(key.pressFully),
        release_begin_distance: rawToFraction(key.releaseBegin),
        release_fully_distance: rawToFraction(key.releaseFully),
      };
    case 'modTap':
      return { type: 2, bindings: [...key.bindings], duration: key.duration };
    case 'toggle':
      return { type: 3, bindings: [key.binding] };
    case 'mutex':
      return { type: 4, bindings: [...key.bindings], mode: key.mode };
  }
}

/** The controller cache expected after `read_data()` of `profile`. */
export function expectedControllerCache(profile: VirtualProfile): ControllerCacheView {
  return {
    advancedKeys: profile.advancedKeys.map(key => ({
      mode: key.mode,
      calibration_mode: key.calibrationMode,
      activation_value: rawToFraction(key.activation),
      deactivation_value: rawToFraction(key.deactivation),
      trigger_distance: rawToFraction(key.triggerDistance),
      release_distance: rawToFraction(key.releaseDistance),
      trigger_speed: rawToFraction(key.triggerSpeed),
      release_speed: rawToFraction(key.releaseSpeed),
      upper_deadzone: rawToFraction(key.upperDeadzone),
      lower_deadzone: rawToFraction(key.lowerDeadzone),
      upper_bound: key.upperBound,
      lower_bound: key.lowerBound,
    })),
    keymap: profile.keymap.map(layer => [...layer]),
    rgbBase: {
      mode: profile.rgbBase.mode,
      rgb: wireRgb(profile.rgbBase.color),
      secondary_rgb: wireRgb(profile.rgbBase.secondaryColor),
      speed: profile.rgbBase.speed,
      direction: profile.rgbBase.direction,
      density: profile.rgbBase.density,
      brightness: profile.rgbBase.brightness,
    },
    rgbConfigs: profile.rgbKeys.map(key => ({
      mode: key.mode,
      rgb: wireRgb(key.color),
      speed: key.speed,
    })),
    dynamicKeys: profile.dynamicKeys.map(dynamicKeyView),
  };
}
