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
  DynamicKeyStroke4x4,
  DynamicKeyToggleKey,
  DynamicKeyType,
  KeyLocation as ControllerKeyLocation,
  KeyMode,
  MacroAction as ControllerMacroAction,
  RGBBaseConfig,
  RGBBaseMode,
  RGBMode,
  ScriptLevel,
  type FirmwareVersion as ControllerFirmwareVersion,
  type IAdvancedKey,
  type IDynamicKey,
  type IMacroAction,
  type IRGBBaseConfig,
  type IRGBConfig,
  type Srgb,
} from 'emi-keyboard-controller';
import type { DeviceController } from './controller';
import { rebuildTargets } from './model/dynamic-key-binding';
import { toMutexMode } from './model/mutex-mode';
import { assertFraction, assertUint, clampFraction } from './model/validation';
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
  MacroAction,
  ModelInfo,
  Rgb,
  RgbBaseConfig,
  RgbKeyConfig,
  ScriptConfig,
} from './model/types';

const BYTE = 0xff;
const U16 = 0xffff;
const U32 = 0xffffffff;
/** libamp `KeyboardEventType`s of macro actions. */
const KEY_DOWN = 0x03;
const KEY_UP = 0x01;
/** libamp `KEY_NO_EVENT`: the first action without a keycode ends a macro (`macro_process`). */
const END_MARKER_KEYCODE = 0;
/** Macro slots a keycode can address (`MACRO_KEYCODE_GET_INDEX`: the low nibble). */
const MAX_MACRO_SLOTS = 16;
const MACRO_EVENTS: readonly string[] = ['down', 'up'];

// ---------------------------------------------------------------------------------------------
// Validation helpers

function enumValues<E extends number>(enumObject: Record<string, E | string>): readonly E[] {
  return Object.values(enumObject).filter((value): value is E => typeof value === 'number');
}

const KEY_MODES = enumValues(KeyMode);
const CALIBRATION_MODES = enumValues(CalibrationMode);
const RGB_BASE_MODES = enumValues(RGBBaseMode);
const RGB_MODES = enumValues(RGBMode);
const SCRIPT_LEVELS = enumValues(ScriptLevel);

function asEnum<E extends number>(members: readonly E[], value: number, fallback: E): E {
  return members.find(member => member === value) ?? fallback;
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
    activation: clampFraction(config.activation_value),
    deactivation: clampFraction(config.deactivation_value),
    triggerDistance: clampFraction(config.trigger_distance),
    releaseDistance: clampFraction(config.release_distance),
    triggerSpeed: clampFraction(config.trigger_speed),
    releaseSpeed: clampFraction(config.release_speed),
    upperDeadzone: clampFraction(config.upper_deadzone),
    lowerDeadzone: clampFraction(config.lower_deadzone),
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
        pressBegin: clampFraction(key.press_begin_distance),
        pressFully: clampFraction(key.press_fully_distance),
        releaseBegin: clampFraction(key.release_begin_distance),
        releaseFully: clampFraction(key.release_fully_distance),
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
      // libamp's whole mode byte: the priority plus its bottom-out flag bits.
      mode: toMutexMode(integer(key.mode, BYTE)),
      targets: [null, null],
    };
  }
  return { kind: 'none' };
}

/** A controller's macro slots and the entries of each, the end marker included. */
export interface MacroCapacity {
  readonly slots: number;
  readonly actions: number;
}

/**
 * The capacity of the controller's macro cache: `get_macros().length` slots of
 * `get_macros()[0].length` entries (`read_macros` sizes every slot by the first). No entries means
 * no macros: the Zellia controllers keep the base class's `[[]]`.
 */
export function readMacroCapacity(controller: Pick<DeviceController, 'get_macros'>): MacroCapacity {
  const macros = controller.get_macros();
  const actions = integer(macros[0]?.length ?? 0, U16);
  return { slots: actions > 0 ? integer(macros.length, MAX_MACRO_SLOTS) : 0, actions };
}

export function toMacroAction(action: IMacroAction): MacroAction {
  const { event } = action;
  return {
    delay: integer(action.delay, U32),
    keycode: keycode(event.keycode),
    // libamp plays anything but a press as a release (`macro_process`).
    event: event.event === KEY_DOWN ? 'down' : 'up',
    isVirtual: event.is_virtual,
    keyId: integer(event.key_id, U16),
  };
}

/**
 * Each slot's actions up to its end marker. A slot without one keeps at most `actions − 1`
 * actions: the end marker needs the last entry.
 */
