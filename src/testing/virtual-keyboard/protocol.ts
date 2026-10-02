/**
 * libamp 0.1 packet codec: transaction-id framing over 64-byte raw HID reports.
 *
 * Offsets mirror the vendored `emi-keyboard-controller` (LibampKeyboardController's
 * `packet_process_*`, `send_*_packet`, `read_*`/`write_*` and `request_*`) and libamp's
 * `packet.h`:
 *
 * - GET/SET/large packets: `code | id | type | body`. The firmware processes a request in place
 *   and echoes it back, so a reply repeats `code`, `id` and `type` (and every request byte it did
 *   not fill in).
 * - Event packets: `code(0x00) | flag | event | keycode(2) | key id(2) | is_virtual | use_keymap`.
 *   The device sends `flag = 0x01` (config changed) to ask the host to reload.
 * - Debug packets: `code(0x06) | length | tick(4) | items(10 bytes each)`.
 * - Console packets: `code(0x03) | reserved | length(2) | text`.
 *
 * Fractions of travel travel as raw u16 values (`fraction × 65535`, truncated); the codec keeps
 * them raw so tests can compare exact wire values.
 */

export const REPORT_SIZE = 64;

/** A 64-byte report backed by its own ArrayBuffer (usable as a WebHID `BufferSource`). */
export type Report = Uint8Array<ArrayBuffer>;

export const PacketCode = {
  Event: 0x00,
  Set: 0x01,
  Get: 0x02,
  Console: 0x03,
  LargeSet: 0x04,
  LargeGet: 0x05,
  Debug: 0x06,
} as const;

export const PacketType = {
  Version: 0x00,
  AdvancedKey: 0x01,
  Keymap: 0x02,
  RgbBaseConfig: 0x03,
  RgbConfig: 0x04,
  DynamicKey: 0x05,
  ProfileIndex: 0x06,
  Config: 0x07,
  Macro: 0x0a,
  Feature: 0x0b,
  ScriptSource: 0x0c,
  ScriptBytecode: 0x0d,
} as const;

export const EventFlag = { None: 0x00, ConfigChanged: 0x01 } as const;

/** libamp `KeyboardEventType` (event.h). Keyboard operations run on `KeyDown`. */
export const KeyEvent = { KeyFalse: 0x00, KeyUp: 0x01, KeyTrue: 0x02, KeyDown: 0x03 } as const;

export const DynamicKeyTypeCode = {
  None: 0,
  Stroke: 1,
  ModTap: 2,
  ToggleKey: 3,
  Mutex: 4,
} as const;

/** Largest counts that fit into one report (the firmware limits macros and debug further). */
export const MAX_KEYMAP_CODES = 28;
export const MAX_RGB_ENTRIES = 7;
export const MAX_CONFIG_ENTRIES = 29;
export const MAX_MACRO_ACTIONS = 4;
export const MAX_DEBUG_ITEMS = 5;
export const MAX_VERSION_INFO = 47;
export const LARGE_PAYLOAD_OFFSET = 10;
export const MAX_LARGE_PAYLOAD = REPORT_SIZE - LARGE_PAYLOAD_OFFSET;

const KEYMAP_CODES_OFFSET = 7;
const RGB_ENTRIES_OFFSET = 4;
const RGB_ENTRY_SIZE = 8;
const CONFIG_ENTRIES_OFFSET = 5;
const MACRO_ACTIONS_OFFSET = 6;
const MACRO_ACTION_SIZE = 12;
const DYNAMIC_KEY_OFFSET = 5;
const DEBUG_ITEMS_OFFSET = 6;
const DEBUG_ITEM_SIZE = 10;
const VERSION_INFO_OFFSET = 17;
const CONSOLE_TEXT_OFFSET = 4;

export interface WireRgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export interface WireAdvancedKey {
  readonly mode: number;
  readonly calibrationMode: number;
  /** Raw u16 fractions of full travel. */
  readonly activation: number;
  readonly deactivation: number;
  readonly triggerDistance: number;
  readonly releaseDistance: number;
  readonly triggerSpeed: number;
  readonly releaseSpeed: number;
  readonly upperDeadzone: number;
  readonly lowerDeadzone: number;
  /** Raw sensor bounds. */
  readonly upperBound: number;
  readonly lowerBound: number;
}

export interface WireRgbBase {
  readonly mode: number;
  readonly color: WireRgb;
  readonly secondaryColor: WireRgb;
  readonly speed: number;
  readonly direction: number;
  readonly density: number;
  readonly brightness: number;
}

export interface WireRgbKey {
  readonly mode: number;
  readonly color: WireRgb;
  readonly speed: number;
}

export interface WireRgbEntry {
  readonly index: number;
  readonly config: WireRgbKey;
}

