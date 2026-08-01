/**
 * DeviceSession: the only code that talks to the keyboard (spec §5). It picks and opens the device,
 * runs the connection state machine (§5.1), turns controller caches into immutable store snapshots
 * (§5.2) and implements every command (§5.3, D4–D10, D16).
 *
 * Invariants:
 * - The store and the controller never share mutable objects. Snapshots are deep, frozen copies;
 *   the controller only ever receives freshly built objects and arrays.
 * - Outside of reloads, the controller cache equals the store snapshot. Every load re-syncs the
 *   cache (with dynamic-key targets rebuilt from the keymap, D4), and every command rebuilds the
 *   parts it touches from the new snapshot, so a later `save()` writes exactly what the UI shows.
 * - Edits are rejected (and recorded in `lastError`) while a reload runs: the controller is then
 *   refilling its cache, and decisions made on the old snapshot (dynamic-key slots) could clobber
 *   the new one. Profile switches and factory resets count as reloads from the request on.
 * - A failed load, first or later, ends the connection with its message (D2). The app then no
 *   longer knows what the keyboard holds (after a profile switch it is already on the new
 *   profile), and a save would write the old snapshot into it.
 *
 * Framework-agnostic: nothing here depends on React (the hooks live in `store.ts`).
 */
import type { IAdvancedKey, USBDevice } from 'emi-keyboard-controller';
import {
  onControllerEvent,
  type ControllerEventMap,
  type ControllerEventType,
  type DeviceController,
} from './controller';
import { debugStream as appDebugStream, type DebugStream } from './debug-stream';
import {
  INITIAL_DEVICE_STATE,
  deviceStore as appDeviceStore,
  type DeviceState,
  type DeviceStore,
} from './device-store';
import {
  assertAdvancedKeyConfig,
  assertRgbBaseConfig,
  assertRgbKeyConfig,
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
  toRgbBaseConfig,
  toRgbKeyConfig,
} from './mapping';
import {
  bindDynamicKey,
  releaseIncompleteDynamicKeys,
  setKeymapEntries,
  unbindDynamicKeys,
  type DynamicKeyChange,
  type DynamicKeyDraft,
  type KeymapEntry,
} from './model/dynamic-key-binding';
import { clampFraction, isEqual } from './model/validation';
import type {
  AdvancedKeyConfig,
  ConnectionState,
  DeviceConfig,
  DynamicKeyKind,
  DynamicKeySlot,
  Keycode,
  ModelInfo,
  RgbBaseConfig,
  RgbKeyConfig,
} from './model/types';
import { HID_REQUEST_FILTERS, MODELS, matchModel, type ModelDefinition } from './models';

export type { DynamicKeyDraft } from './model/dynamic-key-binding';

/** Texts for the connection screen's error slot; the first three are the existing texts. */
export const CONNECTION_ERRORS = {
  noDevice: 'No compatible keyboards found',
  noController: 'No compatible controller found for detected device',
  connectFailed: 'Failed to connect to keyboard',
  noResponse: 'Keyboard did not respond',
  unsupportedFirmware: (version: string): string => `Unsupported firmware version ${version}`,
  loadFailed: (reason: string): string => `Failed to load keyboard configuration: ${reason}`,
} as const;

/** `lastError` messages of rejected commands. */
export const COMMAND_ERRORS = {
  notConnected: 'No keyboard is connected',
  reloading: 'The keyboard is reloading its configuration',
  noFreeSlot: 'No free dynamic key slot',
  noSuchKey: (keyId: number): string => `Key ${keyId} does not exist`,
  noSuchSlot: (slot: number): string => `Dynamic key slot ${slot} does not exist`,
  noSuchProfile: (index: number): string => `Profile ${index} does not exist`,
} as const;

export interface DeviceSessionTimeouts {
  /**
   * Error out when no `updateDataStart` follows opening the device (D2: no reply or unsupported
   * firmware). Also bounds the wait for the reload a profile switch or factory reset triggers.
   */
  readonly loadStartMs: number;
  /** Pause between two debug subscription requests of the debug loop (D16). */
  readonly debugPollMs: number;
}

export const DEFAULT_SESSION_TIMEOUTS: DeviceSessionTimeouts = Object.freeze({
  loadStartMs: 3000,
  debugPollMs: 100,
});

export interface DeviceSessionOptions {
  /**
   * The WebHID manager for the device picker, or a getter resolved on every `connect()`. The
   * vendored controllers always use `navigator.hid` themselves, so this must be that manager.
   */
  readonly hid: HID | (() => HID | undefined);
  readonly models?: readonly ModelDefinition[];
  readonly store?: DeviceStore;
  readonly timeouts?: Partial<DeviceSessionTimeouts>;
  readonly debugStream?: DebugStream;
}