export function readMacros(controller: Pick<DeviceController, 'get_macros'>): MacroAction[][] {
  const capacity = readMacroCapacity(controller);
  const limit = Math.max(capacity.actions - 1, 0);
  return controller
    .get_macros()
    .slice(0, capacity.slots)
    .map(slot => {
      const end = slot.findIndex(action => action.event.keycode === END_MARKER_KEYCODE);
      return slot.slice(0, Math.min(end < 0 ? slot.length : end, limit)).map(toMacroAction);
    });
}

/** The script and its bytecode; null when the controller declares no script support. */
export function readScript(
  controller: Pick<DeviceController, 'get_feature' | 'get_script_source' | 'get_script_bytecode'>
): ScriptConfig | null {
  const level = asEnum(SCRIPT_LEVELS, controller.get_feature().script_level, ScriptLevel.Disable);
  if (level === ScriptLevel.Disable) return null;
  return {
    source: controller.get_script_source(),
    bytecode: Array.from(controller.get_script_bytecode(), byte => integer(byte, BYTE)),
  };
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
    macros: readMacros(controller),
    script: readScript(controller),
    profileIndex: integer(controller.get_profile_index(), BYTE),
    profileCount: integer(controller.get_profile_num(), BYTE),
  });
}

export function readFeatureFlags(
  controller: Pick<DeviceController, 'get_feature' | 'get_macros'>
): FeatureFlags {
  const feature = controller.get_feature();
  const macros = readMacroCapacity(controller);
  return deepFreeze({
    advancedKeys: feature.advanced_key_flag,
    rgb: feature.rgb_flag,
    scriptLevel: asEnum(SCRIPT_LEVELS, feature.script_level, ScriptLevel.Disable),
    pollingRate: integer(feature.polling_rate, U32),
    macroSlots: macros.slots,
    macroActions: macros.actions,
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

export function toControllerMacroAction(action: MacroAction): ControllerMacroAction {
  const result = new ControllerMacroAction();
  result.delay = action.delay;
  result.event.keycode = action.keycode;
  result.event.event = action.event === 'down' ? KEY_DOWN : KEY_UP;
  result.event.is_virtual = action.isVirtual;
  result.event.key_id = action.keyId;
  return result;
}

/**
 * Full-capacity controller macros: each slot's actions, its end marker (no keycode, at the last
 * action's delay) and empty actions up to the slot size. The controller reads every slot with
 * `macros[0].length` entries, so the cache must keep that size.
 */
export function toControllerMacros(
  macros: readonly (readonly MacroAction[])[],
  capacity: MacroCapacity
): IMacroAction[][] {
  const limit = Math.max(capacity.actions - 1, 0);
  return Array.from({ length: capacity.slots }, (_, slot) => {
    const actions = (macros[slot] ?? []).slice(0, limit).map(toControllerMacroAction);
    const end = new ControllerMacroAction();
    end.delay = actions.at(-1)?.delay ?? 0;
    const empty = Array.from(
      { length: capacity.actions - actions.length - 1 },
      () => new ControllerMacroAction()
    );
    return [...actions, end, ...empty];
  });
}

// ---------------------------------------------------------------------------------------------
// Validation of domain values before they reach the wire (DataView setters wrap silently)

function assertMember(members: readonly number[], value: number, label: string): void {
  if (!members.includes(value)) throw new RangeError(`${label} ${value} is not supported`);
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

/**
 * Actions the firmware can play: at most `capacity.actions − 1` (the end marker takes the last
 * entry), a keycode other than "no event" (it would end the macro there), a u32 delay, and a key
 * of the keyboard (libamp reads the key of every action it plays, virtual ones too).
 */
export function assertMacroActions(
  actions: readonly MacroAction[],
  capacity: MacroCapacity,
  keyCount: number
): void {
  const limit = Math.max(capacity.actions - 1, 0);
  if (actions.length > limit) {
    throw new RangeError(`A macro holds at most ${limit} actions, got ${actions.length}`);
  }
  for (const action of actions) {
    assertUint(action.delay, U32, 'Delay');
    assertUint(action.keycode, U16, 'Keycode');
    if (action.keycode === END_MARKER_KEYCODE) throw new RangeError('Keycode 0 ends a macro');
    if (!MACRO_EVENTS.includes(action.event)) {
      throw new RangeError(`Event ${action.event} is not supported`);
    }
    assertUint(action.keyId, U16, 'Key ID');
    if (action.keyId >= keyCount) throw new RangeError(`Key ${action.keyId} does not exist`);
  }
}

/** Bytecode bytes are bytes: `Uint8Array.from` would wrap other values silently. */
export function assertScriptConfig(script: ScriptConfig): void {
  for (const byte of script.bytecode) assertUint(byte, BYTE, 'Bytecode byte');
}
