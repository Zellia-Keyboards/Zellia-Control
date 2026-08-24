/**
 * Virtual libamp keyboard: a WebHID-compatible device plus the firmware behaviour behind it.
 *
 * The firmware side follows libamp's `packet.c`/`keyboard.c`: every GET/SET/large request is
 * processed and echoed back with the same `code | id | type`; events and debug subscriptions get
 * no reply; keyboard operations run on key-down events; debug packets stream while the `debug`
 * config bit is on; profile switches, resets and calibration notify the host with a
 * config-changed event. Replies are delivered asynchronously (a microtask, or `latencyMs`).
 */
import {
  KeyEvent,
  PacketType,
  REPORT_SIZE,
  decodeHostReport,
  encodeAdvancedKeyReply,
  encodeConfigChangedEvent,
  encodeConfigReply,
  encodeConsoleReport,
  encodeDebugReport,
  encodeDynamicKeyReply,
  encodeFeatureReply,
  encodeKeymapReply,
  encodeLargeGetPayloadReply,
  encodeLargeGetStartReply,
  encodeMacroReply,
  encodeProfileIndexReply,
  encodeReply,
  encodeRgbBaseReply,
  encodeRgbConfigReply,
  encodeVersionReply,
  toReport,
  type HostPacket,
  type WireDebugItem,
  type WireVersion,
} from './protocol';
import {
  createDefaultConfig,
  createVirtualKeyboardState,
  factoryReset,
  resetActiveProfile,
  restoreProfile,
  saveProfile,
  selectProfile,
  type VirtualKeyboardState,
  type VirtualKeyboardStateOptions,
  type VirtualScripts,
} from './state';
import { VirtualDfuDevice, VirtualUsb, type VirtualDfuOptions } from './dfu';
import type { VirtualKeyboardHandle, VirtualPicker } from './handle';

const KEYBOARD_OPERATION = 0xfe;
const KEYBOARD_CONFIG_BASE = 0x20;
const DEBUG_CONFIG_INDEX = 0;
const DEBUG_WINDOW = 5;
/** Ticks per synthetic press/release cycle of the debug travel curve. */
const TRAVEL_PERIOD_TICKS = 400;

const Operation = {
  Reboot: 0x00,
  FactoryReset: 0x01,
  Save: 0x02,
  Bootloader: 0x03,
  ResetToDefault: 0x04,
  BrightnessUp: 0x05,
  BrightnessDown: 0x06,
  Calibrate: 0x07,
  Recovery: 0x08,
  FormatStorage: 0x09,
  Profile0: 0x10,
  Profile3: 0x13,
} as const;

type Picker = VirtualPicker;

class VirtualInputReportEvent extends Event implements HIDInputReportEvent {
  constructor(
    readonly device: HIDDevice,
    readonly reportId: number,
    readonly data: DataView
  ) {
    super('inputreport');
  }
}

class VirtualConnectionEvent extends Event implements HIDConnectionEvent {
  constructor(
    type: 'connect' | 'disconnect',
    readonly device: HIDDevice
  ) {
    super(type);
  }
}

interface DeviceHooks {
  /** A host → device output report (already padded to 64 bytes). */
  receive(report: Uint8Array): void;
  /** The device was opened or closed. */
  openChanged(): void;
}

export interface VirtualHidIdentity {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly usagePage: number;
  readonly usage: number;
}

/** A WebHID `HIDDevice` backed by the virtual firmware. */
type InputReportListener = (this: HIDDevice, event: HIDInputReportEvent) => unknown;
type ConnectionListener = (this: HID, event: HIDConnectionEvent) => unknown;

/**
 * WebHID declares typed listener overloads (`inputreport`, `connect`/`disconnect`) that
 * `EventTarget`'s signature is not assignable to. The virtual classes only ever dispatch the
 * matching event classes, so passing typed listeners through to `EventTarget` is sound.
 */
function asEventListener(
  listener: EventListenerOrEventListenerObject | InputReportListener | ConnectionListener | null
): EventListenerOrEventListenerObject | null {
  return listener as EventListenerOrEventListenerObject | null;
}

export class VirtualHidDevice extends EventTarget implements HIDDevice {
  oninputreport: InputReportListener | null = null;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: HIDCollectionInfo[];
  #opened = false;
  #connected = true;
  #hooks: DeviceHooks | null = null;

