/**
 * Boundary between the mutable controller caches and the immutable domain model (spec §5.2).
 *
 * Reading copies every value (including the nested `advanced_keys[i].config`), validates it
 * (enums, byte/u16 ranges, fractions of travel) and deep-freezes the result, so nothing in the
 * store can alias or mutate controller state. Writing builds fresh controller objects every
 * time, so the controller never holds arrays or objects that belong to the store.
 */
import {
  AdvancedKey,
  CalibrationMode,
  DynamicKey,
  DynamicKeyModTap,
  DynamicKeyMutex,
  DynamicKeyMutexMode,
  DynamicKeyStroke4x4,
  DynamicKeyToggleKey,
  DynamicKeyType,
  KeyLocation as ControllerKeyLocation,
  KeyMode,
  RGBBaseConfig,
  RGBBaseMode,
  RGBMode,
  ScriptLevel,
  type FirmwareVersion as ControllerFirmwareVersion,
  type IAdvancedKey,
  type IDynamicKey,
  type IFeature,
  type IRGBBaseConfig,
  type IRGBConfig,
  type Srgb,
} from 'emi-keyboard-controller';
import type { DeviceController } from './controller';
import { rebuildTargets } from './model/dynamic-key-binding';
import type { ModelDefinition } from './models';
import type {
  AdvancedKeyConfig,
  DeviceConfig,
  DynamicKeySlot,
  FeatureFlags,
  FirmwareVersion,
  KeyLocation,
  Keycode,
  Keymap,
  ModelInfo,
  Rgb,
  RgbBaseConfig,
  RgbKeyConfig,
} from './model/types';

const BYTE = 0xff;
const U16 = 0xffff;
const U32 = 0xffffffff;

// ---------------------------------------------------------------------------------------------
// Validation helpers

function enumValues<E extends number>(enumObject: Record<string, E | string>): readonly E[] {
  return Object.values(enumObject).filter((value): value is E => typeof value === 'number');
}

const KEY_MODES = enumValues(KeyMode);
const CALIBRATION_MODES = enumValues(CalibrationMode);
const RGB_BASE_MODES = enumValues(RGBBaseMode);
const RGB_MODES = enumValues(RGBMode);
const MUTEX_MODES = enumValues(DynamicKeyMutexMode);
const SCRIPT_LEVELS = enumValues(ScriptLevel);

function asEnum<E extends number>(members: readonly E[], value: number, fallback: E): E {
  return members.find(member => member === value) ?? fallback;
}

function fraction(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

function integer(value: number, max: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 0), max) : 0;
}

function keycode(value: number): Keycode {
  return integer(value, U16);
}

function quad(values: readonly number[], map: (value: number) => number) {
  return [
    map(values[0] ?? 0),
    map(values[1] ?? 0),
    map(values[2] ?? 0),
    map(values[3] ?? 0),
  ] as const;
}

/** Freezes `value` and everything reachable from it. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    const children: unknown[] = Object.values(value);
    for (const child of children) deepFreeze(child);
  }
  return value;
}

// ---------------------------------------------------------------------------------------------
// Controller → domain

export function toAdvancedKeyConfig(key: IAdvancedKey): AdvancedKeyConfig {
  const { config } = key;
  return {
    mode: asEnum(KEY_MODES, config.mode, KeyMode.KeyAnalogNormalMode),
    calibrationMode: asEnum(
      CALIBRATION_MODES,
      config.calibration_mode,
      CalibrationMode.KeyNoCalibration
    ),
    activation: fraction(config.activation_value),
    deactivation: fraction(config.deactivation_value),
    triggerDistance: fraction(config.trigger_distance),
    releaseDistance: fraction(config.release_distance),
    triggerSpeed: fraction(config.trigger_speed),
    releaseSpeed: fraction(config.release_speed),
    upperDeadzone: fraction(config.upper_deadzone),
    lowerDeadzone: fraction(config.lower_deadzone),
    upperBound: integer(config.upper_bound, U16),
    lowerBound: integer(config.lower_bound, U16),
  };
}

function toRgb(color: Srgb): Rgb {
  return {
    red: integer(color.red, BYTE),
    green: integer(color.green, BYTE),
    blue: integer(color.blue, BYTE),
  };
}

export function toRgbBaseConfig(config: IRGBBaseConfig): RgbBaseConfig {
  return {
    mode: asEnum(RGB_BASE_MODES, config.mode, RGBBaseMode.RgbBaseModeBlank),
    color: toRgb(config.rgb),
    secondaryColor: toRgb(config.secondary_rgb),
    speed: integer(config.speed, U16),
    direction: integer(config.direction, U16),
    density: integer(config.density, BYTE),
    brightness: integer(config.brightness, BYTE),
  };
}

export function toRgbKeyConfig(config: IRGBConfig): RgbKeyConfig {
  return {
    mode: asEnum(RGB_MODES, config.mode, RGBMode.RgbModeFixed),
    color: toRgb(config.rgb),
    speed: integer(config.speed, U16),
  };
}

const STROKE: number = DynamicKeyType.DynamicKeyStroke;
const MOD_TAP: number = DynamicKeyType.DynamicKeyModTap;
const TOGGLE: number = DynamicKeyType.DynamicKeyToggleKey;
const MUTEX: number = DynamicKeyType.DynamicKeyMutex;

/** Maps a controller dynamic key; targets are rebuilt from the keymap afterwards (D4). */
export function toDynamicKeySlot(key: IDynamicKey): DynamicKeySlot {
  if (key instanceof DynamicKeyStroke4x4 && key.type === STROKE) {
    return {
      kind: 'stroke',
      bindings: quad(key.bindings, keycode),
      keyControl: quad(key.key_control, control => integer(control, BYTE)),
      distances: {
        pressBegin: fraction(key.press_begin_distance),
        pressFully: fraction(key.press_fully_distance),
        releaseBegin: fraction(key.release_begin_distance),
        releaseFully: fraction(key.release_fully_distance),
      },
      target: null,
    };
  }
  if (key instanceof DynamicKeyModTap && key.type === MOD_TAP) {
    return {
      kind: 'modTap',
      tap: keycode(key.bindings[0] ?? 0),
      hold: keycode(key.bindings[1] ?? 0),
      durationMs: integer(key.duration, U32),
      target: null,
    };
  }
  if (key instanceof DynamicKeyToggleKey && key.type === TOGGLE) {
    return { kind: 'toggle', binding: keycode(key.bindings[0] ?? 0), target: null };
  }
  if (key instanceof DynamicKeyMutex && key.type === MUTEX) {
    return {
      kind: 'mutex',
      bindings: [keycode(key.bindings[0] ?? 0), keycode(key.bindings[1] ?? 0)],
      mode: asEnum(MUTEX_MODES, key.mode, DynamicKeyMutexMode.DKMutexDistancePriority),
      targets: [null, null],
    };
  }
  return { kind: 'none' };
}

