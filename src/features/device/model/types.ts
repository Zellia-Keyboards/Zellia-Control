/**
 * Immutable domain model of a connected keyboard.
 *
 * `features/device` maps the mutable emi-keyboard-controller caches into these types at the
 * device boundary; UI code only reads them, and only DeviceSession commands change them.
 * Distances and thresholds are fractions of full travel (0..1), exactly as on the wire;
 * convert with `features/device/model/units.ts` for display.
 *
 * Shared contract: changes go through the lead.
 */
import type {
  CalibrationMode,
  KeyMode,
  RGBBaseMode,
  RGBMode,
  ScriptLevel,
} from 'emi-keyboard-controller';

/** 16-bit EMI keycode: low byte = keycode, high byte = sub-code (see features/keycodes). */
export type Keycode = number;

/** `[layer][keyIndex]`, 0-based layers. */
export type Keymap = readonly (readonly Keycode[])[];

export interface KeyLocation {
  /** 0-based layer index. */
  readonly layer: number;
  /** Key index into the controller arrays (the layout's numeric `labels[0]`). */
  readonly id: number;
}

export type ModelId = 'zellia-starlight' | 'zellia-60' | 'zellia-80' | 'oholeo' | 'trinity-pad';

export interface ModelInfo {
  readonly id: ModelId;
  /** Shown when the HID device reports no product name. */
  readonly displayName: string;
  /** Raw KLE JSON from `controller.get_layout_json()`. */
  readonly layoutJson: string;
  /** `controller.get_layout_labels()`: one array of option labels per layout group. */
  readonly layoutLabels: readonly (readonly string[])[];
}

export interface FirmwareVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly info: string;
}

export interface FeatureFlags {
  readonly advancedKeys: boolean;
  readonly rgb: boolean;
  readonly scriptLevel: ScriptLevel;
  readonly pollingRate: number;
  /** Macro slots the controller declares; 0 without macros. */
  readonly macroSlots: number;
  /** Entries of each macro slot, its end marker included; 0 without macros. */
  readonly macroActions: number;
  readonly bootloader: {
    readonly enabled: boolean;
    readonly download: boolean;
    readonly upload: boolean;
  };
}

export interface AdvancedKeyConfig {
  readonly mode: KeyMode;
  readonly calibrationMode: CalibrationMode;
  readonly activation: number;
  readonly deactivation: number;
  readonly triggerDistance: number;
  readonly releaseDistance: number;
  readonly triggerSpeed: number;
  readonly releaseSpeed: number;
  readonly upperDeadzone: number;
  readonly lowerDeadzone: number;
  /** Raw sensor bounds (not fractions). */
  readonly upperBound: number;
  readonly lowerBound: number;
}

export interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export interface RgbBaseConfig {
  readonly mode: RGBBaseMode;
  readonly color: Rgb;
  readonly secondaryColor: Rgb;
  /** Integer device value (the UI shows it as `{n}%`). */
  readonly speed: number;
  /** Degrees 0..359. */
  readonly direction: number;
  readonly density: number;
  readonly brightness: number;
}

export interface RgbKeyConfig {
  readonly mode: RGBMode;
  readonly color: Rgb;
  readonly speed: number;
}

export interface StrokeDistances {
  readonly pressBegin: number;
  readonly pressFully: number;
  readonly releaseBegin: number;
  readonly releaseFully: number;
}

/**
 * One dynamic-key slot. Targets are not returned by device reads; they are rebuilt from the
 * keymap (`DynamicKey | slot << 8` entries) — see `dynamic-key-binding.ts`.
 */
export type DynamicKeySlot =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'stroke';
      readonly bindings: readonly [Keycode, Keycode, Keycode, Keycode];
      /** Firmware `key_control`, one byte per binding, 2 bits per stage. */
      readonly keyControl: readonly [number, number, number, number];
      readonly distances: StrokeDistances;
      readonly target: KeyLocation | null;
    }
  | {
      readonly kind: 'modTap';
      readonly tap: Keycode;
      readonly hold: Keycode;
      readonly durationMs: number;
      readonly target: KeyLocation | null;
    }
  | {
      readonly kind: 'toggle';
      readonly binding: Keycode;
      readonly target: KeyLocation | null;
    }
  | {
      readonly kind: 'mutex';
      readonly bindings: readonly [Keycode, Keycode];
      readonly mode: MutexModeByte;
      readonly targets: readonly [KeyLocation | null, KeyLocation | null];
    };

export type DynamicKeyKind = DynamicKeySlot['kind'];

/**
 * A mutex (null-bind) `mode` byte exactly as libamp stores it: the low nibble is the priority
 * (`DynamicKeyMutexMode`), any high-nibble bit additionally reports both keys while both are
 * bottomed out. Read and build it with `model/mutex-mode.ts` (`mutexPriority`,
 * `mutexReportsBothOnBottomOut`, `mutexMode`).
 */
export type MutexModeByte = number;

/** The key event of a macro action (libamp `KEYBOARD_EVENT_KEY_DOWN` / `KEYBOARD_EVENT_KEY_UP`). */
export type MacroEvent = 'down' | 'up';

/** One action of a macro (libamp `MacroAction`). */
export interface MacroAction {
  /** Ticks from the start of the macro: the keyboard ticks `pollingRate` times a second. */
  readonly delay: number;
  readonly keycode: Keycode;
  readonly event: MacroEvent;
  /** The event comes from no physical key (recorded and added events are virtual). */
  readonly isVirtual: boolean;
  /** The key the firmware plays the event as when it is not virtual. */
  readonly keyId: number;
}

/** The keyboard's script and, on AOT keyboards, its compiled bytecode. */
export interface ScriptConfig {
  readonly source: string;
  /** Bytes (0..255): a number array, so the snapshot stays freezable. */
  readonly bytecode: readonly number[];
}

export interface DeviceConfig {
  readonly advancedKeys: readonly AdvancedKeyConfig[];
  readonly keymap: Keymap;
  readonly rgbBase: RgbBaseConfig;
  readonly rgbKeys: readonly RgbKeyConfig[];
  readonly dynamicKeys: readonly DynamicKeySlot[];
  /** Each macro slot's actions, without its end marker; empty without macros. */
  readonly macros: readonly (readonly MacroAction[])[];
  /** Null when the controller declares no script support. */
  readonly script: ScriptConfig | null;
  /** 0-based active firmware profile. */
  readonly profileIndex: number;
  readonly profileCount: number;
}

export type ConnectionState =
  | { readonly status: 'disconnected' }
  /** Browser device picker is open. */
  | { readonly status: 'selecting' }
  /** Opening the HID device. */
  | { readonly status: 'connecting' }
  /** Device open, waiting for the first complete configuration read. */
  | { readonly status: 'loading'; readonly model: ModelInfo; readonly deviceName: string }
  | { readonly status: 'ready'; readonly model: ModelInfo; readonly deviceName: string }
  | { readonly status: 'error'; readonly message: string };

export type ConnectionStatus = ConnectionState['status'];

export interface DeviceError {
  /** Command that failed, e.g. `'save'`, `'setKeycodes'`, `'switchProfile'`. */
  readonly operation: string;
  readonly message: string;
}