export interface DeviceSession {
  /**
   * Opens the browser's device picker (call from a user gesture), then the device. Resolves when
   * the attempt ends: `ready` after the first complete load, `error`, or abandoned by
   * `disconnect()`. Calls during an attempt join it; calls while connected do nothing.
   */
  connect(): Promise<void>;
  /** Closes the device and forgets its configuration. */
  disconnect(): void;
  /**
   * `controller.save()` then `controller.flash()` (D9), after any reload in progress; concurrent
   * calls share one save. Never rejects: failures are recorded in `lastError`.
   */
  save(): Promise<void>;
  setKeycodes(layer: number, keyIds: readonly number[], keycode: Keycode): void;
  /** Keeps each key's calibration mode and sensor bounds: the firmware ignores host writes. */
  setAdvancedKeys(keyIds: readonly number[], config: AdvancedKeyConfig): void;
  setRgbBase(config: RgbBaseConfig): void;
  setRgbKeys(entries: readonly { keyId: number; config: RgbKeyConfig }[]): void;
  /**
   * Writes the draft to its key's slot or the first free one (D6); null when rejected. Slot
   * numbers are not stable: the slots in use are kept contiguous from 0 (libamp stops at the
   * first empty slot), so freeing a slot moves the highest dynamic key down into it.
   */
  applyDynamicKey(draft: DynamicKeyDraft): number | null;
  /**
   * Frees the slot and restores each of its keys to the dynamic key's own binding (D5). Slots that
   * do not exist are rejected into `lastError`; an empty slot is a no-op.
   */
  removeDynamicKey(slot: number): void;
  removeDynamicKeysOfKind(kind: Exclude<DynamicKeyKind, 'none'>): void;
  /** 0-based. Resolves once the keyboard has reloaded that profile (or failed to). */
  switchProfile(index: number): Promise<void>;
  systemReset(): void;
  enterBootloader(): void;
  factoryReset(): void;
  /** Streams debug samples of `keyId` into the debug stream until `stopDebug()` (D16). */
  startDebug(keyId: number): void;
  stopDebug(): void;
  /** The model's DFU bootloader; uses the last connected model after a disconnect. */
  detectBootloader(silent: boolean): Promise<USBDevice[]>;
}

// ---------------------------------------------------------------------------------------------
// Keymap packets

/**
 * At most 27 codes per `send_keymap_packet`: the limit documented by the controller README (D10).
 * 28 would fit into a 64-byte report, and the controller accepts 28.
 */
export const MAX_KEYMAP_PACKET_CODES = 27;

export interface KeymapRun {
  readonly layer: number;
  readonly start: number;
  readonly keycodes: readonly Keycode[];
}

/** Contiguous runs (one layer, consecutive key ids) of at most 27 codes, in keymap scan order. */
export function keymapRuns(entries: readonly KeymapEntry[]): KeymapRun[] {
  const latest = new Map<string, KeymapEntry>();
  for (const entry of entries) latest.set(`${entry.layer}:${entry.id}`, entry);
  const sorted = [...latest.values()].sort((a, b) => a.layer - b.layer || a.id - b.id);
  const runs: { layer: number; start: number; keycodes: Keycode[] }[] = [];
  for (const entry of sorted) {
    const run = runs[runs.length - 1];
    if (
      run?.layer === entry.layer &&
      run.start + run.keycodes.length === entry.id &&
      run.keycodes.length < MAX_KEYMAP_PACKET_CODES
    ) {
      run.keycodes.push(entry.keycode);
    } else {
      runs.push({ layer: entry.layer, start: entry.id, keycodes: [entry.keycode] });
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------------------------
// Helpers

const NO_DYNAMIC_KEY: DynamicKeySlot = Object.freeze({ kind: 'none' });

function messageOf(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error !== '') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string' && message !== '') return message;
  }
  return fallback;
}

function assertIndex(index: number, length: number, label: (index: number) => string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) throw new RangeError(label(index));
}

function hasChanges(change: DynamicKeyChange): boolean {
  return change.changedSlots.length > 0 || change.changedKeymapEntries.length > 0;
}

/** Fresh controller advanced keys for `configs`, keeping each key's live debug readings. */
function withLiveReadings(
  live: readonly IAdvancedKey[],
  configs: readonly AdvancedKeyConfig[]
): IAdvancedKey[] {
  return configs.map((config, id) => {
    const key = toControllerAdvancedKey(config);
    const current = live[id];
    if (current) {
      key.state = current.state;
      key.report_state = current.report_state;
      key.value = current.value;
      key.raw = current.raw;
      key.filtered_raw = current.filtered_raw;
      key.extremum = current.extremum;
    }
    return key;
  });
}

type LoadOutcome = 'loaded' | 'closed' | 'timeout';