export type WireDynamicKey =
  | { readonly type: 'none' }
  | {
      readonly type: 'stroke';
      readonly bindings: readonly [number, number, number, number];
      readonly keyControl: readonly [number, number, number, number];
      /** Raw u16 fractions of full travel. */
      readonly pressBegin: number;
      readonly pressFully: number;
      readonly releaseBegin: number;
      readonly releaseFully: number;
      readonly keyId: number;
    }
  | {
      readonly type: 'modTap';
      readonly bindings: readonly [number, number];
      readonly duration: number;
      readonly keyId: number;
    }
  | { readonly type: 'toggle'; readonly binding: number; readonly keyId: number }
  | {
      readonly type: 'mutex';
      readonly bindings: readonly [number, number];
      readonly keyIds: readonly [number, number];
      readonly mode: number;
    };

export interface WireConfigEntry {
  readonly index: number;
  readonly value: boolean;
}

export interface WireMacroAction {
  readonly index: number;
  readonly delay: number;
  readonly keyId: number;
  readonly isVirtual: boolean;
  readonly event: number;
  readonly keycode: number;
}

export interface WireFeature {
  readonly features: number;
  readonly rgbFeatures: number;
  readonly scriptSupport: number;
}

export interface WireVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly info: string;
}

export interface WireDebugItem {
  readonly index: number;
  readonly state: boolean;
  readonly reportState: boolean;
  readonly raw: number;
  readonly filteredRaw: number;
  /** Raw u16 fraction of full travel. */
  readonly value: number;
}

/** Data-bearing body of a SET request, or of the reply to a GET request (same layout). */
export type DataPayload =
  | { readonly kind: 'version'; readonly version: WireVersion }
  | { readonly kind: 'advancedKey'; readonly index: number; readonly key: WireAdvancedKey }
  | {
      readonly kind: 'keymap';
      readonly layer: number;
      readonly start: number;
      readonly keycodes: readonly number[];
    }
  | { readonly kind: 'rgbBase'; readonly config: WireRgbBase }
  | { readonly kind: 'rgbConfig'; readonly entries: readonly WireRgbEntry[] }
  | { readonly kind: 'dynamicKey'; readonly index: number; readonly key: WireDynamicKey }
  | { readonly kind: 'profileIndex'; readonly index: number }
  | { readonly kind: 'config'; readonly entries: readonly WireConfigEntry[] }
  | {
      readonly kind: 'macro';
      readonly macroIndex: number;
      readonly actions: readonly WireMacroAction[];
    }
  | { readonly kind: 'feature'; readonly feature: WireFeature }
  | { readonly kind: 'other'; readonly type: number };

export type GetRequest =
  | { readonly kind: 'version' }
  | { readonly kind: 'advancedKey'; readonly index: number }
  | {
      readonly kind: 'keymap';
      readonly layer: number;
      readonly start: number;
      readonly length: number;
    }
  | { readonly kind: 'rgbBase' }
  | { readonly kind: 'rgbConfig'; readonly indices: readonly number[] }
  | { readonly kind: 'dynamicKey'; readonly index: number }
  | { readonly kind: 'profileIndex' }
  | { readonly kind: 'config'; readonly indices: readonly number[] }
  | {
      readonly kind: 'macro';
      readonly macroIndex: number;
      readonly actionIndices: readonly number[];
    }
  | { readonly kind: 'feature' }
  | { readonly kind: 'other'; readonly type: number };

export type LargeDataBody =
  | { readonly command: 'start'; readonly totalSize: number; readonly checksum: number }
  | {
      readonly command: 'payload';
      readonly offset: number;
      readonly length: number;
      /** Payload bytes (empty in a large-GET request). */
      readonly data: Uint8Array;
    }
  | { readonly command: 'end' | 'abort' }
  | { readonly command: 'other'; readonly subCommand: number };

interface TransactionHeader<Op extends string> {
  readonly op: Op;
  readonly id: number;
}

/** A decoded host → device report. */
export type HostPacket =
  | (TransactionHeader<'get'> & GetRequest)
  | (TransactionHeader<'set'> & DataPayload)
  | (TransactionHeader<'largeGet' | 'largeSet'> & { readonly dataType: number } & LargeDataBody)
  | {
      readonly op: 'event';
      readonly event: number;
      readonly keycode: number;
      readonly keyId: number;
      readonly isVirtual: boolean;
      readonly useKeymap: boolean;
    }
  | { readonly op: 'debug'; readonly keyIds: readonly number[] }
  | { readonly op: 'unknown'; readonly code: number };

/** A decoded device → host report. */
export type DeviceReport =
  | {
      readonly kind: 'reply';
      readonly op: 'get' | 'set';
      readonly id: number;
      readonly data: DataPayload;
    }
  | ({
      readonly kind: 'largeReply';
      readonly op: 'largeGet' | 'largeSet';
      readonly id: number;
      readonly dataType: number;
    } & LargeDataBody)
  | { readonly kind: 'configChanged' }
  | { readonly kind: 'event'; readonly flag: number }
  | { readonly kind: 'console'; readonly text: string }
  | { readonly kind: 'debug'; readonly tick: number; readonly items: readonly WireDebugItem[] }
  | { readonly kind: 'unknown'; readonly code: number };

// ---------------------------------------------------------------------------------------------
// Low-level helpers