  constructor(identity: VirtualHidIdentity) {
    super();
    this.vendorId = identity.vendorId;
    this.productId = identity.productId;
    this.productName = identity.productName;
    this.collections = [
      {
        usagePage: identity.usagePage,
        usage: identity.usage,
        type: 1,
        children: [],
        inputReports: [{ reportId: 0, items: [] }],
        outputReports: [{ reportId: 0, items: [] }],
        featureReports: [],
      },
    ];
  }

  get opened(): boolean {
    return this.#opened;
  }

  override addEventListener(
    type: 'inputreport',
    listener: InputReportListener,
    options?: boolean | AddEventListenerOptions
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | InputReportListener | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, asEventListener(listener), options);
  }

  override removeEventListener(
    type: 'inputreport',
    listener: InputReportListener,
    options?: boolean | EventListenerOptions
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | InputReportListener | null,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, asEventListener(listener), options);
  }

  /** Whether the device is enumerated (plugged in). */
  get connected(): boolean {
    return this.#connected;
  }

  /** @internal Wires the device to its firmware. */
  bind(hooks: DeviceHooks): void {
    this.#hooks = hooks;
  }

  /** @internal Plug state, driven by {@link VirtualHid}. */
  setConnected(connected: boolean): void {
    this.#connected = connected;
    if (!connected) this.#setOpened(false);
  }

  async open(): Promise<void> {
    await Promise.resolve();
    if (!this.#connected) throw new DOMException('Failed to open the device.', 'NotFoundError');
    if (this.#opened) throw new DOMException('The device is already open.', 'InvalidStateError');
    this.#setOpened(true);
  }

  async close(): Promise<void> {
    await Promise.resolve();
    this.#setOpened(false);
  }

  async forget(): Promise<void> {
    await this.close();
  }

  async sendReport(_reportId: number, data: BufferSource): Promise<void> {
    await Promise.resolve();
    if (!this.#opened) {
      throw new DOMException('The device must be opened first.', 'InvalidStateError');
    }
    this.#hooks?.receive(toReport(data));
  }

  async sendFeatureReport(): Promise<void> {
    await Promise.resolve();
    throw new DOMException('Feature reports are not supported.', 'NotSupportedError');
  }

  async receiveFeatureReport(): Promise<DataView> {
    await Promise.resolve();
    throw new DOMException('Feature reports are not supported.', 'NotSupportedError');
  }

  /** @internal Delivers a device → host input report while the device is open. */
  deliver(report: Uint8Array): boolean {
    if (!this.#opened) return false;
    const buffer = new ArrayBuffer(REPORT_SIZE);
    new Uint8Array(buffer).set(report.subarray(0, REPORT_SIZE));
    const event = new VirtualInputReportEvent(this, 0, new DataView(buffer));
    this.dispatchEvent(event);
    this.oninputreport?.call(this, event);
    return true;
  }

  #setOpened(opened: boolean): void {
    if (this.#opened === opened) return;
    this.#opened = opened;
    this.#hooks?.openChanged();
  }
}

function matchesFilter(device: HIDDevice, filter: HIDDeviceFilter): boolean {
  if (filter.vendorId !== undefined && filter.vendorId !== device.vendorId) return false;
  if (filter.productId !== undefined && filter.productId !== device.productId) return false;
  return device.collections.some(
    collection =>
      (filter.usagePage === undefined || filter.usagePage === collection.usagePage) &&
      (filter.usage === undefined || filter.usage === collection.usage)
  );
}

/** A WebHID `HID` manager (`navigator.hid`) holding virtual devices. */
export class VirtualHid extends EventTarget implements HID {
  onconnect: ((this: HID, event: Event) => unknown) | null = null;
  ondisconnect: ((this: HID, event: Event) => unknown) | null = null;
  /** How the browser's device chooser answers `requestDevice`. */
  picker: Picker;
  readonly #devices: VirtualHidDevice[] = [];
  readonly #authorized = new Set<VirtualHidDevice>();

  constructor(options: { picker?: Picker } = {}) {
    super();
    this.picker = options.picker ?? 'first';
  }

  override addEventListener(
    type: 'connect' | 'disconnect',
    listener: ConnectionListener,
    options?: boolean | AddEventListenerOptions
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ConnectionListener | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, asEventListener(listener), options);
  }

  override removeEventListener(
    type: 'connect' | 'disconnect',
    listener: ConnectionListener,
    options?: boolean | EventListenerOptions
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ConnectionListener | null,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, asEventListener(listener), options);
  }

  attach(device: VirtualHidDevice, options: { authorized?: boolean } = {}): void {
    if (!this.#devices.includes(device)) this.#devices.push(device);
    if (options.authorized) this.#authorized.add(device);
  }

  plugIn(device: VirtualHidDevice): void {
    this.attach(device);
    if (device.connected) return;
    device.setConnected(true);
    this.#dispatch(new VirtualConnectionEvent('connect', device));
  }

  unplug(device: VirtualHidDevice): void {
    if (!device.connected) return;
    device.setConnected(false);
    this.#dispatch(new VirtualConnectionEvent('disconnect', device));
  }

  async getDevices(): Promise<HIDDevice[]> {
    await Promise.resolve();
    return this.#devices.filter(device => device.connected && this.#authorized.has(device));
  }

  async requestDevice(options?: HIDDeviceRequestOptions): Promise<HIDDevice[]> {
    await Promise.resolve();
    const filters = options?.filters ?? [];
    const candidates = this.#devices.filter(
      device => device.connected && filters.some(filter => matchesFilter(device, filter))
    );
    const [picked] = candidates;
    if (this.picker === 'cancel' || !picked) return [];
    this.#authorized.add(picked);
    return [picked];
  }

  #dispatch(event: VirtualConnectionEvent): void {
    this.dispatchEvent(event);
    const handler = event.type === 'connect' ? this.onconnect : this.ondisconnect;
    handler?.call(this, event);
  }
}