/** A profile switch or factory reset, from the call until the reload it triggers has finished. */
interface ReloadRequest {
  /** Sent to the keyboard (it waits for an in-flight save first). */
  sent: boolean;
}

interface DebugLoop {
  keyId: number;
  /** Ends the loop's current pause early. */
  wake: (() => void) | null;
}

interface Connection {
  readonly controller: DeviceController;
  readonly model: ModelDefinition;
  readonly info: ModelInfo;
  readonly deviceName: string;
  phase: 'connecting' | 'loading' | 'ready';
  /** `controller.connect()` is still running; tear-down leaves closing to its continuation. */
  opening: boolean;
  /** `updateDataStart` … `updateDataEnd`. */
  reloading: boolean;
  /** Edits are rejected while any request is pending; a save waits only for sent ones. */
  readonly reloadRequests: Set<ReloadRequest>;
  /** Completed loads, to tell which load answered a request. */
  loads: number;
  loadStarted: boolean;
  watchdog: ReturnType<typeof setTimeout> | null;
  readyState: ConnectionState | null;
  debug: DebugLoop | null;
  saving: Promise<void> | null;
  /** Re-evaluated after every connection event. */
  readonly waiters: Set<() => void>;
  readonly unsubscribers: (() => void)[];
  readonly settled: Promise<void>;
  readonly settle: () => void;
}

// ---------------------------------------------------------------------------------------------
// Session

class Session implements DeviceSession {
  readonly #hid: () => HID | undefined;
  readonly #models: readonly ModelDefinition[];
  readonly #store: DeviceStore;
  readonly #timeouts: DeviceSessionTimeouts;
  readonly #debugStream: DebugStream;
  /** Bumped by every attempt and tear-down; async steps of older attempts stop when it moved. */
  #generation = 0;
  #attempt: Promise<void> | null = null;
  #connection: Connection | null = null;
  #lastModel: ModelDefinition | null = null;

  constructor(options: DeviceSessionOptions) {
    const { hid } = options;
    this.#hid = typeof hid === 'function' ? hid : () => hid;
    this.#models = options.models ?? MODELS;
    this.#store = options.store ?? appDeviceStore;
    this.#timeouts = { ...DEFAULT_SESSION_TIMEOUTS, ...options.timeouts };
    this.#debugStream = options.debugStream ?? appDebugStream;
  }

  // -------------------------------------------------------------------------------------------
  // Connection

  connect(): Promise<void> {
    if (this.#attempt) return this.#attempt;
    const { status } = this.#store.getState().connection;
    if (status !== 'disconnected' && status !== 'error') return Promise.resolve();
    const attempt = this.#connect().finally(() => {
      if (this.#attempt === attempt) this.#attempt = null;
    });
    this.#attempt = attempt;
    return attempt;
  }

  disconnect(): void {
    const connection = this.#connection;
    // Best effort: stop the keyboard streaming debug packets to a host that no longer listens.
    if (connection?.debug && connection.phase === 'ready') connection.controller.stop_debug();
    this.#teardown();
    this.#reset({ status: 'disconnected' });
  }

  async #connect(): Promise<void> {
    const generation = ++this.#generation;
    const stale = () => generation !== this.#generation;
    this.#reset({ status: 'selecting' });

    let devices: HIDDevice[];
    try {
      const hid = this.#hid();
      const filters = HID_REQUEST_FILTERS.map(filter => ({ ...filter }));
      devices = hid ? await hid.requestDevice({ filters }) : [];
    } catch (error) {
      if (!stale()) this.#fail(messageOf(error, CONNECTION_ERRORS.noDevice));
      return;
    }
    if (stale()) return;
    if (devices.length === 0) {
      this.#fail(CONNECTION_ERRORS.noDevice);
      return;
    }

    const match = await this.#match(devices);
    if (stale()) return;
    if (!match) {
      this.#fail(CONNECTION_ERRORS.noController);
      return;
    }

    this.#patch({ connection: { status: 'connecting' } });
    const connection = this.#attach(match.model, match.device);
    let opened: boolean;
    try {
      opened = await connection.controller.connect(match.device);
    } catch (error) {
      connection.opening = false;
      if (this.#isCurrent(connection)) {
        this.#fail(messageOf(error, CONNECTION_ERRORS.connectFailed));
      } else {
        connection.controller.disconnect();
      }
      return;
    }
    connection.opening = false;
    if (!this.#isCurrent(connection)) {
      connection.controller.disconnect();
      return;
    }
    if (!opened) {
      this.#fail(CONNECTION_ERRORS.connectFailed);
      return;
    }

