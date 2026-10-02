import type {
  USB,
  USBAlternateInterface,
  USBConfiguration,
  USBControlTransferParameters,
  USBDevice,
  USBDeviceFilter,
  USBInTransferResult,
  USBInterface,
} from './webusb-types';

export interface DfuUsbFilter {
  vendorId?: number;
  productId?: number;
  serialNumber?: string;
}

export interface DfuInterfaceSettings {
  configuration: USBConfiguration;
  interface: USBInterface;
  alternate: USBAlternateInterface;
}

export interface DfuFunctionalDescriptor {
  willDetach: boolean;
  manifestationTolerant: boolean;
  canUpload: boolean;
  canDownload: boolean;
  transferSize: number;
  detachTimeout: number;
  dfuVersion: number;
}

export interface DfuMemorySegment {
  start: number;
  end: number;
  sectorSize: number;
  readable: boolean;
  erasable: boolean;
  writable: boolean;
}

export interface DfuMemoryInfo {
  name: string;
  segments: DfuMemorySegment[];
}

export interface DfuCapabilities extends DfuFunctionalDescriptor {
  protocol: 'runtime' | 'dfu';
  interfaceName: string;
  memoryInfo?: DfuMemoryInfo;
  isDfuSe: boolean;
}

export type DfuOperation = 'upload' | 'download';
export type DfuPhase = 'erase' | 'transfer' | 'manifest';

export interface DfuProgress {
  operation: DfuOperation;
  phase: DfuPhase;
  transferred: number;
  total: number;
  percentage: number | null;
}

export interface DfuTransferOptions {
  onProgress?: (progress: DfuProgress) => void | Promise<void>;
  signal?: AbortSignal;
}

export interface DfuUploadOptions extends DfuTransferOptions {
  maxSize?: number;
  firstBlock?: number;
}

export interface DfuDeviceInfo {
  vendorId: number;
  productId: number;
  productName: string;
  manufacturerName: string;
  serialNumber: string;
  configurationValue: number;
  interfaceNumber: number;
  alternateSetting: number;
  interfaceName: string;
  capabilities: DfuCapabilities;
}

export class DfuError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DfuError';
  }
}

export class DfuAbortError extends DfuError {
  constructor(message = 'DFU operation aborted') {
    super(message);
    this.name = 'DfuAbortError';
  }
}

export const DFU_REQUEST = {
  DETACH: 0x00,
  DOWNLOAD: 0x01,
  UPLOAD: 0x02,
  GET_STATUS: 0x03,
  CLEAR_STATUS: 0x04,
  GET_STATE: 0x05,
  ABORT: 0x06,
} as const;

export const DFU_STATE = {
  APP_IDLE: 0,
  APP_DETACH: 1,
  IDLE: 2,
  DOWNLOAD_SYNC: 3,
  DOWNLOAD_BUSY: 4,
  DOWNLOAD_IDLE: 5,
  MANIFEST_SYNC: 6,
  MANIFEST: 7,
  MANIFEST_WAIT_RESET: 8,
  UPLOAD_IDLE: 9,
  ERROR: 10,
} as const;

const DFU_STATUS_OK = 0;
const USB_DFU_CLASS = 0xfe;
const USB_DFU_SUBCLASS = 0x01;
const USB_DFU_RUNTIME_PROTOCOL = 0x01;
const USB_DFU_PROTOCOL = 0x02;
const GET_DESCRIPTOR = 0x06;
const CONFIGURATION_DESCRIPTOR = 0x02;
const STRING_DESCRIPTOR = 0x03;
const DFU_FUNCTIONAL_DESCRIPTOR = 0x21;

interface DfuStatus {
  status: number;
  pollTimeout: number;
  state: number;
}

function usb(): USB | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.usb;
}

function matchesFilter(device: USBDevice, filter: DfuUsbFilter): boolean {
  if (filter.vendorId !== undefined && device.vendorId !== filter.vendorId) return false;
  if (filter.productId !== undefined && device.productId !== filter.productId) return false;
  if (filter.serialNumber !== undefined && device.serialNumber !== filter.serialNumber) return false;
  return true;
}

function isDfuAlternate(alternate: USBAlternateInterface): boolean {
  return alternate.interfaceClass === USB_DFU_CLASS &&
    alternate.interfaceSubclass === USB_DFU_SUBCLASS &&
    (alternate.interfaceProtocol === USB_DFU_RUNTIME_PROTOCOL || alternate.interfaceProtocol === USB_DFU_PROTOCOL);
}