export interface VirtualKeyboardOptions extends VirtualKeyboardStateOptions {
  /** HID product name (default: the model's, e.g. `ZelliaKB`). */
  productName?: string;
  /** Attach to an existing `navigator.hid` stand-in instead of creating one. */
  hid?: VirtualHid;
  /** Attach the bootloader to an existing `navigator.usb` stand-in. */
  usb?: VirtualUsb;
  /** Reply latency; 0 (default) replies in a microtask. */
  latencyMs?: number;
  /** Interval of debug packets while debugging is on (default 10 ms). */
  debugIntervalMs?: number;
  /** Delay until the keyboard re-enumerates after a reboot or update; null stays unplugged. */
  reconnectDelayMs?: number | null;
  /** Delay between a calibration request and its config-changed notification (default 1000). */
  calibrationDelayMs?: number;
  /** Granted before the test starts (returned by `getDevices()`). */
  authorized?: boolean;
  /** Initial answer of the HID device chooser. */
  picker?: Picker;
  /** Bootloader behaviour (models with a DFU filter only). */
  dfu?: VirtualDfuOptions;
  /** Firmware version reported after a successful DFU download. */
  firmwareAfterUpdate?: Partial<WireVersion>;
}

export interface VirtualKeyboard extends VirtualKeyboardHandle {
  readonly device: VirtualHidDevice;
  readonly hid: VirtualHid;
  readonly usb: VirtualUsb;
  /** The bootloader that appears after `KeyboardBootloader`, if the model has one. */
  readonly dfu: VirtualDfuDevice | null;
  /** Live device state; mutate it to simulate changes made on the keyboard itself. */
  readonly state: VirtualKeyboardState;
  /** Host → device reports, in order. */
  readonly sentReports: readonly Uint8Array[];
  /** {@link sentReports}, decoded. */
  readonly sentPackets: readonly HostPacket[];
  /** Device → host reports, in order. */
  readonly inputReports: readonly Uint8Array[];
  /** Whether the HID device is plugged in. */
  readonly connected: boolean;
  clearHistory(): void;
  /** Physically unplugs the keyboard. */
  disconnect(): void;
  /** Plugs the keyboard (back) in. */
  reconnect(): void;
  setFirmwareVersion(version: Partial<WireVersion>): void;
  /** While unresponsive the device ignores every report (no replies, no effects). */
  setUnresponsive(unresponsive: boolean): void;
  /** Ignores matching requests (neither applied nor answered) until the returned restore runs. */
  dropReplies(predicate: (packet: HostPacket) => boolean): () => void;
  /** Sends a config-changed event, as the firmware does after on-board changes. */
  notifyConfigChanged(): void;
  /** Sends a console message. */
  log(text: string): void;
  /** Reboots like `KeyboardReboot`. */
  reboot(): void;
  /** Jumps to the bootloader like `KeyboardBootloader`. */
  enterBootloader(): void;
  /** Stops timers and ignores further input. */
  dispose(): void;
}