export function readKeymap(controller: Pick<DeviceController, 'get_keymap'>): Keycode[][] {
  return controller.get_keymap().map(layer => layer.map(keycode));
}

/** Snapshot of every configuration cache, targets rebuilt from the keymap, deeply frozen. */
export function readDeviceConfig(controller: DeviceController): DeviceConfig {
  const keymap = readKeymap(controller);
  return deepFreeze({
    advancedKeys: controller.get_advanced_keys().map(toAdvancedKeyConfig),
    keymap,
    rgbBase: toRgbBaseConfig(controller.get_rgb_base_config()),
    rgbKeys: controller.get_rgb_configs().map(toRgbKeyConfig),
    dynamicKeys: rebuildTargets(keymap, controller.get_dynamic_keys().map(toDynamicKeySlot)),
    profileIndex: integer(controller.get_profile_index(), BYTE),
    profileCount: integer(controller.get_profile_num(), BYTE),
  });
}

export function readFeatureFlags(feature: IFeature): FeatureFlags {
  return deepFreeze({
    advancedKeys: feature.advanced_key_flag,
    rgb: feature.rgb_flag,
    scriptLevel: asEnum(SCRIPT_LEVELS, feature.script_level, ScriptLevel.Disable),
    pollingRate: integer(feature.polling_rate, U32),
    bootloader: {
      enabled: feature.bootloader.enable,
      download: feature.bootloader.download,
      upload: feature.bootloader.upload,
    },
  });
}

export function readFirmwareVersion(version: ControllerFirmwareVersion): FirmwareVersion {
  return deepFreeze({
    major: integer(version.major, U32),
    minor: integer(version.minor, U32),
    patch: integer(version.patch, U32),
    info: version.info,
  });
}

export function readModelInfo(
  model: ModelDefinition,
  controller: Pick<DeviceController, 'get_layout_json' | 'get_layout_labels'>
): ModelInfo {
  return deepFreeze({
    id: model.id,
    displayName: model.displayName,
    layoutJson: controller.get_layout_json(),
    layoutLabels: controller.get_layout_labels().map(group => group.map(String)),
  });
}

// ---------------------------------------------------------------------------------------------
// Domain → controller (always fresh objects)

export function toControllerAdvancedKey(config: AdvancedKeyConfig): AdvancedKey {
  return new AdvancedKey({
    mode: config.mode,
    calibration_mode: config.calibrationMode,
    activation_value: config.activation,
    deactivation_value: config.deactivation,
    trigger_distance: config.triggerDistance,
    release_distance: config.releaseDistance,
    trigger_speed: config.triggerSpeed,
    release_speed: config.releaseSpeed,
    upper_deadzone: config.upperDeadzone,
    lower_deadzone: config.lowerDeadzone,
    upper_bound: config.upperBound,
    lower_bound: config.lowerBound,
  });
}