    this.#lastModel = match.model;
    if (connection.phase === 'connecting') {
      connection.phase = 'loading';
      this.#patch({
        connection: {
          status: 'loading',
          model: connection.info,
          deviceName: connection.deviceName,
        },
      });
      if (!connection.loadStarted) {
        connection.watchdog = setTimeout(() => {
          this.#onNoLoadStart(connection);
        }, this.#timeouts.loadStartMs);
      }
    }
    await connection.settled;
  }

  async #match(devices: readonly HIDDevice[]) {
    for (const device of devices) {
      const model = await matchModel(device, this.#models);
      if (model) return { model, device };
    }
    return null;
  }

  /** Creates the connection's controller and subscribes to it (before `connect()`, §5.1). */
  #attach(model: ModelDefinition, device: HIDDevice): Connection {
    const controller = model.create();
    let settle = () => {};
    const settled = new Promise<void>(resolve => {
      settle = resolve;
    });
    const connection: Connection = {
      controller,
      model,
      info: readModelInfo(model, controller),
      deviceName: device.productName || model.displayName,
      phase: 'connecting',
      opening: true,
      reloading: false,
      reloadRequests: new Set(),
      loads: 0,
      loadStarted: false,
      watchdog: null,
      readyState: null,
      debug: null,
      saving: null,
      waiters: new Set(),
      unsubscribers: [],
      settled,
      settle: () => {
        settle();
      },
    };
    this.#connection = connection;

    const on = <K extends ControllerEventType>(
      type: K,
      handler: (detail: ControllerEventMap[K]) => void
    ) => {
      connection.unsubscribers.push(
        onControllerEvent(controller, type, detail => {
          if (this.#isCurrent(connection)) handler(detail);
        })
      );
    };
    on('updateDataStart', () => {
      this.#onLoadStart(connection);
    });
    on('updateData', () => {
      this.#onLoaded(connection);
    });
    on('updateDataEnd', () => {
      this.#onLoadEnd(connection);
    });
    on('updateDataError', ({ error }) => {
      this.#onLoadError(error);
    });
    on('updateDebugData', ({ tick, updatedKeys }) => {
      this.#onDebugData(connection, tick, updatedKeys);
    });
    on('consoleData', ({ text }) => {
      console.info(`[keyboard] ${text}`);
    });
    on('deviceDisconnected', () => {
      this.#teardown();
      this.#reset({ status: 'disconnected' });
    });
    return connection;
  }

  #isCurrent(connection: Connection): boolean {
    return this.#connection === connection;
  }

  #fail(message: string): void {
    this.#teardown();
    this.#reset({ status: 'error', message });
  }

  #teardown(): void {
    this.#generation += 1;
    this.#attempt = null;
    const connection = this.#connection;
    if (!connection) return;
    this.#connection = null;
    for (const unsubscribe of connection.unsubscribers.splice(0)) unsubscribe();
    this.#clearWatchdog(connection);
    this.#stopDebugLoop(connection);
    if (!connection.opening) connection.controller.disconnect();
    connection.settle();
    this.#notify(connection);
  }

  #clearWatchdog(connection: Connection): void {
    if (connection.watchdog !== null) clearTimeout(connection.watchdog);
    connection.watchdog = null;
  }

  #onNoLoadStart(connection: Connection): void {
    connection.watchdog = null;
    if (!this.#isCurrent(connection) || connection.loadStarted) return;
    const { major, minor, patch, info } = connection.controller.get_firmware_version();
    const answered = major !== 0 || minor !== 0 || patch !== 0 || info !== '';
    this.#fail(
      answered
        ? CONNECTION_ERRORS.unsupportedFirmware(`${major}.${minor}.${patch}`)
        : CONNECTION_ERRORS.noResponse
    );
  }

  #onLoadStart(connection: Connection): void {
    connection.loadStarted = true;
    this.#clearWatchdog(connection);
    connection.reloading = true;
    this.#syncReloading(connection);
    this.#notify(connection);
  }

  #onLoaded(connection: Connection): void {
    const { controller } = connection;
    let config: DeviceConfig;
    let snapshot: Pick<DeviceState, 'feature' | 'firmware'>;
    try {
      config = readDeviceConfig(controller);
      snapshot = {
        feature: readFeatureFlags(controller.get_feature()),
        firmware: readFirmwareVersion(controller.get_firmware_version()),
      };
      this.#syncCache(connection, config);
    } catch (error) {
      this.#onLoadError(error);
      return;
    }
    connection.loads += 1;
    connection.phase = 'ready';
    connection.readyState ??= deepFreeze({
      status: 'ready',
      model: connection.info,
      deviceName: connection.deviceName,
    });
    this.#patch({ connection: connection.readyState, config, ...snapshot });
    connection.settle();
    this.#notify(connection);
  }

  #onLoadEnd(connection: Connection): void {
    connection.reloading = false;
    this.#syncReloading(connection);
    this.#notify(connection);
  }

  /** A failed load ends the connection, also after the first one (see the file comment). */
  #onLoadError(error: unknown): void {
    this.#fail(CONNECTION_ERRORS.loadFailed(messageOf(error, 'unknown error')));
  }

  #onDebugData(connection: Connection, tick: number, updatedKeys: readonly number[]): void {
    const keys = connection.controller.get_advanced_keys();
    for (const keyId of updatedKeys) {
      const key = keys[keyId];
      if (!key) continue;
      this.#debugStream.publish({
        tick,
        keyId,
        value: clampFraction(key.value),
        raw: key.raw,
        filteredRaw: key.filtered_raw,
        state: key.state,
        reportState: key.report_state,
      });
    }
  }

  // -------------------------------------------------------------------------------------------
  // Store and controller cache

  #reset(connection: ConnectionState): void {
    this.#store.setState(deepFreeze({ ...INITIAL_DEVICE_STATE, connection }), true);
  }

  #patch(partial: Partial<DeviceState>): void {
    this.#store.setState(deepFreeze({ ...this.#store.getState(), ...partial }), true);
  }

  #syncReloading(connection: Connection): void {
    const reloading = connection.reloading || connection.reloadRequests.size > 0;
    if (this.#store.getState().reloading !== reloading) this.#patch({ reloading });
  }

  #notify(connection: Connection): void {
    for (const waiter of [...connection.waiters]) waiter();
  }

  /** Replaces every configuration cache of the controller with fresh copies of `config`. */
  #syncCache(connection: Connection, config: DeviceConfig): void {
    const { controller } = connection;
    controller.set_advanced_keys(
      withLiveReadings(controller.get_advanced_keys(), config.advancedKeys)
    );
    controller.set_keymap(toControllerKeymap(config.keymap));
    controller.set_rgb_base_config(toControllerRgbBase(config.rgbBase));
    controller.set_rgb_configs(config.rgbKeys.map(toControllerRgbConfig));
    controller.set_dynamic_keys(config.dynamicKeys.map(toControllerDynamicKey));
  }

  #recordError(operation: string, error: unknown): void {
    console.error(`[device] ${operation} failed:`, error);
    this.#patch({ lastError: { operation, message: messageOf(error, 'Unknown error') } });
  }

  #reject(operation: string, message: string): void {
    console.warn(`[device] ${operation} rejected: ${message}`);
    this.#patch({ lastError: { operation, message } });
  }

  /** Enqueues packets in order; failures of the current connection end up in `lastError`. */
  #send(connection: Connection, operation: string, packets: readonly (() => Promise<void>)[]) {
    const failed = (error: unknown) => {
      if (this.#isCurrent(connection)) this.#recordError(operation, error);
    };
    for (const packet of packets) {
      try {
        packet().catch(failed);
      } catch (error) {
        failed(error);
      }
    }
  }

  // -------------------------------------------------------------------------------------------
  // Commands

  /** The ready connection, or null (recorded in `lastError`). */
  #ready(operation: string): Connection | null {
    const connection = this.#connection;
    if (connection?.phase === 'ready') return connection;
    this.#reject(operation, COMMAND_ERRORS.notConnected);
    return null;
  }

  /** The ready connection and its snapshot when edits are allowed (not during reloads). */
  #editable(operation: string): { connection: Connection; config: DeviceConfig } | null {
    const connection = this.#ready(operation);
    if (!connection) return null;
    const { config } = this.#store.getState();
    if (!config) {
      this.#reject(operation, COMMAND_ERRORS.notConnected);
      return null;
    }
    if (connection.reloading || connection.reloadRequests.size > 0) {
      this.#reject(operation, COMMAND_ERRORS.reloading);
      return null;
    }
    return { connection, config };
  }

  setKeycodes(layer: number, keyIds: readonly number[], keycode: Keycode): void {
    const target = this.#editable('setKeycodes');
    if (!target) return;
    let change: DynamicKeyChange;
    try {
      const entries = keyIds.map(id => ({ layer, id, keycode }));
      change = setKeymapEntries(target.config.keymap, target.config.dynamicKeys, entries);
    } catch (error) {
      this.#recordError('setKeycodes', error);
      return;
    }
    this.#applyDynamicKeyChange(target.connection, target.config, 'setKeycodes', change);
  }

  setAdvancedKeys(keyIds: readonly number[], config: AdvancedKeyConfig): void {
    const target = this.#editable('setAdvancedKeys');
    if (!target) return;
    const { connection, config: current } = target;
    const ids = [...new Set(keyIds)];
    try {
      assertAdvancedKeyConfig(config);
      for (const id of ids) assertIndex(id, current.advancedKeys.length, COMMAND_ERRORS.noSuchKey);
    } catch (error) {
      this.#recordError('setAdvancedKeys', error);
      return;
    }
    const applied = toAdvancedKeyConfig(toControllerAdvancedKey(config));
    const updates = new Map<number, AdvancedKeyConfig>();
    for (const id of ids) {
      const key = current.advancedKeys[id];
      if (!key) continue;
      // Calibration mode and sensor bounds belong to the keyboard (it ignores host writes).
      const next = {
        ...applied,
        calibrationMode: key.calibrationMode,
        upperBound: key.upperBound,
        lowerBound: key.lowerBound,
      };
      if (!isEqual(key, next)) updates.set(id, next);
    }
    if (updates.size === 0) return;

    const next = deepFreeze({
      ...current,
      advancedKeys: current.advancedKeys.map((key, id) => updates.get(id) ?? key),
    });
    const { controller } = connection;
    controller.set_advanced_keys(
      withLiveReadings(controller.get_advanced_keys(), next.advancedKeys)
    );
    this.#send(
      connection,
      'setAdvancedKeys',
      [...updates].map(
        ([id, key]) =>
          () =>
            controller.send_advanced_key_packet(id, toControllerAdvancedKey(key))
      )
    );
    this.#patch({ config: next });
  }

  setRgbBase(config: RgbBaseConfig): void {
    const target = this.#editable('setRgbBase');
    if (!target) return;
    const { connection, config: current } = target;
    try {
      assertRgbBaseConfig(config);
    } catch (error) {
      this.#recordError('setRgbBase', error);
      return;
    }
    const rgbBase = toRgbBaseConfig(toControllerRgbBase(config));
    if (isEqual(rgbBase, current.rgbBase)) return;

    const next = deepFreeze({ ...current, rgbBase });
    const { controller } = connection;
    controller.set_rgb_base_config(toControllerRgbBase(next.rgbBase));
    this.#send(connection, 'setRgbBase', [
      () => controller.send_rgb_base_packet(toControllerRgbBase(next.rgbBase)),
    ]);
    this.#patch({ config: next });
  }

  setRgbKeys(entries: readonly { keyId: number; config: RgbKeyConfig }[]): void {
    const target = this.#editable('setRgbKeys');
    if (!target) return;
    const { connection, config: current } = target;
    const updates = new Map<number, RgbKeyConfig>();
    try {
      for (const { keyId, config } of entries) {
        assertIndex(keyId, current.rgbKeys.length, COMMAND_ERRORS.noSuchKey);
        assertRgbKeyConfig(config);
        updates.set(keyId, toRgbKeyConfig(toControllerRgbConfig(config)));
      }
    } catch (error) {
      this.#recordError('setRgbKeys', error);
      return;
    }
    for (const [keyId, config] of updates) {
      if (isEqual(current.rgbKeys[keyId], config)) updates.delete(keyId);
    }
    if (updates.size === 0) return;

    const next = deepFreeze({
      ...current,
      rgbKeys: current.rgbKeys.map((config, keyId) => updates.get(keyId) ?? config),
    });
    const { controller } = connection;
    controller.set_rgb_configs(next.rgbKeys.map(toControllerRgbConfig));
    this.#send(
      connection,
      'setRgbKeys',
      [...updates].map(
        ([keyId, config]) =>
          () =>
            controller.send_rgb_packet(keyId, toControllerRgbConfig(config))
      )
    );
    this.#patch({ config: next });
  }

  applyDynamicKey(draft: DynamicKeyDraft): number | null {
    const target = this.#editable('applyDynamicKey');
    if (!target) return null;
    let binding: ReturnType<typeof bindDynamicKey>;
    try {
      binding = bindDynamicKey(target.config.keymap, target.config.dynamicKeys, draft);
    } catch (error) {
      this.#recordError('applyDynamicKey', error);
      return null;
    }
    if (!binding) {
      this.#reject('applyDynamicKey', COMMAND_ERRORS.noFreeSlot);
      return null;
    }
    this.#applyDynamicKeyChange(target.connection, target.config, 'applyDynamicKey', binding);
    return binding.slot;
  }

  removeDynamicKey(slot: number): void {
    const target = this.#editable('removeDynamicKey');
    if (!target) return;
    const { keymap, dynamicKeys } = target.config;
    try {
      assertIndex(slot, dynamicKeys.length, COMMAND_ERRORS.noSuchSlot);
    } catch (error) {
      this.#recordError('removeDynamicKey', error);
      return;
    }
    // An existing but empty slot has nothing to remove: no packets, no error.
    const change = unbindDynamicKeys(keymap, dynamicKeys, [slot]);
    this.#applyDynamicKeyChange(target.connection, target.config, 'removeDynamicKey', change);
  }

  removeDynamicKeysOfKind(kind: Exclude<DynamicKeyKind, 'none'>): void {
    const target = this.#editable('removeDynamicKeysOfKind');
    if (!target) return;
    const { keymap, dynamicKeys } = target.config;
    const slots = dynamicKeys.flatMap((slot, index) => (slot.kind === kind ? [index] : []));
    const change = unbindDynamicKeys(keymap, dynamicKeys, slots);
    this.#applyDynamicKeyChange(
      target.connection,
      target.config,
      'removeDynamicKeysOfKind',
      change
    );
  }

  /**
   * Applies a keymap/dynamic-key change: cache, then packets, then the store. Dynamic keys are
   * written before keys point at them (including keys moved down into a freed slot), and released
   * slots are freed after their keys are restored, from the top down, so the slots in use stay
   * contiguous on the keyboard (libamp stops at the first empty slot).
   */
  #applyDynamicKeyChange(
    connection: Connection,
    current: DeviceConfig,
    operation: string,
    change: DynamicKeyChange
  ): void {
    if (!hasChanges(change)) return;
    const next = deepFreeze({ ...current, keymap: change.keymap, dynamicKeys: change.slots });
    const { controller } = connection;
    if (change.changedKeymapEntries.length > 0) {
      controller.set_keymap(toControllerKeymap(next.keymap));
    }
    if (change.changedSlots.length > 0) {
      controller.set_dynamic_keys(next.dynamicKeys.map(toControllerDynamicKey));
    }
    const slotOf = (index: number) => next.dynamicKeys[index] ?? NO_DYNAMIC_KEY;
    const slotPacket = (index: number) => () =>
      controller.send_dynamic_key_packet(index, toControllerDynamicKey(slotOf(index)));
    const released = (index: number) => slotOf(index).kind === 'none';
    this.#send(connection, operation, [
      ...change.changedSlots.filter(index => !released(index)).map(slotPacket),
      ...keymapRuns(change.changedKeymapEntries).map(
        run => () =>
          controller.send_keymap_packet(run.layer, run.start, run.keycodes.length, [
            ...run.keycodes,
          ])
      ),
      ...change.changedSlots.filter(released).toReversed().map(slotPacket),
    ]);
    this.#patch({ config: next });
  }

  save(): Promise<void> {
    const connection = this.#ready('save');
    if (!connection) return Promise.resolve();
    if (connection.saving) return connection.saving;
    const saving = this.#save(connection).finally(() => {
      connection.saving = null;
    });
    connection.saving = saving;
    return saving;
  }

  async #save(connection: Connection): Promise<void> {
    this.#patch({ saving: true });
    try {
      await this.#whenIdle(connection);
      if (!this.#isCurrent(connection)) return;
      const { config } = this.#store.getState();
      if (!config) return;
      // save() rejects dynamic keys without keys; they are unreachable anyway, so free them.
      const released = releaseIncompleteDynamicKeys(config.keymap, config.dynamicKeys);
      const next = hasChanges(released)
        ? deepFreeze({ ...config, keymap: released.keymap, dynamicKeys: released.slots })
        : config;
      this.#syncCache(connection, next);
      if (next !== config) this.#patch({ config: next });

      await connection.controller.save();
      if (!this.#isCurrent(connection)) return;
      connection.controller.flash();
      // save() rewrote the keyboard config bits from the load; keep debugging if it is running.
      if (connection.debug) connection.controller.start_debug();
    } catch (error) {
      if (this.#isCurrent(connection)) this.#recordError('save', error);
    } finally {
      if (this.#isCurrent(connection)) this.#patch({ saving: false });
    }
  }

  async switchProfile(index: number): Promise<void> {
    const connection = this.#ready('switchProfile');
    if (!connection) return;
    const profileCount = this.#store.getState().config?.profileCount ?? 0;
    if (!Number.isInteger(index) || index < 0 || index >= profileCount) {
      this.#reject('switchProfile', COMMAND_ERRORS.noSuchProfile(index));
      return;
    }
    await this.#expectReload(connection, 'switchProfile', () =>
      connection.controller.set_profile_index(index)
    );
  }

  systemReset(): void {
    this.#ready('systemReset')?.controller.system_reset();
  }

  enterBootloader(): void {
    this.#ready('enterBootloader')?.controller.enter_bootloader();
  }

  factoryReset(): void {
    const connection = this.#ready('factoryReset');
    if (!connection) return;
    void this.#expectReload(connection, 'factoryReset', () => {
      connection.controller.factory_reset();
    });
  }

  /**
   * Runs a request that makes the keyboard reload and waits for that reload to finish. Edits are
   * rejected from the call on. An in-flight save finishes first: the firmware restores the new
   * profile into RAM at once, and the rest of the save would overwrite it before the host sees
   * the change. A save waiting for reloads (#whenIdle) ignores unsent requests, so the two never
   * wait for each other.
   */
  async #expectReload(
    connection: Connection,
    operation: string,
    request: () => void | Promise<void>
  ): Promise<void> {
    const pending: ReloadRequest = { sent: false };
    connection.reloadRequests.add(pending);
    this.#syncReloading(connection);
    try {
      while (connection.saving && this.#isCurrent(connection)) await connection.saving;
      if (!this.#isCurrent(connection)) return;
      pending.sent = true;
      const since = connection.loads;
      await request();
      if (!this.#isCurrent(connection)) return;
      if ((await this.#nextLoad(connection, since)) === 'timeout') {
        this.#reject(operation, CONNECTION_ERRORS.noResponse);
      }
    } catch (error) {
      if (this.#isCurrent(connection)) this.#recordError(operation, error);
    } finally {
      connection.reloadRequests.delete(pending);
      if (this.#isCurrent(connection)) {
        this.#syncReloading(connection);
        // A save may be waiting for this request (see #whenIdle).
        this.#notify(connection);
      }
    }
  }

  /** The next load after `since`; times out when no reload starts within `loadStartMs`. */
  #nextLoad(connection: Connection, since: number): Promise<LoadOutcome> {
    return new Promise(resolve => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const disarm = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
      };
      const finish = (outcome: LoadOutcome) => {
        disarm();
        connection.waiters.delete(check);
        resolve(outcome);
      };
      const check = () => {
        if (!this.#isCurrent(connection)) finish('closed');
        else if (connection.loads > since) finish('loaded');
        else if (connection.reloading) disarm();
        else if (timer === null) {
          timer = setTimeout(() => {
            finish('timeout');
          }, this.#timeouts.loadStartMs);
        }
      };
      connection.waiters.add(check);
      check();
    });
  }

  /** Resolves once no reload runs or is expected from a sent request (or the connection ended). */
  #whenIdle(connection: Connection): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (
          !this.#isCurrent(connection) ||
          (!connection.reloading && ![...connection.reloadRequests].some(({ sent }) => sent))
        ) {
          connection.waiters.delete(check);
          resolve();
        }
      };
      connection.waiters.add(check);
      check();
    });
  }

  // -------------------------------------------------------------------------------------------
  // Debug (D16)

  startDebug(keyId: number): void {
    const connection = this.#ready('startDebug');
    if (!connection) return;
    const keyCount = this.#store.getState().config?.advancedKeys.length ?? 0;
    if (!Number.isInteger(keyId) || keyId < 0 || keyId >= keyCount) {
      this.#reject('startDebug', COMMAND_ERRORS.noSuchKey(keyId));
      return;
    }
    const running = connection.debug;
    if (running) {
      running.keyId = keyId;
      running.wake?.();
      return;
    }
    const loop: DebugLoop = { keyId, wake: null };
    connection.debug = loop;
    // libamp only streams debug packets while its debug config bit is set.
    connection.controller.start_debug();
    void this.#runDebugLoop(connection, loop);
  }

  stopDebug(): void {
    const connection = this.#connection;
    if (!connection?.debug) return;
    this.#stopDebugLoop(connection);
    connection.controller.stop_debug();
  }

  #stopDebugLoop(connection: Connection): void {
    const loop = connection.debug;
    if (!loop) return;
    connection.debug = null;
    loop.wake?.();
  }

  /**
   * Keeps the keyboard's debug window subscribed to the tracked key: libamp streams the window
   * continuously; re-subscribing recovers after reloads (the controller skips requests meanwhile).
   */
  async #runDebugLoop(connection: Connection, loop: DebugLoop): Promise<void> {
    while (connection.debug === loop && this.#isCurrent(connection)) {
      const keyId = loop.keyId;
      try {
        await connection.controller.request_debug_at([keyId]);
      } catch (error) {
        console.warn('[device] debug request failed', error);
      }
      if (connection.debug !== loop) return;
      if (loop.keyId !== keyId) continue;
      await new Promise<void>(resolve => {
        const timer = setTimeout(done, this.#timeouts.debugPollMs);
        function done() {
          clearTimeout(timer);
          loop.wake = null;
          resolve();
        }
        loop.wake = done;
      });
    }
  }

  detectBootloader(silent: boolean): Promise<USBDevice[]> {
    const connection = this.#connection;
    if (connection) return connection.controller.detect_bootloader(silent);
    const model = this.#lastModel;
    return model ? model.create().detect_bootloader(silent) : Promise.resolve([]);
  }
}

export function createDeviceSession(options: DeviceSessionOptions): DeviceSession {
  return new Session(options);
}

function browserHid(): HID | undefined {
  return typeof navigator !== 'undefined' && 'hid' in navigator ? navigator.hid : undefined;
}

/** The app's session: resolves `navigator.hid` on each connect, writes `deviceStore`. */
export const deviceSession: DeviceSession = createDeviceSession({ hid: browserHid });