/** Copies `data` into a fresh zero-padded report of exactly {@link REPORT_SIZE} bytes. */
export function toReport(data: ArrayBufferView | ArrayBuffer): Report {
  // `ArrayBuffer.isView` (unlike `instanceof`) also recognizes views from other realms.
  const bytes = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
  const report = new Uint8Array(REPORT_SIZE);
  report.set(bytes.subarray(0, REPORT_SIZE));
  return report;
}

function viewOf(report: Uint8Array): DataView {
  return new DataView(report.buffer, report.byteOffset, report.byteLength);
}

function byteAt(report: Uint8Array, offset: number): number {
  return report[offset] ?? 0;
}

function readRgb(report: Uint8Array, offset: number): WireRgb {
  return {
    red: byteAt(report, offset),
    green: byteAt(report, offset + 1),
    blue: byteAt(report, offset + 2),
  };
}

function writeRgb(report: Uint8Array, offset: number, color: WireRgb): void {
  report[offset] = color.red;
  report[offset + 1] = color.green;
  report[offset + 2] = color.blue;
}

function count(value: number, max: number): number {
  return Math.min(value, max);
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------------------------------------------------------------------------------------------
// Bodies shared by SET requests and GET replies

function readAdvancedKey(report: Uint8Array): WireAdvancedKey {
  const view = viewOf(report);
  const u16 = (slot: number) => view.getUint16(7 + slot * 2, true);
  return {
    mode: byteAt(report, 5),
    calibrationMode: byteAt(report, 6),
    activation: u16(0),
    deactivation: u16(1),
    triggerDistance: u16(2),
    releaseDistance: u16(3),
    triggerSpeed: u16(4),
    releaseSpeed: u16(5),
    upperDeadzone: u16(6),
    lowerDeadzone: u16(7),
    upperBound: u16(8),
    lowerBound: u16(9),
  };
}

function writeAdvancedKey(report: Uint8Array, key: WireAdvancedKey): void {
  const view = viewOf(report);
  report[5] = key.mode;
  report[6] = key.calibrationMode;
  [
    key.activation,
    key.deactivation,
    key.triggerDistance,
    key.releaseDistance,
    key.triggerSpeed,
    key.releaseSpeed,
    key.upperDeadzone,
    key.lowerDeadzone,
    key.upperBound,
    key.lowerBound,
  ].forEach((value, slot) => {
    view.setUint16(7 + slot * 2, value, true);
  });
}

function readKeymapCodes(report: Uint8Array): number[] {
  const view = viewOf(report);
  const length = count(byteAt(report, 6), MAX_KEYMAP_CODES);
  return Array.from({ length }, (_, index) =>
    view.getUint16(KEYMAP_CODES_OFFSET + index * 2, true)
  );
}

function writeKeymapCodes(report: Uint8Array, keycodes: readonly number[]): void {
  const view = viewOf(report);
  keycodes.slice(0, MAX_KEYMAP_CODES).forEach((keycode, index) => {
    view.setUint16(KEYMAP_CODES_OFFSET + index * 2, keycode, true);
  });
}

function readRgbBase(report: Uint8Array): WireRgbBase {
  const view = viewOf(report);
  return {
    mode: byteAt(report, 3),
    color: readRgb(report, 4),
    secondaryColor: readRgb(report, 7),
    speed: view.getUint16(10, true),
    direction: view.getUint16(12, true),
    density: byteAt(report, 14),
    brightness: byteAt(report, 15),
  };
}

function writeRgbBase(report: Uint8Array, config: WireRgbBase): void {
  const view = viewOf(report);
  report[3] = config.mode;
  writeRgb(report, 4, config.color);
  writeRgb(report, 7, config.secondaryColor);
  view.setUint16(10, config.speed, true);
  view.setUint16(12, config.direction, true);
  report[14] = config.density;
  report[15] = config.brightness;
}

function rgbEntryOffset(entry: number): number {
  return RGB_ENTRIES_OFFSET + entry * RGB_ENTRY_SIZE;
}

function readRgbIndices(report: Uint8Array): number[] {
  const view = viewOf(report);
  const length = count(byteAt(report, 3), MAX_RGB_ENTRIES);
  return Array.from({ length }, (_, entry) => view.getUint16(rgbEntryOffset(entry), true));
}

function readRgbEntries(report: Uint8Array): WireRgbEntry[] {
  const view = viewOf(report);
  return readRgbIndices(report).map((index, entry) => {
    const base = rgbEntryOffset(entry);
    return {
      index,
      config: {
        mode: byteAt(report, base + 2),
        color: readRgb(report, base + 3),
        speed: view.getUint16(base + 6, true),
      },
    };
  });
}

function writeRgbKey(report: Uint8Array, entry: number, config: WireRgbKey): void {
  const base = rgbEntryOffset(entry);
  report[base + 2] = config.mode;
  writeRgb(report, base + 3, config.color);
  viewOf(report).setUint16(base + 6, config.speed, true);
}

function readDynamicKey(report: Uint8Array): WireDynamicKey {
  const view = viewOf(report);
  const u16 = (offset: number) => view.getUint16(DYNAMIC_KEY_OFFSET + offset, true);
  const u8 = (offset: number) => byteAt(report, DYNAMIC_KEY_OFFSET + offset);
  switch (view.getUint32(DYNAMIC_KEY_OFFSET, true)) {
    case DynamicKeyTypeCode.Stroke:
      return {
        type: 'stroke',
        bindings: [u16(4), u16(6), u16(8), u16(10)],
        keyControl: [u8(12), u8(13), u8(14), u8(15)],
        pressBegin: u16(16),
        pressFully: u16(18),
        releaseBegin: u16(20),
        releaseFully: u16(22),
        keyId: u16(24),
      };
    case DynamicKeyTypeCode.ModTap:
      return {
        type: 'modTap',
        bindings: [u16(4), u16(6)],
        duration: view.getUint32(DYNAMIC_KEY_OFFSET + 8, true),
        keyId: u16(12),
      };
    case DynamicKeyTypeCode.ToggleKey:
      return { type: 'toggle', binding: u16(4), keyId: u16(6) };
    case DynamicKeyTypeCode.Mutex:
      return {
        type: 'mutex',
        bindings: [u16(4), u16(6)],
        keyIds: [u16(8), u16(10)],
        mode: u8(12),
      };
    default:
      return { type: 'none' };
  }
}

/** Writes the whole firmware `DynamicKey` union (bytes 5…63), like the firmware's memcpy. */
function writeDynamicKey(report: Uint8Array, key: WireDynamicKey): void {
  report.fill(0, DYNAMIC_KEY_OFFSET);
  const view = viewOf(report);
  const u16 = (offset: number, value: number) => {
    view.setUint16(DYNAMIC_KEY_OFFSET + offset, value, true);
  };
  const u32 = (offset: number, value: number) => {
    view.setUint32(DYNAMIC_KEY_OFFSET + offset, value, true);
  };
  switch (key.type) {
    case 'none':
      u32(0, DynamicKeyTypeCode.None);
      return;
    case 'stroke':
      u32(0, DynamicKeyTypeCode.Stroke);
      key.bindings.forEach((binding, index) => {
        u16(4 + index * 2, binding);
      });
      key.keyControl.forEach((control, index) => {
        report[DYNAMIC_KEY_OFFSET + 12 + index] = control;
      });
      u16(16, key.pressBegin);
      u16(18, key.pressFully);
      u16(20, key.releaseBegin);
      u16(22, key.releaseFully);
      u16(24, key.keyId);
      return;
    case 'modTap':
      u32(0, DynamicKeyTypeCode.ModTap);
      u16(4, key.bindings[0]);
      u16(6, key.bindings[1]);
      u32(8, key.duration);
      u16(12, key.keyId);
      return;
    case 'toggle':
      u32(0, DynamicKeyTypeCode.ToggleKey);
      u16(4, key.binding);
      u16(6, key.keyId);
      return;
    case 'mutex':
      u32(0, DynamicKeyTypeCode.Mutex);
      u16(4, key.bindings[0]);
      u16(6, key.bindings[1]);
      u16(8, key.keyIds[0]);
      u16(10, key.keyIds[1]);
      report[DYNAMIC_KEY_OFFSET + 12] = key.mode;
      return;
  }
}

function configEntryOffset(entry: number): number {
  return CONFIG_ENTRIES_OFFSET + entry * 2;
}

function readConfigIndices(report: Uint8Array): number[] {
  const length = count(byteAt(report, 3), MAX_CONFIG_ENTRIES);
  return Array.from({ length }, (_, entry) => byteAt(report, configEntryOffset(entry)));
}

function readConfigEntries(report: Uint8Array): WireConfigEntry[] {
  return readConfigIndices(report).map((index, entry) => ({
    index,
    value: byteAt(report, configEntryOffset(entry) + 1) > 0,
  }));
}

function macroActionOffset(entry: number): number {
  return MACRO_ACTIONS_OFFSET + entry * MACRO_ACTION_SIZE;
}

function readMacroIndices(report: Uint8Array): number[] {
  const view = viewOf(report);
  const length = count(view.getUint16(4, true), MAX_MACRO_ACTIONS);
  return Array.from({ length }, (_, entry) => view.getUint16(macroActionOffset(entry) + 4, true));
}

function readMacroActions(report: Uint8Array): WireMacroAction[] {
  const view = viewOf(report);
  return readMacroIndices(report).map((index, entry) => {
    const base = macroActionOffset(entry);
    return {
      index,
      delay: view.getUint32(base, true),
      keyId: view.getUint16(base + 6, true),
      isVirtual: byteAt(report, base + 8) > 0,
      event: byteAt(report, base + 9),
      keycode: view.getUint16(base + 10, true),
    };
  });
}

function writeMacroAction(report: Uint8Array, entry: number, action: WireMacroAction): void {
  const view = viewOf(report);
  const base = macroActionOffset(entry);
  view.setUint32(base, action.delay, true);
  view.setUint16(base + 4, action.index, true);
  view.setUint16(base + 6, action.keyId, true);
  report[base + 8] = action.isVirtual ? 1 : 0;
  report[base + 9] = action.event;
  view.setUint16(base + 10, action.keycode, true);
}

function readVersion(report: Uint8Array): WireVersion {
  const view = viewOf(report);
  const infoLength = count(view.getUint16(3, true), MAX_VERSION_INFO);
  const info = report.subarray(VERSION_INFO_OFFSET, VERSION_INFO_OFFSET + infoLength);
  return {
    major: view.getUint32(5, true),
    minor: view.getUint32(9, true),
    patch: view.getUint32(13, true),
    info: textDecoder.decode(info).replace(/\0/g, ''),
  };
}

function writeVersion(report: Uint8Array, version: WireVersion): void {
  const view = viewOf(report);
  // Like the firmware's sizeof(KEYBOARD_VERSION_INFO), the length includes the NUL terminator.
  const info = textEncoder.encode(`${version.info}\0`).subarray(0, MAX_VERSION_INFO);
  view.setUint16(3, info.length, true);
  view.setUint32(5, version.major, true);
  view.setUint32(9, version.minor, true);
  view.setUint32(13, version.patch, true);
  report.fill(0, VERSION_INFO_OFFSET);
  report.set(info, VERSION_INFO_OFFSET);
}

function readFeature(report: Uint8Array): WireFeature {
  const view = viewOf(report);
  return {
    features: view.getUint32(3, true),
    rgbFeatures: view.getUint32(7, true),
    scriptSupport: byteAt(report, 11),
  };
}

function writeFeature(report: Uint8Array, feature: WireFeature): void {
  const view = viewOf(report);
  view.setUint32(3, feature.features, true);
  view.setUint32(7, feature.rgbFeatures, true);
  report[11] = feature.scriptSupport;
}

function decodePayload(report: Uint8Array): DataPayload {
  const type = byteAt(report, 2);
  const view = viewOf(report);
  switch (type) {
    case PacketType.Version:
      return { kind: 'version', version: readVersion(report) };
    case PacketType.AdvancedKey:
      return { kind: 'advancedKey', index: view.getUint16(3, true), key: readAdvancedKey(report) };
    case PacketType.Keymap:
      return {
        kind: 'keymap',
        layer: byteAt(report, 3),
        start: view.getUint16(4, true),
        keycodes: readKeymapCodes(report),
      };
    case PacketType.RgbBaseConfig:
      return { kind: 'rgbBase', config: readRgbBase(report) };
    case PacketType.RgbConfig:
      return { kind: 'rgbConfig', entries: readRgbEntries(report) };
    case PacketType.DynamicKey:
      return { kind: 'dynamicKey', index: byteAt(report, 3), key: readDynamicKey(report) };
    case PacketType.ProfileIndex:
      return { kind: 'profileIndex', index: byteAt(report, 3) };
    case PacketType.Config:
      return { kind: 'config', entries: readConfigEntries(report) };
    case PacketType.Macro:
      return { kind: 'macro', macroIndex: byteAt(report, 3), actions: readMacroActions(report) };
    case PacketType.Feature:
      return { kind: 'feature', feature: readFeature(report) };
    default:
      return { kind: 'other', type };
  }
}

function decodeGetRequest(report: Uint8Array): GetRequest {
  const type = byteAt(report, 2);
  const view = viewOf(report);
  switch (type) {
    case PacketType.Version:
      return { kind: 'version' };
    case PacketType.AdvancedKey:
      return { kind: 'advancedKey', index: view.getUint16(3, true) };
    case PacketType.Keymap:
      return {
        kind: 'keymap',
        layer: byteAt(report, 3),
        start: view.getUint16(4, true),
        length: byteAt(report, 6),
      };
    case PacketType.RgbBaseConfig:
      return { kind: 'rgbBase' };
    case PacketType.RgbConfig:
      return { kind: 'rgbConfig', indices: readRgbIndices(report) };
    case PacketType.DynamicKey:
      return { kind: 'dynamicKey', index: byteAt(report, 3) };
    case PacketType.ProfileIndex:
      return { kind: 'profileIndex' };
    case PacketType.Config:
      return { kind: 'config', indices: readConfigIndices(report) };
    case PacketType.Macro:
      return {
        kind: 'macro',
        macroIndex: byteAt(report, 3),
        actionIndices: readMacroIndices(report),
      };
    case PacketType.Feature:
      return { kind: 'feature' };
    default:
      return { kind: 'other', type };
  }
}

function decodeLargeBody(report: Uint8Array, withData: boolean): LargeDataBody {
  const view = viewOf(report);
  const subCommand = byteAt(report, 3);
  switch (subCommand) {
    case 0:
      return {
        command: 'start',
        totalSize: view.getUint32(4, true),
        checksum: view.getUint32(8, true),
      };
    case 1: {
      const length = view.getUint16(8, true);
      const available = count(length, MAX_LARGE_PAYLOAD);
      return {
        command: 'payload',
        offset: view.getUint32(4, true),
        length,
        data: withData
          ? report.slice(LARGE_PAYLOAD_OFFSET, LARGE_PAYLOAD_OFFSET + available)
          : new Uint8Array(0),
      };
    }
    case 2:
      return { command: 'end' };
    case 3:
      return { command: 'abort' };
    default:
      return { command: 'other', subCommand };
  }
}

function writeLargeBody(report: Uint8Array, body: LargeDataBody): void {
  const view = viewOf(report);
  switch (body.command) {
    case 'start':
      report[3] = 0;
      view.setUint32(4, body.totalSize, true);
      view.setUint32(8, body.checksum, true);
      return;
    case 'payload':
      report[3] = 1;
      view.setUint32(4, body.offset, true);
      view.setUint16(8, body.length, true);
      report.set(body.data.subarray(0, MAX_LARGE_PAYLOAD), LARGE_PAYLOAD_OFFSET);
      return;
    case 'end':
      report[3] = 2;
      return;
    case 'abort':
      report[3] = 3;
      return;
    case 'other':
      report[3] = body.subCommand;
      return;
  }
}

function readDebugIds(report: Uint8Array): number[] {
  const view = viewOf(report);
  const length = count(byteAt(report, 1), MAX_DEBUG_ITEMS);
  return Array.from({ length }, (_, item) =>
    view.getUint16(DEBUG_ITEMS_OFFSET + item * DEBUG_ITEM_SIZE, true)
  );
}

// ---------------------------------------------------------------------------------------------
// Host → device

/** Decodes a host → device report (short reports are zero-padded like a HID output report). */
export function decodeHostReport(data: Uint8Array): HostPacket {
  const report = toReport(data);
  const code = byteAt(report, 0);
  const id = byteAt(report, 1);
  const view = viewOf(report);
  switch (code) {
    case PacketCode.Get:
      return { op: 'get', id, ...decodeGetRequest(report) };
    case PacketCode.Set:
      return { op: 'set', id, ...decodePayload(report) };
    case PacketCode.LargeGet:
      return { op: 'largeGet', id, dataType: byteAt(report, 2), ...decodeLargeBody(report, false) };
    case PacketCode.LargeSet:
      return { op: 'largeSet', id, dataType: byteAt(report, 2), ...decodeLargeBody(report, true) };
    case PacketCode.Event:
      return {
        op: 'event',
        event: byteAt(report, 2),
        keycode: view.getUint16(3, true),
        keyId: view.getUint16(5, true),
        isVirtual: byteAt(report, 7) > 0,
        useKeymap: byteAt(report, 8) > 0,
      };
    case PacketCode.Debug:
      return { op: 'debug', keyIds: readDebugIds(report) };
    default:
      return { op: 'unknown', code };
  }
}

const TYPE_BY_KIND = {
  version: PacketType.Version,
  advancedKey: PacketType.AdvancedKey,
  keymap: PacketType.Keymap,
  rgbBase: PacketType.RgbBaseConfig,
  rgbConfig: PacketType.RgbConfig,
  dynamicKey: PacketType.DynamicKey,
  profileIndex: PacketType.ProfileIndex,
  config: PacketType.Config,
  macro: PacketType.Macro,
  feature: PacketType.Feature,
} as const;

function typeOf(packet: GetRequest | DataPayload): number {
  return packet.kind === 'other' ? packet.type : TYPE_BY_KIND[packet.kind];
}

function writeGetRequest(report: Uint8Array, request: GetRequest): void {
  const view = viewOf(report);
  switch (request.kind) {
    case 'advancedKey':
      view.setUint16(3, request.index, true);
      return;
    case 'keymap':
      report[3] = request.layer;
      view.setUint16(4, request.start, true);
      report[6] = request.length;
      return;
    case 'rgbConfig':
      report[3] = request.indices.length;
      request.indices.slice(0, MAX_RGB_ENTRIES).forEach((index, entry) => {
        view.setUint16(rgbEntryOffset(entry), index, true);
      });
      return;
    case 'dynamicKey':
      report[3] = request.index;
      return;
    case 'config':
      report[3] = request.indices.length;
      request.indices.slice(0, MAX_CONFIG_ENTRIES).forEach((index, entry) => {
        report[configEntryOffset(entry)] = index;
      });
      return;
    case 'macro':
      report[3] = request.macroIndex;
      view.setUint16(4, request.actionIndices.length, true);
      request.actionIndices.slice(0, MAX_MACRO_ACTIONS).forEach((index, entry) => {
        view.setUint16(macroActionOffset(entry) + 4, index, true);
      });
      return;
    case 'version':
    case 'rgbBase':
    case 'profileIndex':
    case 'feature':
    case 'other':
      return;
  }
}

function writePayload(report: Uint8Array, payload: DataPayload): void {
  const view = viewOf(report);
  switch (payload.kind) {
    case 'version':
      writeVersion(report, payload.version);
      return;
    case 'advancedKey':
      view.setUint16(3, payload.index, true);
      writeAdvancedKey(report, payload.key);
      return;
    case 'keymap':
      report[3] = payload.layer;
      view.setUint16(4, payload.start, true);
      report[6] = payload.keycodes.length;
      writeKeymapCodes(report, payload.keycodes);
      return;
    case 'rgbBase':
      writeRgbBase(report, payload.config);
      return;
    case 'rgbConfig':
      report[3] = payload.entries.length;
      payload.entries.slice(0, MAX_RGB_ENTRIES).forEach((entry, position) => {
        view.setUint16(rgbEntryOffset(position), entry.index, true);
        writeRgbKey(report, position, entry.config);
      });
      return;
    case 'dynamicKey':
      report[3] = payload.index;
      writeDynamicKey(report, payload.key);
      return;
    case 'profileIndex':
      report[3] = payload.index;
      return;
    case 'config':
      report[3] = payload.entries.length;
      payload.entries.slice(0, MAX_CONFIG_ENTRIES).forEach((entry, position) => {
        report[configEntryOffset(position)] = entry.index;
        report[configEntryOffset(position) + 1] = entry.value ? 1 : 0;
      });
      return;
    case 'macro':
      report[3] = payload.macroIndex;
      view.setUint16(4, payload.actions.length, true);
      payload.actions.slice(0, MAX_MACRO_ACTIONS).forEach((action, position) => {
        writeMacroAction(report, position, action);
      });
      return;
    case 'feature':
      writeFeature(report, payload.feature);
      return;
    case 'other':
      return;
  }
}

/** Encodes a host → device report (the inverse of {@link decodeHostReport}). */
export function encodeHostPacket(packet: HostPacket): Report {
  const report = new Uint8Array(REPORT_SIZE);
  const view = viewOf(report);
  switch (packet.op) {
    case 'get':
      report[0] = PacketCode.Get;
      report[1] = packet.id;
      report[2] = typeOf(packet);
      writeGetRequest(report, packet);
      break;
    case 'set':
      report[0] = PacketCode.Set;
      report[1] = packet.id;
      report[2] = typeOf(packet);
      writePayload(report, packet);
      break;
    case 'largeGet':
    case 'largeSet':
      report[0] = packet.op === 'largeGet' ? PacketCode.LargeGet : PacketCode.LargeSet;
      report[1] = packet.id;
      report[2] = packet.dataType;
      writeLargeBody(report, packet);
      break;
    case 'event':
      report[0] = PacketCode.Event;
      report[2] = packet.event;
      view.setUint16(3, packet.keycode, true);
      view.setUint16(5, packet.keyId, true);
      report[7] = packet.isVirtual ? 1 : 0;
      report[8] = packet.useKeymap ? 1 : 0;
      break;
    case 'debug':
      report[0] = PacketCode.Debug;
      report[1] = packet.keyIds.length;
      packet.keyIds.slice(0, MAX_DEBUG_ITEMS).forEach((keyId, item) => {
        view.setUint16(DEBUG_ITEMS_OFFSET + item * DEBUG_ITEM_SIZE, keyId, true);
      });
      break;
    case 'unknown':
      report[0] = packet.code;
      break;
  }
  return report;
}

// ---------------------------------------------------------------------------------------------
// Device → host

/** The firmware's reply to any GET/SET/large request: the request echoed back unchanged. */
export function encodeReply(request: Uint8Array): Report {
  return toReport(request);
}

export function encodeVersionReply(request: Uint8Array, version: WireVersion): Report {
  const reply = encodeReply(request);
  writeVersion(reply, version);
  return reply;
}

export function encodeAdvancedKeyReply(request: Uint8Array, key: WireAdvancedKey): Report {
  const reply = encodeReply(request);
  writeAdvancedKey(reply, key);
  return reply;
}

/** Fills the requested keymap range; `keycodes[i]` is the code at `start + i`. */
export function encodeKeymapReply(request: Uint8Array, keycodes: readonly number[]): Report {
  const reply = encodeReply(request);
  writeKeymapCodes(reply, keycodes);
  return reply;
}

export function encodeRgbBaseReply(request: Uint8Array, config: WireRgbBase): Report {
  const reply = encodeReply(request);
  writeRgbBase(reply, config);
  return reply;
}

/** Fills each requested RGB entry; `undefined` entries (unknown indices) are left untouched. */
export function encodeRgbConfigReply(
  request: Uint8Array,
  configs: readonly (WireRgbKey | undefined)[]
): Report {
  const reply = encodeReply(request);
  const entries = count(byteAt(reply, 3), MAX_RGB_ENTRIES);
  for (let entry = 0; entry < entries; entry++) {
    const config = configs[entry];
    if (config) writeRgbKey(reply, entry, config);
  }
  return reply;
}

export function encodeDynamicKeyReply(request: Uint8Array, key: WireDynamicKey): Report {
  const reply = encodeReply(request);
  writeDynamicKey(reply, key);
  return reply;
}

export function encodeProfileIndexReply(request: Uint8Array, index: number): Report {
  const reply = encodeReply(request);
  reply[3] = index;
  return reply;
}

/** Fills each requested config flag; `undefined` entries (unknown indices) are left untouched. */
export function encodeConfigReply(
  request: Uint8Array,
  values: readonly (boolean | undefined)[]
): Report {
  const reply = encodeReply(request);
  const entries = count(byteAt(reply, 3), MAX_CONFIG_ENTRIES);
  for (let entry = 0; entry < entries; entry++) {
    const value = values[entry];
    if (value !== undefined) reply[configEntryOffset(entry) + 1] = value ? 1 : 0;
  }
  return reply;
}

/** Fills each requested macro action; `undefined` entries are left untouched. */
export function encodeMacroReply(
  request: Uint8Array,
  actions: readonly (WireMacroAction | undefined)[]
): Report {
  const reply = encodeReply(request);
  const entries = count(viewOf(reply).getUint16(4, true), MAX_MACRO_ACTIONS);
  for (let entry = 0; entry < entries; entry++) {
    const action = actions[entry];
    if (action) writeMacroAction(reply, entry, action);
  }
  return reply;
}

export function encodeFeatureReply(request: Uint8Array, feature: WireFeature): Report {
  const reply = encodeReply(request);
  writeFeature(reply, feature);
  return reply;
}

export function encodeLargeGetStartReply(
  request: Uint8Array,
  totalSize: number,
  checksum: number
): Report {
  const reply = encodeReply(request);
  const view = viewOf(reply);
  view.setUint32(4, totalSize, true);
  view.setUint32(8, checksum, true);
  return reply;
}

export function encodeLargeGetPayloadReply(
  request: Uint8Array,
  offset: number,
  data: Uint8Array
): Report {
  const reply = encodeReply(request);
  const chunk = data.subarray(0, MAX_LARGE_PAYLOAD);
  const view = viewOf(reply);
  view.setUint32(4, offset, true);
  view.setUint16(8, chunk.length, true);
  reply.fill(0, LARGE_PAYLOAD_OFFSET);
  reply.set(chunk, LARGE_PAYLOAD_OFFSET);
  return reply;
}

/** Device notification asking the host to reload its configuration. */
export function encodeConfigChangedEvent(): Report {
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = PacketCode.Event;
  report[1] = EventFlag.ConfigChanged;
  return report;
}

export function encodeConsoleReport(text: string): Report {
  const report = new Uint8Array(REPORT_SIZE);
  const bytes = textEncoder.encode(text).subarray(0, REPORT_SIZE - CONSOLE_TEXT_OFFSET);
  report[0] = PacketCode.Console;
  viewOf(report).setUint16(2, bytes.length, true);
  report.set(bytes, CONSOLE_TEXT_OFFSET);
  return report;
}

export function encodeDebugReport(tick: number, items: readonly WireDebugItem[]): Report {
  const report = new Uint8Array(REPORT_SIZE);
  const view = viewOf(report);
  const included = items.slice(0, MAX_DEBUG_ITEMS);
  report[0] = PacketCode.Debug;
  report[1] = included.length;
  view.setUint32(2, tick >>> 0, true);
  included.forEach((item, position) => {
    const base = DEBUG_ITEMS_OFFSET + position * DEBUG_ITEM_SIZE;
    view.setUint16(base, item.index, true);
    report[base + 2] = item.state ? 1 : 0;
    report[base + 3] = item.reportState ? 1 : 0;
    view.setUint16(base + 4, item.raw, true);
    view.setUint16(base + 6, item.filteredRaw, true);
    view.setUint16(base + 8, item.value, true);
  });
  return report;
}

/** Decodes a device → host report (for assertions on what the device sent). */
export function decodeDeviceReport(data: Uint8Array): DeviceReport {
  const report = toReport(data);
  const code = byteAt(report, 0);
  const view = viewOf(report);
  switch (code) {
    case PacketCode.Get:
    case PacketCode.Set:
      return {
        kind: 'reply',
        op: code === PacketCode.Get ? 'get' : 'set',
        id: byteAt(report, 1),
        data: decodePayload(report),
      };
    case PacketCode.LargeGet:
    case PacketCode.LargeSet:
      return {
        kind: 'largeReply',
        op: code === PacketCode.LargeGet ? 'largeGet' : 'largeSet',
        id: byteAt(report, 1),
        dataType: byteAt(report, 2),
        ...decodeLargeBody(report, true),
      };
    case PacketCode.Event: {
      const flag = byteAt(report, 1);
      return flag === EventFlag.ConfigChanged ? { kind: 'configChanged' } : { kind: 'event', flag };
    }
    case PacketCode.Console: {
      const length = count(view.getUint16(2, true), REPORT_SIZE - CONSOLE_TEXT_OFFSET);
      return {
        kind: 'console',
        text: textDecoder.decode(
          report.subarray(CONSOLE_TEXT_OFFSET, CONSOLE_TEXT_OFFSET + length)
        ),
      };
    }
    case PacketCode.Debug: {
      const length = count(byteAt(report, 1), MAX_DEBUG_ITEMS);
      return {
        kind: 'debug',
        tick: view.getUint32(2, true),
        items: Array.from({ length }, (_, position) => {
          const base = DEBUG_ITEMS_OFFSET + position * DEBUG_ITEM_SIZE;
          return {
            index: view.getUint16(base, true),
            state: byteAt(report, base + 2) > 0,
            reportState: byteAt(report, base + 3) > 0,
            raw: view.getUint16(base + 4, true),
            filteredRaw: view.getUint16(base + 6, true),
            value: view.getUint16(base + 8, true),
          };
        }),
      };
    }
    default:
      return { kind: 'unknown', code };
  }
}