export function parseMemoryDescriptor(desc: string): DfuMemoryInfo | undefined {
  const nameEndIndex = desc.indexOf('/');
  if (!desc.startsWith('@') || nameEndIndex === -1) return undefined;

  const name = desc.substring(1, nameEndIndex).trim();
  const segmentString = desc.substring(nameEndIndex);
  const sectorMultipliers: Record<string, number> = {
    ' ': 1,
    B: 1,
    K: 1024,
    M: 1024 * 1024,
  };
  const segments: DfuMemorySegment[] = [];
  const contiguousRegex = /\/\s*(0x[0-9a-fA-F]{1,8})\s*\/(\s*[0-9]+\s*\*\s*[0-9]+\s?[ BKM]\s*[a-g]\s*,?\s*)+/g;
  let contiguousMatch: RegExpExecArray | null;
  while ((contiguousMatch = contiguousRegex.exec(segmentString)) !== null) {
    const contiguousText = contiguousMatch[0];
    const segmentRegex = /([0-9]+)\s*\*\s*([0-9]+)\s?([ BKM])\s*([a-g])\s*,?\s*/g;
    let address = parseInt(contiguousMatch[1], 16);
    let segmentMatch: RegExpExecArray | null;
    while ((segmentMatch = segmentRegex.exec(contiguousText)) !== null) {
      const sectorCount = parseInt(segmentMatch[1], 10);
      const sectorSize = parseInt(segmentMatch[2], 10) * sectorMultipliers[segmentMatch[3]];
      const properties = segmentMatch[4].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
      const start = address;
      const end = start + sectorSize * sectorCount;
      segments.push({
        start,
        end,
        sectorSize,
        readable: (properties & 0x1) !== 0,
        erasable: (properties & 0x2) !== 0,
        writable: (properties & 0x4) !== 0,
      });
      address = end;
    }
  }

  return segments.length > 0 ? { name, segments } : undefined;
}

export function findDfuInterfaces(device: USBDevice): DfuInterfaceSettings[] {
  const matches: DfuInterfaceSettings[] = [];
  for (const configuration of device.configurations ?? []) {
    for (const intf of configuration.interfaces ?? []) {
      for (const alternate of intf.alternates ?? []) {
        if (isDfuAlternate(alternate)) {
          matches.push({ configuration, interface: intf, alternate });
        }
      }
    }
  }
  return matches;
}

/**
 * Discover authorized or user-selected USB DFU devices.
 * A runtime device is not returned: callers receive only devices exposing a
 * standard DFU interface, ready to be passed to WebDfuDevice.connect().
 */
export async function detectUSBDevice(
  filter: DfuUsbFilter | undefined,
  silent = false,
): Promise<USBDevice[]> {
  const usbApi = usb();
  if (!usbApi || !filter) return [];

  if (silent) {
    const devices = await usbApi.getDevices();
    return devices.filter((device) => matchesFilter(device, filter) && findDfuInterfaces(device).length > 0);
  }

  try {
    const device = await usbApi.requestDevice({ filters: [filter as USBDeviceFilter] });
    if (!matchesFilter(device, filter) || findDfuInterfaces(device).length === 0) return [];
    return [device];
  } catch (error) {
    const name = typeof DOMException !== 'undefined' && error instanceof DOMException ? error.name : '';
    if (name === 'AbortError' || name === 'NotFoundError') return [];
    throw error;
  }
}

function descriptorIndex(device: USBDevice, configuration: USBConfiguration): number {
  const index = device.configurations.indexOf(configuration);
  return index >= 0 ? index : 0;
}

function ensureData(result: USBInTransferResult, label: string): DataView {
  if (result.status !== 'ok' || !result.data) {
    throw new DfuError(`${label} failed: ${result.status}`);
  }
  return result.data;
}

function isDisconnectError(error: unknown): boolean {
  const text = String(error);
  return text.includes('NotFoundError') ||
    text.includes('Device unavailable') ||
    text.includes('device was disconnected') ||
    text.includes('Unable to reset the device');
}

function asAbortError(signal?: AbortSignal): DfuAbortError | undefined {
  return signal?.aborted ? new DfuAbortError() : undefined;
}

