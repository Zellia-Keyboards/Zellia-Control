/**
 * Virtual WebUSB DFU bootloader, enough for `WebDfuDevice` from `emi-keyboard-controller`:
 * standard descriptors, the DFU 1.1 class requests (DNLOAD, UPLOAD, GETSTATUS, CLRSTATUS,
 * GETSTATE, ABORT) and the DfuSe extensions (set address 0x21, erase 0x41) used by the AT32/STM32
 * ROM bootloaders. Flash writes land in `memory`; `image` is what was programmed since the last
 * erase, so tests can compare it with the downloaded file.
 */
import {
  DFU_REQUEST,
  DFU_STATE,
  parseMemoryDescriptor,
  type DfuMemoryInfo,
  type USB,
  type USBAlternateInterface,
  type USBConfiguration,
  type USBControlTransferParameters,
  type USBDevice,
  type USBDeviceFilter,
  type USBDeviceRequestOptions,
  type USBInTransferResult,
  type USBInterface,
  type USBOutTransferResult,
} from 'emi-keyboard-controller';

export const DFU_STATUS = {
  OK: 0x00,
  ERR_WRITE: 0x03,
  ERR_PROG: 0x06,
  ERR_ADDRESS: 0x08,
  ERR_NOTDONE: 0x09,
  ERR_STALLEDPKT: 0x0f,
} as const;

/** 512 × 2 KiB sectors = 1 MiB, the largest image the firmware-update page accepts. */
export const DEFAULT_DFUSE_MEMORY_MAP = '@Internal Flash  /0x08000000/512*002Kg';
const STANDARD_MEMORY_SIZE = 1024 * 1024;
const GET_DESCRIPTOR = 0x06;
const INTERFACE_STRING_INDEX = 4;

export interface VirtualDfuOptions {
  /** DfuSe memory map advertised as the interface name; `null` for a plain DFU 1.1 device. */
  memoryMap?: string | null;
  /** `wTransferSize` of the functional descriptor (default 2048). */
  transferSize?: number;
  /** GETSTATUS replies that report dfuDNBUSY before a download request completes (default 0). */
  busyPolls?: number;
  /** `bwPollTimeout` reported with busy states, in ms (default 0). */
  pollTimeoutMs?: number;
  /** `bitManifestationTolerant` (default false, like the ROM bootloaders). */
  manifestationTolerant?: boolean;
  /** Already granted, i.e. returned by `navigator.usb.getDevices()` (default false). */
  authorized?: boolean;
}

export interface VirtualDfuIdentity {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
}

export interface VirtualDfuRequest {
  readonly direction: 'in' | 'out';
  readonly requestType: USBControlTransferParameters['requestType'];
  readonly request: number;
  readonly value: number;
  readonly length: number;
}

export interface VirtualDfuResetInfo {
  /** A download was manifested before the reset (the new firmware boots). */
  readonly manifested: boolean;
  readonly image: Uint8Array;
}

function toBytes(data: ArrayBuffer | ArrayBufferView | undefined): Uint8Array {
  if (!data) return new Uint8Array(0);
  // `ArrayBuffer.isView` (unlike `instanceof`) also recognizes views from other realms.
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  }
  return new Uint8Array(data).slice();
}

function stringDescriptor(text: string): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = bytes.length;
  bytes[1] = 0x03;
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < text.length; index++) {
    view.setUint16(2 + index * 2, text.charCodeAt(index), true);
  }
  return bytes;
}

function inResult(bytes: Uint8Array): USBInTransferResult {
  return { status: 'ok', data: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) };
}

const STALL_IN: USBInTransferResult = { status: 'stall' };
const STALL_OUT: USBOutTransferResult = { status: 'stall', bytesWritten: 0 };

