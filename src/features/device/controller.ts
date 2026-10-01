/**
 * The app's only adapter to the vendored `emi-keyboard-controller` (spec §4.3).
 *
 * `LibampKeyboardController` is not exported from the package root, so the app types controllers
 * structurally with exactly the members it calls; every registry entry is checked against this
 * interface (models.ts), so an upstream API change breaks here at compile time.
 */
import {
  MacroAction,
  type FirmwareVersion,
  type IAdvancedKey,
  type IDynamicKey,
  type IFeature,
  type IMacroAction,
  type IRGBBaseConfig,
  type IRGBConfig,
  type USBDevice,
} from 'emi-keyboard-controller';

export interface DeviceController {
  detect(silent: boolean): Promise<HIDDevice[]>;
  connect(device: HIDDevice): Promise<boolean>;
  disconnect(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  get_layout_json(): string;
  get_layout_labels(): string[][];
  get_feature(): IFeature;
  get_firmware_version(): FirmwareVersion;
  get_profile_num(): number;
  get_profile_index(): number;
  set_profile_index(index: number): Promise<void>;
  get_advanced_keys(): IAdvancedKey[];
  set_advanced_keys(keys: IAdvancedKey[]): void;
  get_keymap(): number[][];
  set_keymap(keymap: number[][]): void;
  get_rgb_base_config(): IRGBBaseConfig;
  set_rgb_base_config(config: IRGBBaseConfig): void;
  get_rgb_configs(): IRGBConfig[];
  set_rgb_configs(configs: IRGBConfig[]): void;
  get_dynamic_keys(): IDynamicKey[];
  set_dynamic_keys(keys: IDynamicKey[]): void;
  get_macros(): IMacroAction[][];
  set_macros(macros: IMacroAction[][]): void;
  get_script_source(): string;
  set_script_source(source: string): void;
  get_script_bytecode(): Uint8Array;
  set_script_bytecode(bytecode: Uint8Array): void;
  save(): Promise<void>;
  flash(): void;
  send_advanced_key_packet(index: number, advancedKey: IAdvancedKey): Promise<void>;
  send_keymap_packet(layer: number, start: number, length: number, keymap: number[]): Promise<void>;
  send_rgb_base_packet(config: IRGBBaseConfig): Promise<void>;
  send_rgb_packet(index: number, config: IRGBConfig): Promise<void>;
  send_dynamic_key_packet(index: number, dynamicKey: IDynamicKey): Promise<void>;
  request_debug_at(ids: number[]): Promise<void>;
  /**
   * Not in spec §4.3's list, but required: libamp only streams debug packets while its `debug`
   * config bit is set (`keyboard.c`), which these toggle.
   */
  start_debug(): void;
  stop_debug(): void;
  system_reset(): void;
  factory_reset(): void;
  enter_bootloader(): void;
  detect_bootloader(silent: boolean): Promise<USBDevice[]>;
}

// ---------------------------------------------------------------------------------------------
// Events

export interface ControllerEventMap {
  updateDataStart: undefined;
  updateData: undefined;
  updateDataEnd: undefined;
  updateDataError: { readonly error: unknown };
  updateDebugData: { readonly tick: number; readonly updatedKeys: readonly number[] };
  consoleData: { readonly text: string; readonly data: Uint8Array };
  deviceDisconnected: undefined;
}

export type ControllerEventType = keyof ControllerEventMap;

type EventTargetLike = Pick<DeviceController, 'addEventListener' | 'removeEventListener'>;

/** Parse result: `null` when the detail does not have the documented shape. */
type DetailParsers = {
  readonly [K in ControllerEventType]: (detail: unknown) => ControllerEventMap[K] | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUint(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseKeyIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids: unknown[] = value;
  return ids.every(isUint) ? [...ids] : null;
}

const noDetail = (): undefined => undefined;

const DETAIL_PARSERS: DetailParsers = {
  updateDataStart: noDetail,
  updateData: noDetail,
  updateDataEnd: noDetail,
  // Failures are never dropped: an unexpected detail is reported as the error itself.
  updateDataError: detail => ({
    error: isRecord(detail) && 'error' in detail ? detail.error : detail,
  }),
  updateDebugData: detail => {
    if (!isRecord(detail) || !isUint(detail.tick)) return null;
    const updatedKeys = parseKeyIds(detail.updated_keys);
    return updatedKeys ? { tick: detail.tick, updatedKeys } : null;
  },
  consoleData: detail => {
    if (!isRecord(detail) || typeof detail.text !== 'string') return null;
    const { data } = detail;
    if (!ArrayBuffer.isView(data)) return null;
    return {
      text: detail.text,
      data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice(),
    };
  },
  deviceDisconnected: noDetail,
};

function detailOf(event: Event): unknown {
  return 'detail' in event ? event.detail : undefined;
}

/**
 * Subscribes to a controller event with a validated, typed detail (events whose detail does not
 * match the documented shape are logged and dropped). Returns the unsubscribe function.
 */
export function onControllerEvent<K extends ControllerEventType>(
  controller: EventTargetLike,
  type: K,
  handler: (detail: ControllerEventMap[K]) => void
): () => void {
  const parse = DETAIL_PARSERS[type];
  const listener: EventListener = event => {
    const detail = parse(detailOf(event));
    if (detail === null) {
      console.warn(`[device] ignoring malformed '${type}' event`, detailOf(event));
      return;
    }
    handler(detail);
  };
  controller.addEventListener(type, listener);
  return () => {
    controller.removeEventListener(type, listener);
  };
}

// ---------------------------------------------------------------------------------------------
// Upstream workarounds

const PACKET_CODE_GET = 0x02;

/** The concrete libamp controller surface the dynamic-key workaround needs. */
export interface LibampDynamicKeyParser {
  dynamic_keys: IDynamicKey[];
  packet_process_dynamic_key(buf: Uint8Array): void;
}

function replyTypeCode(buf: Uint8Array): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(5, true);
}

/**
 * Works around the vendored macro defaults (ac25c4e): the AT32, Oholeo and Trinity Pad
 * controllers fill their cache with `Array(4).fill(Array(128).fill(new MacroAction()))`, so every
 * slot is one array of one shared action. `read_macros` assigns `macros[slot][index]`, which then
 * writes every slot at once: after a load each slot would hold the last slot's actions. The cache
 * gets fresh arrays of fresh actions of the same size (`read_macros` sizes every slot by
 * `macros[0].length`) before the first load.
 */
function unshareMacros(controller: Pick<DeviceController, 'get_macros' | 'set_macros'>): void {
  controller.set_macros(controller.get_macros().map(slot => slot.map(() => new MacroAction())));
}

/**
 * Works around a bug in the vendored controller (ac25c4e): `packet_process_dynamic_key` ends its
 * GET branch with `else (…) { … }`, so the SET serializer always runs and dereferences
 * `target_keys_location[0]` of the key it just parsed, which is always empty. Any keyboard with a
 * configured dynamic key would fail to load (`updateDataError`). The parsed key is already stored
 * when that throws, so only that exact failure is swallowed. It also unshares the macro defaults
 * (`unshareMacros`). Remove each workaround once fixed upstream.
 */
export function withUpstreamFixes<T extends DeviceController & LibampDynamicKeyParser>(
  controller: T
): T {
  const parse = controller.packet_process_dynamic_key.bind(controller);
  controller.packet_process_dynamic_key = (buf: Uint8Array) => {
    try {
      parse(buf);
    } catch (error) {
      const parsed =
        buf[0] === PACKET_CODE_GET &&
        error instanceof TypeError &&
        controller.dynamic_keys[buf[3] ?? -1]?.type === replyTypeCode(buf);
      if (!parsed) throw error;
    }
  };
  unshareMacros(controller);
  return controller;
}