/** Synthetic travel (0 = released … 1 = bottomed out) of key `index` at `tick`. */
export function syntheticTravel(tick: number, index: number): number {
  const phase =
    (((tick + index * 37) % TRAVEL_PERIOD_TICKS) + TRAVEL_PERIOD_TICKS) % TRAVEL_PERIOD_TICKS;
  return (1 - Math.cos((2 * Math.PI * phase) / TRAVEL_PERIOD_TICKS)) / 2;
}

interface PendingUpload {
  readonly target: keyof VirtualScripts;
  readonly data: Uint8Array;
}

class VirtualKeyboardImpl implements VirtualKeyboard {
  readonly device: VirtualHidDevice;
  readonly hid: VirtualHid;
  readonly usb: VirtualUsb;
  readonly dfu: VirtualDfuDevice | null;
  readonly state: VirtualKeyboardState;
  readonly #sentReports: Uint8Array[] = [];
  readonly #sentPackets: HostPacket[] = [];
  readonly #inputReports: Uint8Array[] = [];
  readonly #latencyMs: number;
  readonly #debugIntervalMs: number;
  readonly #reconnectDelayMs: number | null;
  readonly #calibrationDelayMs: number;
  readonly #firmwareAfterUpdate: Partial<WireVersion> | undefined;
  readonly #dropPredicates = new Set<(packet: HostPacket) => boolean>();
  readonly #timers = new Set<ReturnType<typeof setTimeout>>();
  #debugTimer: ReturnType<typeof setInterval> | null = null;
  #debugBuffer: number[] = Array.from({ length: DEBUG_WINDOW }, () => 0);
  #debugLength = 0;
  #tick = 0;
  #upload: PendingUpload | null = null;
  #unresponsive = false;
  #disposed = false;

  constructor(options: VirtualKeyboardOptions) {
    this.state = createVirtualKeyboardState(options);
    const { model } = this.state;
    this.#latencyMs = options.latencyMs ?? 0;
    this.#debugIntervalMs = options.debugIntervalMs ?? 10;
    this.#reconnectDelayMs = options.reconnectDelayMs === undefined ? 0 : options.reconnectDelayMs;
    this.#calibrationDelayMs = options.calibrationDelayMs ?? 1000;
    this.#firmwareAfterUpdate = options.firmwareAfterUpdate;

    this.device = new VirtualHidDevice({
      ...model,
      productName: options.productName ?? model.productName,
    });
    this.device.bind({
      receive: report => {
        this.#receive(report);
      },
      openChanged: () => {
        this.#updateDebugStream();
      },
    });
    this.hid = options.hid ?? new VirtualHid(options.picker ? { picker: options.picker } : {});
    this.hid.attach(this.device, { authorized: options.authorized ?? false });

    this.usb = options.usb ?? new VirtualUsb();
    this.dfu = model.bootloader ? new VirtualDfuDevice(model.bootloader, options.dfu) : null;
    if (this.dfu) {
      const dfu = this.dfu;
      this.usb.attach(dfu, { authorized: options.dfu?.authorized ?? false });
      dfu.onReset = ({ manifested }) => {
        this.usb.unplug(dfu);
        if (manifested && this.#firmwareAfterUpdate) {
          this.state.firmware = { ...this.state.firmware, ...this.#firmwareAfterUpdate };
        }
        this.#boot();
      };
    }
  }

  get sentReports(): readonly Uint8Array[] {
    return this.#sentReports;
  }

  get sentPackets(): readonly HostPacket[] {
    return this.#sentPackets;
  }

  get inputReports(): readonly Uint8Array[] {
    return this.#inputReports;
  }

  get connected(): boolean {
    return this.device.connected;
  }

  clearHistory(): void {
    this.#sentReports.length = 0;
    this.#sentPackets.length = 0;
    this.#inputReports.length = 0;
  }

  disconnect(): void {
    this.hid.unplug(this.device);
  }

  reconnect(): void {
    if (this.#disposed) return;
    this.hid.plugIn(this.device);
  }

  setFirmwareVersion(version: Partial<WireVersion>): void {
    this.state.firmware = { ...this.state.firmware, ...version };
  }

  setUnresponsive(unresponsive: boolean): void {
    this.#unresponsive = unresponsive;
  }

  dropReplies(predicate: (packet: HostPacket) => boolean): () => void {
    this.#dropPredicates.add(predicate);
    return () => {
      this.#dropPredicates.delete(predicate);
    };
  }

  notifyConfigChanged(): void {
    this.#later(() => {
      this.#send(encodeConfigChangedEvent());
    });
  }