export class VirtualDfuDevice extends EventTarget implements USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly manufacturerName = 'Virtual';
  readonly productName: string;
  readonly serialNumber = 'VIRTUAL-DFU-0001';
  readonly configurations: USBConfiguration[];
  configuration: USBConfiguration | null = null;
  opened = false;
  /** Whether the bootloader is currently enumerated on the virtual bus. */
  connected = false;
  /** Flash contents; erased bytes read 0xFF. */
  readonly memory: Uint8Array;
  readonly memoryInfo: DfuMemoryInfo | undefined;
  readonly transferSize: number;
  /** Every control transfer, for assertions. */
  readonly requests: VirtualDfuRequest[] = [];
  /** Called when the host resets the device (after manifestation the new firmware boots). */
  onReset: ((info: VirtualDfuResetInfo) => void) | null = null;

  readonly #interfaceName: string;
  readonly #options: Required<Omit<VirtualDfuOptions, 'memoryMap' | 'transferSize' | 'authorized'>>;
  readonly #base: number;
  readonly #descriptor: Uint8Array;
  #state: number = DFU_STATE.IDLE;
  #status: number = DFU_STATUS.OK;
  #busyRemaining = 0;
  #addressPointer: number;
  #erasedSectors = new Set<number>();
  #imageEnd = 0;
  #manifested = false;

  constructor(identity: VirtualDfuIdentity, options: VirtualDfuOptions = {}) {
    super();
    this.vendorId = identity.vendorId;
    this.productId = identity.productId;
    this.productName = identity.productName;
    this.transferSize = options.transferSize ?? 2048;
    this.#options = {
      busyPolls: options.busyPolls ?? 0,
      pollTimeoutMs: options.pollTimeoutMs ?? 0,
      manifestationTolerant: options.manifestationTolerant ?? false,
    };
    const memoryMap =
      options.memoryMap === undefined ? DEFAULT_DFUSE_MEMORY_MAP : options.memoryMap;
    this.memoryInfo = memoryMap === null ? undefined : parseMemoryDescriptor(memoryMap);
    this.#interfaceName = memoryMap ?? 'DFU Firmware';
    const segments = this.memoryInfo?.segments ?? [];
    const first = segments[0];
    const last = segments[segments.length - 1];
    this.#base = first?.start ?? 0;
    this.#addressPointer = this.#base;
    this.memory = new Uint8Array(
      first && last ? last.end - first.start : STANDARD_MEMORY_SIZE
    ).fill(0xff);

    const alternate: USBAlternateInterface = {
      alternateSetting: 0,
      interfaceClass: 0xfe,
      interfaceSubclass: 0x01,
      interfaceProtocol: 0x02,
      interfaceName: this.#interfaceName,
    };
    const intf: USBInterface = {
      interfaceNumber: 0,
      alternate,
      alternates: [alternate],
      claimed: false,
    };
    this.configurations = [{ configurationValue: 1, configurationName: 'DFU', interfaces: [intf] }];

    const attributes = 0x01 | 0x02 | (this.#options.manifestationTolerant ? 0x04 : 0) | 0x08; // download, upload, …, detach
    this.#descriptor = new Uint8Array([
      ...[9, 0x02, 27, 0, 1, 1, 0, 0x80, 50],
      ...[9, 0x04, 0, 0, 0, 0xfe, 0x01, 0x02, INTERFACE_STRING_INDEX],
      ...[
        9,
        0x21,
        attributes,
        0xff,
        0x00,
        this.transferSize & 0xff,
        this.transferSize >> 8,
        0x1a,
        0x01,
      ],
    ]);
  }

  get isDfuSe(): boolean {
    return this.memoryInfo !== undefined;
  }

  /** Bytes programmed from the start of flash up to the highest written address. */
  get image(): Uint8Array {
    return this.memory.slice(0, this.#imageEnd);
  }

  get state(): number {
    return this.#state;
  }

  async open(): Promise<void> {
    if (!this.connected) throw new DOMException('The device was disconnected.', 'NotFoundError');
    await Promise.resolve();
    this.opened = true;
  }

  async close(): Promise<void> {
    await Promise.resolve();
    this.#release();
  }

  async selectConfiguration(configurationValue: number): Promise<void> {
    this.#ensureOpen();
    const configuration = this.configurations.find(
      item => item.configurationValue === configurationValue
    );
    if (!configuration) throw new DOMException('Unknown configuration.', 'NotFoundError');
    await Promise.resolve();
    this.configuration = configuration;
  }

  async claimInterface(interfaceNumber: number): Promise<void> {
    this.#interface(interfaceNumber).claimed = true;
    await Promise.resolve();
  }

  async selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void> {
    const intf = this.#interface(interfaceNumber);
    const alternate = intf.alternates.find(item => item.alternateSetting === alternateSetting);
    if (!alternate) throw new DOMException('Unknown alternate setting.', 'NotFoundError');
    await Promise.resolve();
    intf.alternate = alternate;
  }

  async controlTransferIn(
    setup: USBControlTransferParameters,
    length: number
  ): Promise<USBInTransferResult> {
    this.#ensureOpen();
    await Promise.resolve();
    this.#log('in', setup, length);
    if (setup.requestType === 'standard') {
      return setup.request === GET_DESCRIPTOR ? this.#descriptorIn(setup.value, length) : STALL_IN;
    }
    if (setup.requestType !== 'class') return STALL_IN;
    switch (setup.request) {
      case DFU_REQUEST.GET_STATUS:
        return inResult(this.#getStatus());
      case DFU_REQUEST.GET_STATE:
        return inResult(new Uint8Array([this.#state]));
      case DFU_REQUEST.UPLOAD:
        return this.#upload(setup.value, length);
      default:
        return STALL_IN;
    }
  }

  async controlTransferOut(
    setup: USBControlTransferParameters,
    data?: ArrayBuffer | ArrayBufferView
  ): Promise<USBOutTransferResult> {
    this.#ensureOpen();
    await Promise.resolve();
    const bytes = toBytes(data);
    this.#log('out', setup, bytes.length);
    if (setup.requestType !== 'class') return STALL_OUT;
    switch (setup.request) {
      case DFU_REQUEST.DOWNLOAD:
        return this.#download(setup.value, bytes);
      case DFU_REQUEST.CLEAR_STATUS:
        this.#status = DFU_STATUS.OK;
        this.#state = DFU_STATE.IDLE;
        return { status: 'ok', bytesWritten: 0 };
      case DFU_REQUEST.ABORT:
        if (this.#state !== DFU_STATE.ERROR) this.#state = DFU_STATE.IDLE;
        return { status: 'ok', bytesWritten: 0 };
      case DFU_REQUEST.DETACH:
        return { status: 'ok', bytesWritten: 0 };
      default:
        return STALL_OUT;
    }
  }

  async reset(): Promise<void> {
    this.#ensureOpen();
    await Promise.resolve();
    const manifested = this.#manifested;
    this.#release();
    this.#state = DFU_STATE.IDLE;
    this.#status = DFU_STATUS.OK;
    this.#manifested = false;
    this.onReset?.({ manifested, image: this.image });
  }

  #release(): void {
    this.opened = false;
    this.configuration = null;
    for (const configuration of this.configurations) {
      for (const intf of configuration.interfaces) {
        intf.claimed = false;
        intf.alternate = intf.alternates[0] ?? null;
      }
    }
  }

  #ensureOpen(): void {
    if (!this.opened)
      throw new DOMException('The device must be opened first.', 'InvalidStateError');
  }

  #interface(interfaceNumber: number): USBInterface {
    this.#ensureOpen();
    const intf = this.configuration?.interfaces.find(
      item => item.interfaceNumber === interfaceNumber
    );
    if (!intf) throw new DOMException('Unknown interface.', 'NotFoundError');
    return intf;
  }

  #log(direction: 'in' | 'out', setup: USBControlTransferParameters, length: number): void {
    this.requests.push({
      direction,
      requestType: setup.requestType,
      request: setup.request,
      value: setup.value,
      length,
    });
  }

  #descriptorIn(value: number, length: number): USBInTransferResult {
    const type = value >> 8;
    const index = value & 0xff;
    if (type === 0x02) return inResult(this.#descriptor.slice(0, length));
    if (type !== 0x03) return STALL_IN;
    const strings: Record<number, string> = {
      1: this.manufacturerName,
      2: this.productName,
      3: this.serialNumber,
      [INTERFACE_STRING_INDEX]: this.#interfaceName,
    };
    const text = strings[index];
    if (index === 0) return inResult(new Uint8Array([4, 0x03, 0x09, 0x04]).slice(0, length));
    return text === undefined ? STALL_IN : inResult(stringDescriptor(text).slice(0, length));
  }

  #getStatus(): Uint8Array {
    let reported = this.#state;
    if (this.#state === DFU_STATE.DOWNLOAD_SYNC) {
      if (this.#busyRemaining > 0) {
        this.#busyRemaining -= 1;
        reported = DFU_STATE.DOWNLOAD_BUSY;
      } else {
        this.#state = DFU_STATE.DOWNLOAD_IDLE;
        reported = this.#state;
      }
    } else if (this.#state === DFU_STATE.MANIFEST_SYNC) {
      this.#manifested = true;
      if (this.#options.manifestationTolerant) {
        this.#state = DFU_STATE.IDLE;
        reported = this.#state;
      } else {
        this.#state = DFU_STATE.MANIFEST_WAIT_RESET;
        reported = DFU_STATE.MANIFEST;
      }
    }
    const timeout = reported === DFU_STATE.DOWNLOAD_BUSY ? this.#options.pollTimeoutMs : 0;
    return new Uint8Array([
      this.#status,
      timeout & 0xff,
      (timeout >> 8) & 0xff,
      (timeout >> 16) & 0xff,
      reported,
      0,
    ]);
  }

  #fail(status: number): USBOutTransferResult {
    this.#status = status;
    this.#state = DFU_STATE.ERROR;
    return STALL_OUT;
  }

  #busy(): void {
    this.#state = DFU_STATE.DOWNLOAD_SYNC;
    this.#busyRemaining = this.#options.busyPolls;
  }

  /** Whether every sector touched by `[offset, offset + length)` was erased. */
  #erased(offset: number, length: number): boolean {
    let address = this.#base + offset;
    const end = address + length;
    while (address < end) {
      const segment = this.memoryInfo?.segments.find(
        item => item.start <= address && address < item.end
      );
      if (!segment) return false;
      const sector =
        segment.start +
        Math.floor((address - segment.start) / segment.sectorSize) * segment.sectorSize;
      if (!this.#erasedSectors.has(sector)) return false;
      address = sector + segment.sectorSize;
    }
    return true;
  }

  #download(block: number, bytes: Uint8Array): USBOutTransferResult {
    if (this.#state === DFU_STATE.ERROR) return STALL_OUT;
    if (bytes.length === 0) {
      if (this.#state !== DFU_STATE.IDLE && this.#state !== DFU_STATE.DOWNLOAD_IDLE) {
        return this.#fail(DFU_STATUS.ERR_NOTDONE);
      }
      this.#state = DFU_STATE.MANIFEST_SYNC;
      return { status: 'ok', bytesWritten: 0 };
    }
    if (this.isDfuSe && block === 0) return this.#command(bytes);
    if (this.isDfuSe && block === 1) return this.#fail(DFU_STATUS.ERR_STALLEDPKT);
    const offset = this.isDfuSe
      ? this.#addressPointer - this.#base + (block - 2) * this.transferSize
      : block * this.transferSize;
    if (offset < 0 || offset + bytes.length > this.memory.length) {
      return this.#fail(DFU_STATUS.ERR_ADDRESS);
    }
    if (this.isDfuSe && !this.#erased(offset, bytes.length)) return this.#fail(DFU_STATUS.ERR_PROG);
    this.memory.set(bytes, offset);
    this.#imageEnd = Math.max(this.#imageEnd, offset + bytes.length);
    this.#busy();
    return { status: 'ok', bytesWritten: bytes.length };
  }

  #command(bytes: Uint8Array): USBOutTransferResult {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const command = bytes[0];
    if (command === 0x21 && bytes.length === 5) {
      const address = view.getUint32(1, true);
      if (address < this.#base || address >= this.#base + this.memory.length) {
        return this.#fail(DFU_STATUS.ERR_ADDRESS);
      }
      this.#addressPointer = address;
      this.#busy();
      return { status: 'ok', bytesWritten: bytes.length };
    }
    if (command === 0x41 && bytes.length === 1) {
      this.memory.fill(0xff);
      for (const segment of this.memoryInfo?.segments ?? []) {
        for (let sector = segment.start; sector < segment.end; sector += segment.sectorSize) {
          this.#erasedSectors.add(sector);
        }
      }
      this.#imageEnd = 0;
      this.#busy();
      return { status: 'ok', bytesWritten: bytes.length };
    }
    if (command === 0x41 && bytes.length === 5) {
      const address = view.getUint32(1, true);
      const segment = this.memoryInfo?.segments.find(
        item => item.start <= address && address < item.end
      );
      if (!segment?.erasable) return this.#fail(DFU_STATUS.ERR_ADDRESS);
      const sector =
        segment.start +
        Math.floor((address - segment.start) / segment.sectorSize) * segment.sectorSize;
      this.memory.fill(0xff, sector - this.#base, sector - this.#base + segment.sectorSize);
      this.#erasedSectors.add(sector);
      if (sector - this.#base < this.#imageEnd) this.#imageEnd = sector - this.#base;
      this.#busy();
      return { status: 'ok', bytesWritten: bytes.length };
    }
    if (command === 0x92 && bytes.length === 1) {
      this.#busy();
      return { status: 'ok', bytesWritten: bytes.length };
    }
    return this.#fail(DFU_STATUS.ERR_STALLEDPKT);
  }

  #upload(block: number, length: number): USBInTransferResult {
    if (this.#state !== DFU_STATE.IDLE && this.#state !== DFU_STATE.UPLOAD_IDLE) return STALL_IN;
    if (this.isDfuSe && block === 0) {
      this.#state = DFU_STATE.UPLOAD_IDLE;
      return inResult(new Uint8Array([0x00, 0x21, 0x41, 0x92]).slice(0, length));
    }
    if (this.isDfuSe && block === 1) return STALL_IN;
    const offset = this.isDfuSe
      ? this.#addressPointer - this.#base + (block - 2) * this.transferSize
      : block * this.transferSize;
    this.#state = DFU_STATE.UPLOAD_IDLE;
    return inResult(this.memory.slice(Math.max(offset, 0), Math.max(offset, 0) + length));
  }
}

class VirtualUsbConnectionEvent extends Event {
  constructor(
    type: 'connect' | 'disconnect',
    readonly device: USBDevice
  ) {
    super(type);
  }
}

function matches(device: USBDevice, filter: USBDeviceFilter): boolean {
  if (filter.vendorId !== undefined && filter.vendorId !== device.vendorId) return false;
  if (filter.productId !== undefined && filter.productId !== device.productId) return false;
  if (filter.serialNumber !== undefined && filter.serialNumber !== device.serialNumber)
    return false;
  return true;
}

/** `navigator.usb` stand-in holding virtual DFU devices. */
export class VirtualUsb extends EventTarget implements USB {
  /** How the browser's device chooser answers `requestDevice`. */
  picker: 'first' | 'cancel' = 'first';
  readonly #devices: VirtualDfuDevice[] = [];
  readonly #authorized = new Set<VirtualDfuDevice>();

  /** Registers a device (not yet enumerated). */
  attach(device: VirtualDfuDevice, options: { authorized?: boolean } = {}): void {
    if (!this.#devices.includes(device)) this.#devices.push(device);
    if (options.authorized) this.#authorized.add(device);
  }

  plugIn(device: VirtualDfuDevice): void {
    this.attach(device);
    if (device.connected) return;
    device.connected = true;
    this.dispatchEvent(new VirtualUsbConnectionEvent('connect', device));
  }

  unplug(device: VirtualDfuDevice): void {
    if (!device.connected) return;
    device.connected = false;
    device.opened = false;
    this.dispatchEvent(new VirtualUsbConnectionEvent('disconnect', device));
  }

  async getDevices(): Promise<USBDevice[]> {
    await Promise.resolve();
    return this.#devices.filter(device => device.connected && this.#authorized.has(device));
  }

  async requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice> {
    await Promise.resolve();
    const candidates = this.#devices.filter(
      device => device.connected && options.filters.some(filter => matches(device, filter))
    );
    const [picked] = candidates;
    if (this.picker === 'cancel' || !picked) {
      throw new DOMException('No device selected.', 'NotFoundError');
    }
    this.#authorized.add(picked);
    return picked;
  }
}