export class WebDfuDevice {
  private activeOperation: DfuOperation | null = null;
  private aborted = false;
  private opened = false;

  private constructor(
    public readonly device: USBDevice,
    public readonly settings: DfuInterfaceSettings,
    public readonly capabilities: DfuCapabilities,
  ) {}

  static async connect(device: USBDevice, interfaceIndex = 0): Promise<WebDfuDevice> {
    const interfaces = findDfuInterfaces(device);
    if (interfaces.length === 0) {
      throw new DfuError('The selected USB device does not expose a standard DFU interface.');
    }
    const settings = interfaces[interfaceIndex];
    if (!settings) throw new DfuError(`DFU interface ${interfaceIndex} was not found.`);
    const memoryInfo = parseMemoryDescriptor(settings.alternate.interfaceName || '');

    const instance = new WebDfuDevice(device, settings, {
      willDetach: false,
      manifestationTolerant: false,
      canUpload: settings.alternate.interfaceProtocol === USB_DFU_PROTOCOL,
      canDownload: settings.alternate.interfaceProtocol === USB_DFU_PROTOCOL,
      transferSize: 1024,
      detachTimeout: 0,
      dfuVersion: 0,
      protocol: settings.alternate.interfaceProtocol === USB_DFU_RUNTIME_PROTOCOL ? 'runtime' : 'dfu',
      interfaceName: settings.alternate.interfaceName || '',
      memoryInfo,
      isDfuSe: memoryInfo !== undefined,
    });

    await instance.open();
    const descriptor = await instance.readFunctionalDescriptor();
    if (descriptor) {
      Object.assign(instance.capabilities, descriptor);
    }
    return instance;
  }

  get info(): DfuDeviceInfo {
    return {
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      productName: this.device.productName || '',
      manufacturerName: this.device.manufacturerName || '',
      serialNumber: this.device.serialNumber || '',
      configurationValue: this.settings.configuration.configurationValue,
      interfaceNumber: this.settings.interface.interfaceNumber,
      alternateSetting: this.settings.alternate.alternateSetting,
      interfaceName: this.capabilities.interfaceName,
      capabilities: this.capabilities,
    };
  }

  private async open(): Promise<void> {
    if (!this.device.opened) await this.device.open();
    const configurationValue = this.settings.configuration.configurationValue;
    if (!this.device.configuration || this.device.configuration.configurationValue !== configurationValue) {
      await this.device.selectConfiguration(configurationValue);
    }
    const intfNumber = this.settings.interface.interfaceNumber;
    const selectedInterface = this.device.configuration?.interfaces[intfNumber];
    if (!selectedInterface) throw new DfuError(`DFU interface ${intfNumber} is unavailable.`);
    if (!selectedInterface.claimed) await this.device.claimInterface(intfNumber);
    const alternateSetting = this.settings.alternate.alternateSetting;
    if (!selectedInterface.alternate ||
        selectedInterface.alternate.alternateSetting !== alternateSetting ||
        selectedInterface.alternates.length > 1) {
      await this.device.selectAlternateInterface(intfNumber, alternateSetting);
    }
    this.opened = true;
  }

  async close(): Promise<void> {
    this.aborted = true;
    this.activeOperation = null;
    this.opened = false;
    if (this.device.opened) {
      try {
        await this.device.close();
      } catch {
        // The bootloader may have reset and disappeared after manifestation.
      }
    }
  }

  private ensureReady(): void {
    if (!this.opened || !this.device.opened) throw new DfuError('The DFU device is not open.');
  }

  private ensureNotAborted(signal?: AbortSignal): void {
    const aborted = asAbortError(signal);
    if (aborted || this.aborted) throw aborted ?? new DfuAbortError();
  }

