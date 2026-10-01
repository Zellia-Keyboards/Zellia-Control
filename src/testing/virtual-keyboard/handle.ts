/**
 * The part of the virtual keyboard that e2e tests reach through `window.__virtualKeyboard`.
 *
 * Only plain data types from `./protocol` are used, so the Playwright program (Node types, no
 * app types) can import this module (`e2e/fixtures.ts`). `VirtualKeyboard` extends
 * {@link VirtualKeyboardHandle}, so the two cannot drift apart.
 */
import type {
  HostPacket,
  WireAdvancedKey,
  WireDynamicKey,
  WireMacroAction,
  WireRgbBase,
  WireRgbKey,
  WireVersion,
} from './protocol';

/** Answer of the simulated HID device chooser. */
export type VirtualPicker = 'first' | 'cancel';

/**
 * JSON options of the browser entry (`window.__virtualKeyboardOptions`, validated by
 * `browser-install.ts`); the e2e `virtualKeyboardOptions` fixture option sets them.
 */
export interface VirtualKeyboardBrowserOptions {
  model?: 'zellia-starlight' | 'zellia-60' | 'zellia-80' | 'oholeo' | 'trinity-pad';
  /** HID product name (default: the model's, e.g. `ZelliaKB`). */
  productName?: string;
  /** Overrides of the reported firmware version (default 0.1.0). */
  firmware?: Partial<WireVersion>;
  /** Seed one dynamic key of each kind into profile 0 (default true). */
  seedDynamicKeys?: boolean;
  /** Reply latency; 0 (default) replies in a microtask. */
  latencyMs?: number;
  /** Interval of debug packets while debugging is on (default 10 ms). */
  debugIntervalMs?: number;
  /** Delay until the keyboard re-enumerates after a reboot or update; null stays unplugged. */
  reconnectDelayMs?: number | null;
  /** Delay between a calibration request and its config-changed notification (default 1000). */
  calibrationDelayMs?: number;
  /** Already granted, so `navigator.hid.getDevices()` returns it (default false). */
  authorized?: boolean;
  /** Initial answer of the device chooser (default `'first'`). */
  picker?: VirtualPicker;
  /** Bootloader behaviour (models with a DFU filter only). */
  dfu?: {
    /** DfuSe memory map advertised as the interface name; `null` for a plain DFU 1.1 device. */
    memoryMap?: string | null;
    transferSize?: number;
    busyPolls?: number;
    pollTimeoutMs?: number;
    manifestationTolerant?: boolean;
    authorized?: boolean;
  };
  /** Firmware version reported after a successful DFU download. */
  firmwareAfterUpdate?: Partial<WireVersion>;
}

/** One profile's configuration as the firmware stores it. */
export interface VirtualProfileData {
  advancedKeys: WireAdvancedKey[];
  /** `[layer][key]`. */
  keymap: number[][];
  rgbBase: WireRgbBase;
  rgbKeys: WireRgbKey[];
  dynamicKeys: WireDynamicKey[];
}

export interface VirtualKeyboardStateData {
  readonly model: {
    readonly id: string;
    readonly productName: string;
    /** Key ids (layer 0) of the seeded stroke, mod-tap, toggle and mutex (two keys) dynamic keys. */
    readonly seedKeyIds: readonly [number, number, number, number, number];
  };
  firmware: WireVersion;
  /** `g_keyboard_config` bits indexed by `KeyboardConfigCode` (debug, NKRO, …). */
  config: boolean[];
  /** 0-based active profile. */
  profileIndex: number;
  /** Working configuration the firmware runs on. */
  active: VirtualProfileData;
  /** Persisted profile files. */
  profiles: VirtualProfileData[];
  /** `[macro][entry]` as the firmware keeps them, end markers and empty entries included. */
  macros: WireMacroAction[][];
  /** The script source (with the NUL the controller appends) and bytecode as uploaded. */
  scripts: { source: Uint8Array; bytecode: Uint8Array };
}

/** The bootloader that appears after `KeyboardBootloader`. */
export interface VirtualDfuHandle {
  /** Enumerated on the virtual bus. */
  readonly connected: boolean;
  readonly opened: boolean;
  readonly isDfuSe: boolean;
  /** DFU state machine value (`DFU_STATE`). */
  readonly state: number;
  /** Bytes written by the last download. */
  readonly image: Uint8Array;
}

export interface VirtualKeyboardHandle {
  /** The manager installed as `navigator.hid`; set `picker` to change the chooser's answer. */
  readonly hid: { picker: VirtualPicker };
  /** Live device state; mutate it to simulate changes made on the keyboard itself. */
  readonly state: VirtualKeyboardStateData;
  /** Host → device packets, decoded, in order. */
  readonly sentPackets: readonly HostPacket[];
  /** Whether the HID device is plugged in. */
  readonly connected: boolean;
  /** Null when the model has no bootloader. */
  readonly dfu: VirtualDfuHandle | null;
  clearHistory(): void;
  /** Physically unplugs the keyboard. */
  disconnect(): void;
  /** Plugs the keyboard (back) in. */
  reconnect(): void;
  setFirmwareVersion(version: Partial<WireVersion>): void;
  /** While unresponsive the device ignores every report (no replies, no effects). */
  setUnresponsive(unresponsive: boolean): void;
  /** Sends a config-changed event, as the firmware does after on-board changes. */
  notifyConfigChanged(): void;
  /** Sends a console message. */
  log(text: string): void;
  /** Reboots like `KeyboardReboot`. */
  reboot(): void;
  /** Jumps to the bootloader like `KeyboardBootloader`. */
  enterBootloader(): void;
}