function toSrgb(color: Rgb): Srgb {
  return { red: color.red, green: color.green, blue: color.blue };
}

export function toControllerRgbBase(config: RgbBaseConfig): RGBBaseConfig {
  const result = new RGBBaseConfig();
  result.mode = config.mode;
  result.rgb = toSrgb(config.color);
  result.secondary_rgb = toSrgb(config.secondaryColor);
  result.speed = config.speed;
  result.direction = config.direction;
  result.density = config.density;
  result.brightness = config.brightness;
  return result;
}

export function toControllerRgbConfig(config: RgbKeyConfig): IRGBConfig {
  return { mode: config.mode, rgb: toSrgb(config.color), speed: config.speed };
}

function toControllerLocation(location: KeyLocation): ControllerKeyLocation {
  const result = new ControllerKeyLocation();
  result.layer = location.layer;
  result.id = location.id;
  return result;
}

/** The leading known targets (a later target never moves into an earlier position). */
function locations(targets: readonly (KeyLocation | null)[]): ControllerKeyLocation[] {
  const known = targets.findIndex(target => target === null);
  return targets
    .slice(0, known < 0 ? targets.length : known)
    .flatMap(target => (target ? [toControllerLocation(target)] : []));
}

export function toControllerDynamicKey(slot: DynamicKeySlot): IDynamicKey {
  switch (slot.kind) {
    case 'none':
      return new DynamicKey();
    case 'stroke': {
      const key = new DynamicKeyStroke4x4();
      key.bindings = [...slot.bindings];
      key.key_control = [...slot.keyControl];
      key.press_begin_distance = slot.distances.pressBegin;
      key.press_fully_distance = slot.distances.pressFully;
      key.release_begin_distance = slot.distances.releaseBegin;
      key.release_fully_distance = slot.distances.releaseFully;
      key.target_keys_location = locations([slot.target]);
      return key;
    }
    case 'modTap': {
      const key = new DynamicKeyModTap();
      key.bindings = [slot.tap, slot.hold];
      key.duration = slot.durationMs;
      key.target_keys_location = locations([slot.target]);
      return key;
    }
    case 'toggle': {
      const key = new DynamicKeyToggleKey();
      key.bindings = [slot.binding];
      key.target_keys_location = locations([slot.target]);
      return key;
    }
    case 'mutex': {
      const key = new DynamicKeyMutex();
      key.bindings = [...slot.bindings];
      key.mode = slot.mode;
      key.target_keys_location = locations(slot.targets);
      return key;
    }
  }
}

export function toControllerKeymap(keymap: Keymap): number[][] {
  return keymap.map(layer => [...layer]);
}

// ---------------------------------------------------------------------------------------------
// Validation of domain values before they reach the wire (DataView setters wrap silently)

function assertMember(members: readonly number[], value: number, label: string): void {
  if (!members.includes(value)) throw new RangeError(`${label} ${value} is not supported`);
}

function assertUint(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} ${value} is out of range 0..${max}`);
  }
}

function assertFraction(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} ${value} is not a fraction of travel (0..1)`);
  }
}

function assertRgb(color: Rgb, label: string): void {
  assertUint(color.red, BYTE, `${label} red`);
  assertUint(color.green, BYTE, `${label} green`);
  assertUint(color.blue, BYTE, `${label} blue`);
}

export function assertAdvancedKeyConfig(config: AdvancedKeyConfig): void {
  assertMember(KEY_MODES, config.mode, 'Key mode');
  assertMember(CALIBRATION_MODES, config.calibrationMode, 'Calibration mode');
  assertFraction(config.activation, 'Activation');
  assertFraction(config.deactivation, 'Deactivation');
  assertFraction(config.triggerDistance, 'Trigger distance');
  assertFraction(config.releaseDistance, 'Release distance');
  assertFraction(config.triggerSpeed, 'Trigger speed');
  assertFraction(config.releaseSpeed, 'Release speed');
  assertFraction(config.upperDeadzone, 'Upper deadzone');
  assertFraction(config.lowerDeadzone, 'Lower deadzone');
  assertUint(config.upperBound, U16, 'Upper bound');
  assertUint(config.lowerBound, U16, 'Lower bound');
}

export function assertRgbBaseConfig(config: RgbBaseConfig): void {
  assertMember(RGB_BASE_MODES, config.mode, 'RGB base mode');
  assertRgb(config.color, 'Colour');
  assertRgb(config.secondaryColor, 'Secondary colour');
  assertUint(config.speed, U16, 'Speed');
  assertUint(config.direction, U16, 'Direction');
  assertUint(config.density, BYTE, 'Density');
  assertUint(config.brightness, BYTE, 'Brightness');
}

export function assertRgbKeyConfig(config: RgbKeyConfig): void {
  assertMember(RGB_MODES, config.mode, 'RGB mode');
  assertRgb(config.color, 'Colour');
  assertUint(config.speed, U16, 'Speed');
}