  private async requestOut(request: number, data?: ArrayBuffer | ArrayBufferView, value = 0): Promise<number> {
    this.ensureReady();
    const result = await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request,
      value,
      index: this.settings.interface.interfaceNumber,
    }, data);
    if (result.status !== 'ok') throw new DfuError(`DFU request ${request} failed: ${result.status}`);
    return result.bytesWritten;
  }

  private async requestIn(request: number, length: number, value = 0): Promise<DataView> {
    this.ensureReady();
    const result = await this.device.controlTransferIn({
      requestType: 'class',
      recipient: 'interface',
      request,
      value,
      index: this.settings.interface.interfaceNumber,
    }, length);
    return ensureData(result, `DFU request ${request}`);
  }

  private async readFunctionalDescriptor(): Promise<DfuFunctionalDescriptor | undefined> {
    const index = descriptorIndex(this.device, this.settings.configuration);
    const headerResult = await this.device.controlTransferIn({
      requestType: 'standard',
      recipient: 'device',
      request: GET_DESCRIPTOR,
      value: CONFIGURATION_DESCRIPTOR << 8 | index,
      index: 0,
    }, 4);
    const header = ensureData(headerResult, 'Configuration descriptor header');
    const length = header.getUint16(2, true);
    const result = await this.device.controlTransferIn({
      requestType: 'standard',
      recipient: 'device',
      request: GET_DESCRIPTOR,
      value: CONFIGURATION_DESCRIPTOR << 8 | index,
      index: 0,
    }, length);
    const data = ensureData(result, 'Configuration descriptor');

    let currentInterface: { number: number; alternate: number } | undefined;
    let targetInterfaceStringIndex = 0;
    let functionalDescriptor: DfuFunctionalDescriptor | undefined;
    let fallbackFunctionalDescriptor: DfuFunctionalDescriptor | undefined;
    for (let offset = 9; offset + 2 <= data.byteLength;) {
      const descriptorLength = data.getUint8(offset);
      if (descriptorLength < 2 || offset + descriptorLength > data.byteLength) break;
      const descriptorType = data.getUint8(offset + 1);
      if (descriptorType === 0x04 && descriptorLength >= 9) {
        currentInterface = {
          number: data.getUint8(offset + 2),
          alternate: data.getUint8(offset + 3),
        };
        if (currentInterface.number === this.settings.interface.interfaceNumber &&
            currentInterface.alternate === this.settings.alternate.alternateSetting) {
          targetInterfaceStringIndex = data.getUint8(offset + 8);
        }
      } else if (descriptorType === DFU_FUNCTIONAL_DESCRIPTOR && descriptorLength >= 9) {
        const attributes = data.getUint8(offset + 2);
        const parsedDescriptor: DfuFunctionalDescriptor = {
          willDetach: (attributes & 0x08) !== 0,
          manifestationTolerant: (attributes & 0x04) !== 0,
          canUpload: (attributes & 0x02) !== 0,
          canDownload: (attributes & 0x01) !== 0,
          transferSize: data.getUint16(offset + 5, true) || 1024,
          detachTimeout: data.getUint16(offset + 3, true),
          dfuVersion: data.getUint16(offset + 7, true),
        };
        fallbackFunctionalDescriptor ??= parsedDescriptor;
        if (currentInterface?.number === this.settings.interface.interfaceNumber &&
            currentInterface.alternate === this.settings.alternate.alternateSetting) {
          functionalDescriptor = parsedDescriptor;
        }
      }
      offset += descriptorLength;
    }

    if (targetInterfaceStringIndex > 0 && !this.capabilities.memoryInfo) {
      const interfaceName = await this.readStringDescriptor(targetInterfaceStringIndex);
      if (interfaceName) {
        this.capabilities.interfaceName = interfaceName;
        this.capabilities.memoryInfo = parseMemoryDescriptor(interfaceName);
        this.capabilities.isDfuSe = this.capabilities.memoryInfo !== undefined;
      }
    }
    return functionalDescriptor ?? fallbackFunctionalDescriptor;
  }

  private async readStringDescriptor(index: number, languageId = 0x0409): Promise<string> {
    const setup: USBControlTransferParameters = {
      requestType: 'standard',
      recipient: 'device',
      request: GET_DESCRIPTOR,
      value: STRING_DESCRIPTOR << 8 | index,
      index: languageId,
    };
    const firstResult = await this.device.controlTransferIn(setup, 1);
    const first = ensureData(firstResult, `String descriptor ${index}`);
    const length = first.getUint8(0);
    if (length < 2) return '';
    const result = await this.device.controlTransferIn(setup, length);
    const data = ensureData(result, `String descriptor ${index}`);
    const chars: string[] = [];
    for (let offset = 2; offset + 1 < data.byteLength; offset += 2) {
      chars.push(String.fromCharCode(data.getUint16(offset, true)));
    }
    return chars.join('');
  }

  private async getStatus(): Promise<DfuStatus> {
    const data = await this.requestIn(DFU_REQUEST.GET_STATUS, 6);
    return {
      status: data.getUint8(0),
      pollTimeout: data.getUint8(1) | (data.getUint8(2) << 8) | (data.getUint8(3) << 16),
      state: data.getUint8(4),
    };
  }

  private async clearStatus(): Promise<void> {
    await this.requestOut(DFU_REQUEST.CLEAR_STATUS);
  }

  private async clearErrorState(): Promise<void> {
    const state = (await this.requestIn(DFU_REQUEST.GET_STATE, 1)).getUint8(0);
    if (state === DFU_STATE.ERROR) await this.clearStatus();
  }

  private async pollUntil(predicate: (state: number) => boolean, signal?: AbortSignal): Promise<DfuStatus> {
    let status = await this.getStatus();
    while (!predicate(status.state) && status.state !== DFU_STATE.ERROR) {
      this.ensureNotAborted(signal);
      await new Promise((resolve) => window.setTimeout(resolve, status.pollTimeout));
      status = await this.getStatus();
    }
    return status;
  }

  private begin(operation: DfuOperation): void {
    if (this.activeOperation) throw new DfuError(`A DFU ${this.activeOperation} operation is already running.`);
    this.ensureReady();
    this.aborted = false;
    this.activeOperation = operation;
  }

  private end(): void {
    this.activeOperation = null;
  }

  async abort(): Promise<void> {
    this.aborted = true;
    if (!this.opened || !this.device.opened) {
      this.activeOperation = null;
      return;
    }
    try {
      await this.requestOut(DFU_REQUEST.ABORT);
    } finally {
      this.activeOperation = null;
    }
  }

  private getMemoryInfo(): DfuMemoryInfo {
    if (!this.capabilities.memoryInfo) throw new DfuError('No DfuSe memory map is available.');
    return this.capabilities.memoryInfo;
  }

  private getSegment(address: number): DfuMemorySegment | undefined {
    return this.getMemoryInfo().segments.find((segment) => segment.start <= address && address < segment.end);
  }

  private getFirstSegment(property: 'readable' | 'writable'): DfuMemorySegment {
    const segment = this.getMemoryInfo().segments.find((item) => item[property]);
    if (!segment) throw new DfuError(`No ${property} DfuSe memory segment is available.`);
    return segment;
  }

  private getSectorStart(address: number, segment = this.getSegment(address)): number {
    if (!segment) throw new DfuError(`Address 0x${address.toString(16)} is outside the DfuSe memory map.`);
    const index = Math.floor((address - segment.start) / segment.sectorSize);
    return segment.start + index * segment.sectorSize;
  }

  private getSectorEnd(address: number, segment = this.getSegment(address)): number {
    if (!segment) throw new DfuError(`Address 0x${address.toString(16)} is outside the DfuSe memory map.`);
    const index = Math.floor((address - segment.start) / segment.sectorSize);
    return segment.start + (index + 1) * segment.sectorSize;
  }

  private getMaxReadableSize(startAddress: number): number {
    let size = 0;
    for (const segment of this.getMemoryInfo().segments) {
      if (segment.start <= startAddress && startAddress < segment.end) {
        if (!segment.readable) return 0;
        size += segment.end - startAddress;
      } else if (segment.start === startAddress + size) {
        if (!segment.readable) break;
        size += segment.end - segment.start;
      }
    }
    return size;
  }

  private async dfuseCommand(command: number, parameter: number, length = 4, signal?: AbortSignal): Promise<void> {
    const payload = new ArrayBuffer(length + 1);
    const view = new DataView(payload);
    view.setUint8(0, command);
    if (length === 1) view.setUint8(1, parameter);
    else if (length === 4) view.setUint32(1, parameter, true);
    else throw new DfuError(`Unsupported DfuSe command length ${length}.`);

    await this.requestOut(DFU_REQUEST.DOWNLOAD, payload, 0);
    const status = await this.pollUntil((state) => state !== DFU_STATE.DOWNLOAD_BUSY, signal);
    if (status.status !== DFU_STATUS_OK) throw new DfuError(`DfuSe command 0x${command.toString(16)} failed with status ${status.status}.`);
  }

  private async eraseDfuSeMemory(startAddress: number, length: number, options: DfuTransferOptions): Promise<void> {
    const firstSegment = this.getSegment(startAddress);
    if (!firstSegment) throw new DfuError(`Firmware start address 0x${startAddress.toString(16)} is outside the DfuSe memory map.`);
    let address = this.getSectorStart(startAddress, firstSegment);
    const endAddress = this.getSectorEnd(startAddress + length - 1);
    const total = endAddress - address;
    let erased = 0;
    await options.onProgress?.({ operation: 'download', phase: 'erase', transferred: 0, total, percentage: 0 });

    while (address < endAddress) {
      const segment = this.getSegment(address);
      if (!segment) throw new DfuError(`DfuSe memory map has a gap at 0x${address.toString(16)}.`);
      const sectorStart = this.getSectorStart(address, segment);
      const sectorEnd = this.getSectorEnd(sectorStart, segment);
      if (segment.erasable) await this.dfuseCommand(0x41, sectorStart, 4, options.signal);
      address = sectorEnd;
      erased = Math.min(address - this.getSectorStart(startAddress, firstSegment), total);
      await options.onProgress?.({ operation: 'download', phase: 'erase', transferred: erased, total, percentage: total > 0 ? erased / total * 100 : 100 });
    }
  }

  private async uploadStandard(options: DfuUploadOptions = {}): Promise<Blob> {
    const transferSize = this.capabilities.transferSize || 1024;
    const maxSize = options.maxSize ?? Infinity;
    const blocks: ArrayBuffer[] = [];
    let transaction = options.firstBlock ?? 0;
    let transferred = 0;
    let result: DataView;
    let requestedLength = transferSize;
    do {
      this.ensureNotAborted(options.signal);
      requestedLength = Math.min(transferSize, maxSize - transferred);
      result = await this.requestIn(DFU_REQUEST.UPLOAD, requestedLength, transaction++);
      if (result.byteLength > 0) {
        const buffer = new Uint8Array(result.byteLength);
        buffer.set(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
        blocks.push(buffer.buffer);
        transferred += result.byteLength;
      }
      await options.onProgress?.({
        operation: 'upload',
        phase: 'transfer',
        transferred,
        total: Number.isFinite(maxSize) ? maxSize : 0,
        percentage: Number.isFinite(maxSize) && maxSize > 0 ? Math.min(100, transferred / maxSize * 100) : null,
      });
    } while (transferred < maxSize && result.byteLength === requestedLength);

    if (Number.isFinite(maxSize) && transferred >= maxSize) await this.abortToIdle();
    return new Blob(blocks, { type: 'application/octet-stream' });
  }

  async upload(options: DfuUploadOptions = {}): Promise<Blob> {
    if (!this.capabilities.canUpload) throw new DfuError('This DFU interface does not support upload.');
    this.begin('upload');
    try {
      await this.clearErrorState();
      if (this.capabilities.isDfuSe) {
        const startAddress = this.getFirstSegment('readable').start;
        const maxSize = options.maxSize ?? this.getMaxReadableSize(startAddress);
        await this.dfuseCommand(0x21, startAddress, 4, options.signal);
        await this.abortToIdle();
        return await this.uploadStandard({ ...options, maxSize, firstBlock: 2 });
      }
      return await this.uploadStandard(options);
    } finally {
      this.end();
    }
  }

  private async downloadStandard(data: ArrayBuffer | Uint8Array, options: DfuTransferOptions): Promise<void> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength === 0) throw new DfuError('The firmware file is empty.');
    const transferSize = this.capabilities.transferSize || 1024;
    let transaction = 0;
    let transferred = 0;
    await options.onProgress?.({ operation: 'download', phase: 'transfer', transferred: 0, total: bytes.byteLength, percentage: 0 });

    while (transferred < bytes.byteLength) {
      this.ensureNotAborted(options.signal);
      const end = Math.min(transferred + transferSize, bytes.byteLength);
      const chunk = bytes.slice(transferred, end);
      const bytesWritten = await this.requestOut(DFU_REQUEST.DOWNLOAD, chunk, transaction++);
      const status = await this.pollUntil((state) => state === DFU_STATE.DOWNLOAD_IDLE, options.signal);
      if (status.status !== DFU_STATUS_OK) throw new DfuError(`DFU download failed with status ${status.status}.`);
      transferred = Math.min(transferred + bytesWritten, bytes.byteLength);
      await options.onProgress?.({ operation: 'download', phase: 'transfer', transferred, total: bytes.byteLength, percentage: transferred / bytes.byteLength * 100 });
    }

    await this.requestOut(DFU_REQUEST.DOWNLOAD, new ArrayBuffer(0), transaction++);
    await options.onProgress?.({ operation: 'download', phase: 'manifest', transferred, total: bytes.byteLength, percentage: 100 });
    if (this.capabilities.manifestationTolerant) {
      const status = await this.pollUntil((state) => state === DFU_STATE.IDLE || state === DFU_STATE.MANIFEST_WAIT_RESET, options.signal);
      if (status.status !== DFU_STATUS_OK) throw new DfuError(`DFU manifest failed with status ${status.status}.`);
    } else {
      try {
        const status = await this.getStatus();
        if (status.status !== DFU_STATUS_OK) throw new DfuError(`DFU manifest failed with status ${status.status}.`);
      } catch (error) {
        if (!isDisconnectError(error)) throw error;
      }
    }
    try {
      await this.device.reset();
    } catch (error) {
      if (!isDisconnectError(error)) throw error;
    }
  }

  private async downloadDfuSe(data: ArrayBuffer | Uint8Array, options: DfuTransferOptions): Promise<void> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength === 0) throw new DfuError('The firmware file is empty.');
    const startAddress = this.getFirstSegment('writable').start;
    await this.eraseDfuSeMemory(startAddress, bytes.byteLength, options);
    const transferSize = this.capabilities.transferSize || 1024;
    let transferred = 0;
    let address = startAddress;
    await options.onProgress?.({ operation: 'download', phase: 'transfer', transferred: 0, total: bytes.byteLength, percentage: 0 });
    while (transferred < bytes.byteLength) {
      this.ensureNotAborted(options.signal);
      const end = Math.min(transferred + transferSize, bytes.byteLength);
      const chunk = bytes.slice(transferred, end);
      await this.dfuseCommand(0x21, address, 4, options.signal);
      const bytesWritten = await this.requestOut(DFU_REQUEST.DOWNLOAD, chunk, 2);
      const status = await this.pollUntil((state) => state === DFU_STATE.DOWNLOAD_IDLE, options.signal);
      if (status.status !== DFU_STATUS_OK) throw new DfuError(`DfuSe download failed with status ${status.status}.`);
      transferred = Math.min(transferred + bytesWritten, bytes.byteLength);
      address += bytesWritten;
      await options.onProgress?.({ operation: 'download', phase: 'transfer', transferred, total: bytes.byteLength, percentage: transferred / bytes.byteLength * 100 });
    }
    await this.dfuseCommand(0x21, startAddress, 4, options.signal);
    await this.requestOut(DFU_REQUEST.DOWNLOAD, new ArrayBuffer(0), 0);
    await options.onProgress?.({ operation: 'download', phase: 'manifest', transferred, total: bytes.byteLength, percentage: 100 });
    try {
      await this.pollUntil((state) => state === DFU_STATE.MANIFEST || state === DFU_STATE.MANIFEST_WAIT_RESET || state === DFU_STATE.IDLE, options.signal);
    } catch (error) {
      // The ROM DfuSe bootloader may reset or stall the final GETSTATUS
      // request immediately after committing the image. webdfu treats this
      // post-manifest response as non-fatal as well.
    }
    try {
      await this.device.reset();
    } catch (error) {
      if (!isDisconnectError(error)) throw error;
    }
  }

  async download(data: ArrayBuffer | Uint8Array, options: DfuTransferOptions = {}): Promise<void> {
    if (!this.capabilities.canDownload) throw new DfuError('This DFU interface does not support download.');
    this.begin('download');
    try {
      await this.clearErrorState();
      if (this.capabilities.isDfuSe) await this.downloadDfuSe(data, options);
      else await this.downloadStandard(data, options);
    } finally {
      this.end();
    }
  }

  private async abortToIdle(): Promise<void> {
    await this.requestOut(DFU_REQUEST.ABORT);
    let state = (await this.requestIn(DFU_REQUEST.GET_STATE, 1)).getUint8(0);
    if (state === DFU_STATE.ERROR) {
      await this.clearStatus();
      state = (await this.requestIn(DFU_REQUEST.GET_STATE, 1)).getUint8(0);
    }
    if (state !== DFU_STATE.IDLE) throw new DfuError(`Failed to return DFU device to idle state: ${state}.`);
  }
}