  log(text: string): void {
    this.#later(() => {
      this.#send(encodeConsoleReport(text));
    });
  }

  reboot(): void {
    this.hid.unplug(this.device);
    this.#boot();
  }

  enterBootloader(): void {
    this.hid.unplug(this.device);
    this.#resetVolatileState();
    if (this.dfu) this.usb.plugIn(this.dfu);
  }

  dispose(): void {
    this.#disposed = true;
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
    this.#updateDebugStream();
  }

  // -------------------------------------------------------------------------------------------
  // Scheduling

  #timeout(task: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      task();
    }, delayMs);
    this.#timers.add(timer);
  }

  #later(task: () => void): void {
    const run = () => {
      if (this.#disposed) return;
      try {
        task();
      } catch (error) {
        console.error('[virtual-keyboard] firmware task failed', error);
      }
    };
    if (this.#latencyMs > 0) this.#timeout(run, this.#latencyMs);
    else void Promise.resolve().then(run);
  }

  #send(report: Uint8Array): void {
    if (this.device.deliver(report)) this.#inputReports.push(report.slice());
  }

  #notify(): void {
    this.#send(encodeConfigChangedEvent());
  }

  // -------------------------------------------------------------------------------------------
  // Firmware

  #receive(report: Uint8Array): void {
    if (this.#disposed) return;
    const packet = decodeHostReport(report);
    this.#sentReports.push(report.slice());
    this.#sentPackets.push(packet);
    if (this.#unresponsive) return;
    for (const predicate of this.#dropPredicates) if (predicate(packet)) return;
    this.#later(() => {
      this.#process(report, packet);
    });
  }

  #process(report: Uint8Array, packet: HostPacket): void {
    switch (packet.op) {
      case 'get':
        this.#send(this.#answer(report, packet));
        return;
      case 'set':
        this.#apply(report, packet);
        this.#send(encodeReply(report));
        return;
      case 'largeGet':
      case 'largeSet':
        this.#send(this.#large(report, packet));
        return;
      case 'event':
        this.#event(packet);
        return;
      case 'debug':
        this.#debugLength = packet.keyIds.length;
        packet.keyIds.forEach((keyId, index) => {
          this.#debugBuffer[index] = keyId;
        });
        return;
      case 'unknown':
        return;
    }
  }

  #answer(report: Uint8Array, packet: Extract<HostPacket, { op: 'get' }>): Uint8Array {
    const { active } = this.state;
    switch (packet.kind) {
      case 'version':
        return encodeVersionReply(report, this.state.firmware);
      case 'advancedKey': {
        const key = active.advancedKeys[packet.index];
        return key ? encodeAdvancedKeyReply(report, key) : encodeReply(report);
      }
      case 'keymap': {
        const layer = active.keymap[packet.layer];
        return layer
          ? encodeKeymapReply(report, layer.slice(packet.start, packet.start + packet.length))
          : encodeReply(report);
      }
      case 'rgbBase':
        return encodeRgbBaseReply(report, active.rgbBase);
      case 'rgbConfig':
        return encodeRgbConfigReply(
          report,
          packet.indices.map(index => active.rgbKeys[index])
        );
      case 'dynamicKey': {
        const key = active.dynamicKeys[packet.index];
        return key ? encodeDynamicKeyReply(report, key) : encodeReply(report);
      }
      case 'profileIndex':
        return encodeProfileIndexReply(report, this.state.profileIndex);
      case 'config':
        return encodeConfigReply(
          report,
          packet.indices.map(index => this.state.config[index])
        );
      case 'macro': {
        const actions = this.#macroActions(report, packet.macroIndex);
        return actions
          ? encodeMacroReply(
              report,
              packet.actionIndices.map(index => actions[index])
            )
          : encodeReply(report);
      }
      case 'feature':
        return encodeFeatureReply(report, this.state.feature);
      case 'other':
        return encodeReply(report);
    }
  }

  /** The macro's actions, or undefined when libamp ignores the packet (bad index or length). */
  #macroActions(report: Uint8Array, macroIndex: number) {
    const length = new DataView(report.buffer, report.byteOffset).getUint16(4, true);
    return length > 4 ? undefined : this.state.macros[macroIndex];
  }

  #apply(report: Uint8Array, packet: Extract<HostPacket, { op: 'set' }>): void {
    const { active } = this.state;
    switch (packet.kind) {
      case 'advancedKey': {
        const current = active.advancedKeys[packet.index];
        // libamp ignores calibration mode and sensor bounds written by the host.
        if (current) {
          active.advancedKeys[packet.index] = {
            ...packet.key,
            calibrationMode: current.calibrationMode,
            upperBound: current.upperBound,
            lowerBound: current.lowerBound,
          };
        }
        return;
      }
      case 'keymap': {
        const layer = active.keymap[packet.layer];
        packet.keycodes.forEach((keycode, offset) => {
          const id = packet.start + offset;
          if (layer && id < layer.length) layer[id] = keycode;
        });
        return;
      }
      case 'rgbBase':
        active.rgbBase = packet.config;
        return;
      case 'rgbConfig':
        for (const entry of packet.entries) {
          if (entry.index < active.rgbKeys.length) active.rgbKeys[entry.index] = entry.config;
        }
        return;
      case 'dynamicKey':
        if (packet.index < active.dynamicKeys.length) active.dynamicKeys[packet.index] = packet.key;
        return;
      case 'profileIndex':
        selectProfile(this.state, packet.index);
        return;
      case 'config':
        for (const entry of packet.entries) {
          if (entry.index < this.state.config.length) this.state.config[entry.index] = entry.value;
        }
        this.#updateDebugStream();
        return;
      case 'macro': {
        const actions = this.#macroActions(report, packet.macroIndex);
        for (const action of packet.actions) {
          if (actions && action.index < actions.length) actions[action.index] = action;
        }
        return;
      }
      case 'version':
      case 'feature':
      case 'other':
        return;
    }
  }

  #large(report: Uint8Array, packet: Extract<HostPacket, { op: 'largeGet' | 'largeSet' }>) {
    const target =
      packet.dataType === PacketType.ScriptSource
        ? 'source'
        : packet.dataType === PacketType.ScriptBytecode
          ? 'bytecode'
          : null;
    if (!target) return encodeReply(report);
    if (packet.op === 'largeSet') {
      switch (packet.command) {
        case 'start':
          this.#upload = { target, data: new Uint8Array(packet.totalSize) };
          break;
        case 'payload':
          if (this.#upload?.target === target && packet.offset < this.#upload.data.length) {
            const room = this.#upload.data.length - packet.offset;
            this.#upload.data.set(packet.data.subarray(0, room), packet.offset);
          }
          break;
        case 'end':
          if (this.#upload?.target === target) this.state.scripts[target] = this.#upload.data;
          this.#upload = null;
          break;
        case 'abort':
        case 'other':
          this.#upload = null;
          break;
      }
      return encodeReply(report);
    }
    const data = this.state.scripts[target];
    switch (packet.command) {
      case 'start':
        return encodeLargeGetStartReply(report, data.length, 0);
      case 'payload':
        return encodeLargeGetPayloadReply(
          report,
          packet.offset,
          data.subarray(packet.offset, packet.offset + packet.length)
        );
      default:
        return encodeReply(report);
    }
  }

  #event(packet: Extract<HostPacket, { op: 'event' }>): void {
    if ((packet.keycode & 0xff) !== KEYBOARD_OPERATION) return;
    const sub = packet.keycode >> 8;
    if (packet.event === KeyEvent.KeyUp) {
      if (sub === Operation.Calibrate) {
        this.#timeout(() => {
          this.#notify();
        }, this.#calibrationDelayMs);
      }
      return;
    }
    if (packet.event !== KeyEvent.KeyDown) return;
    if ((sub & 0x3f) >= KEYBOARD_CONFIG_BASE) {
      this.#configOperation((sub & 0x3f) - KEYBOARD_CONFIG_BASE, (sub >> 6) & 0x03);
      return;
    }
    this.#keyboardOperation(sub & 0x3f);
  }

  #configOperation(index: number, action: number): void {
    const current = this.state.config[index];
    if (current === undefined) return;
    if (action === 0) this.state.config[index] = false;
    else if (action === 1) this.state.config[index] = true;
    else if (action === 2) this.state.config[index] = !current;
    this.#updateDebugStream();
  }

  #keyboardOperation(operation: number): void {
    const { state } = this;
    switch (operation) {
      case Operation.Reboot:
        this.reboot();
        return;
      case Operation.FactoryReset:
        factoryReset(state);
        this.#notify();
        return;
      case Operation.Save:
        saveProfile(state);
        return;
      case Operation.Bootloader:
        this.enterBootloader();
        return;
      case Operation.ResetToDefault:
        resetActiveProfile(state);
        this.#notify();
        return;
      case Operation.BrightnessUp:
      case Operation.BrightnessDown: {
        const { brightness } = state.active.rgbBase;
        const next =
          operation === Operation.BrightnessUp
            ? Math.min(brightness + 16, 255)
            : Math.max(brightness - 16, 0);
        state.active.rgbBase = { ...state.active.rgbBase, brightness: next };
        return;
      }
      case Operation.Recovery:
        restoreProfile(state);
        return;
      case Operation.FormatStorage:
        factoryReset(state);
        this.reboot();
        return;
      default:
        if (operation >= Operation.Profile0 && operation <= Operation.Profile3) {
          selectProfile(state, operation & 0x0f);
          this.#notify();
        }
    }
  }

  #resetVolatileState(): void {
    this.state.config = createDefaultConfig();
    this.#debugBuffer = Array.from({ length: DEBUG_WINDOW }, () => 0);
    this.#debugLength = 0;
    this.#upload = null;
    this.#updateDebugStream();
  }

  /** Power-on: working config from storage, volatile state cleared, re-enumerate. */
  #boot(): void {
    restoreProfile(this.state);
    this.#resetVolatileState();
    if (this.#reconnectDelayMs !== null) {
      this.#timeout(() => {
        this.reconnect();
      }, this.#reconnectDelayMs);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Debug stream

  #updateDebugStream(): void {
    const streaming =
      !this.#disposed && this.device.opened && this.state.config[DEBUG_CONFIG_INDEX] === true;
    if (streaming && this.#debugTimer === null) {
      this.#debugTimer = setInterval(() => {
        this.#emitDebugPacket();
      }, this.#debugIntervalMs);
    } else if (!streaming && this.#debugTimer !== null) {
      clearInterval(this.#debugTimer);
      this.#debugTimer = null;
    }
  }

  #totalKeys(): number {
    const { active } = this.state;
    return Math.max(active.advancedKeys.length, active.keymap[0]?.length ?? 0, 1);
  }

  #emitDebugPacket(): void {
    this.#tick += this.#debugIntervalMs;
    if (this.#debugLength === 0) {
      // libamp rotates through the keyboard, continuing after the last reported key.
      const last = this.#debugBuffer[DEBUG_WINDOW - 1] ?? 0;
      const total = this.#totalKeys();
      this.#debugBuffer = Array.from(
        { length: DEBUG_WINDOW },
        (_, index) => (last + 1 + index) % total
      );
    }
    const length = this.#debugLength === 0 ? DEBUG_WINDOW : this.#debugLength;
    const items = this.#debugBuffer.slice(0, length).map(index => this.#debugItem(index));
    this.#send(encodeDebugReport(this.#tick, items));
  }

  #debugItem(index: number): WireDebugItem {
    const travel = syntheticTravel(this.#tick, index);
    const key = this.state.active.advancedKeys[index];
    if (key) {
      const value = Math.round(travel * 65535);
      const raw = Math.round(key.upperBound - travel * (key.upperBound - key.lowerBound));
      const pressed = value >= key.activation;
      return { index, state: pressed, reportState: pressed, raw, filteredRaw: raw, value };
    }
    const pressed = index < this.#totalKeys() && travel >= 0.5;
    const value = pressed ? 65535 : 0;
    return { index, state: pressed, reportState: pressed, raw: value, filteredRaw: value, value };
  }
}

/** Creates a virtual keyboard (plugged in, not yet authorized unless `authorized` is set). */
export function createVirtualKeyboard(options: VirtualKeyboardOptions = {}): VirtualKeyboard {
  return new VirtualKeyboardImpl(options);
}
