import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DFU_REQUEST,
  DFU_STATE,
  WebDfuDevice,
  detectUSBDevice,
  findDfuInterfaces,
  parseMemoryDescriptor,
} from '../src/dfu/web-dfu';
import type {
  USBAlternateInterface,
  USBConfiguration,
  USBControlTransferParameters,
  USBDevice,
  USBInterface,
} from '../src/dfu/webusb-types';
import { OholeoKeyboardV2Controller } from '../src/controllers/oholeo_keyboard_v2_controller/controller';
import { OholeoKeyboardController } from '../src/controllers/oholeo_keyboard_controller/controller';
import { Zellia60Controller } from '../src/controllers/zellia_60_controller/controller';
import { ZelliaStarlightController } from '../src/controllers/zellia_starlight_controller/controller';

function makeDfuDevice(overrides: Record<string, unknown> = {}): USBDevice {
  const configurationBytes = new Uint8Array(27);
  configurationBytes.set([9, 2, 27, 0, 1, 1, 0, 0x80, 50], 0);
  configurationBytes.set([9, 4, 0, 0, 0, 0xfe, 0x01, 0x02, 0], 9);
  configurationBytes.set([9, 0x21, 0x03, 0, 0, 4, 0, 0x10, 0x01], 18);

  const alternate: USBAlternateInterface = {
    alternateSetting: 0,
    interfaceClass: 0xfe,
    interfaceSubclass: 0x01,
    interfaceProtocol: 0x02,
    interfaceName: 'DFU Firmware',
  };
  const intf: USBInterface = {
    interfaceNumber: 0,
    alternate,
    alternates: [alternate],
    claimed: false,
  };
  const configuration: USBConfiguration = {
    configurationValue: 1,
    configurationName: 'DFU',
    interfaces: [intf],
  };

  let uploadBlock = 0;
  const device = {
    vendorId: 0x0d00,
    productId: 0x0720,
    manufacturerName: 'Test',
    productName: 'Test Bootloader',
    serialNumber: 'test-serial',
    configurations: [configuration],
    configuration: null,
    opened: false,
    async open() { this.opened = true; },
    async close() { this.opened = false; },
    async selectConfiguration() { this.configuration = configuration; },
    async claimInterface() { intf.claimed = true; },
    async selectAlternateInterface() {},
    async controlTransferIn(setup: USBControlTransferParameters, length: number) {
      if (setup.requestType === 'standard') {
        if (length === 4) return { status: 'ok' as const, data: new DataView(configurationBytes.buffer, 0, 4) };
        return { status: 'ok' as const, data: new DataView(configurationBytes.buffer) };
      }
      if (setup.request === DFU_REQUEST.UPLOAD) {
        if (uploadBlock++ === 0) return { status: 'ok' as const, data: new DataView(new Uint8Array([1, 2, 3, 4]).buffer) };
        return { status: 'ok' as const, data: new DataView(new ArrayBuffer(0)) };
      }
      if (setup.request === DFU_REQUEST.GET_STATE) {
        return { status: 'ok' as const, data: new DataView(new Uint8Array([DFU_STATE.IDLE]).buffer) };
      }
      return { status: 'ok' as const, data: new DataView(new Uint8Array([0, 0, 0, 0, DFU_STATE.DOWNLOAD_IDLE, 0]).buffer) };
    },
    async controlTransferOut() { return { status: 'ok' as const, bytesWritten: lengthOrZero(arguments[1]) }; },
    async reset() {},
    ...overrides,
  } as unknown as USBDevice;

  return device;
}

function lengthOrZero(data: ArrayBuffer | ArrayBufferView | undefined): number {
  if (!data) return 0;
  return data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
}

function installUsb(devices: USBDevice[]) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      usb: {
        getDevices: vi.fn(async () => devices),
        requestDevice: vi.fn(async () => devices[0]),
      },
    },
  });
}

describe('WebUSB DFU', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('finds only authorized devices exposing a standard DFU interface', async () => {
    const dfuDevice = makeDfuDevice();
    const otherDevice = makeDfuDevice({
      productId: 0x9999,
      configurations: [],
    });
    installUsb([dfuDevice, otherDevice]);

    expect(findDfuInterfaces(dfuDevice)).toHaveLength(1);
    await expect(detectUSBDevice({ vendorId: 0x0d00, productId: 0x0720 }, true)).resolves.toEqual([dfuDevice]);
  });

  it('parses STM32 and AT32 DfuSe memory descriptors', () => {
    const memory = parseMemoryDescriptor('@Internal Flash /0x08000000/04*016Kg,01*064Kg,01*128Kg');

    expect(memory?.name).toBe('Internal Flash');
    expect(memory?.segments).toEqual([
      { start: 0x08000000, end: 0x08010000, sectorSize: 0x4000, readable: true, erasable: true, writable: true },
      { start: 0x08010000, end: 0x08020000, sectorSize: 0x10000, readable: true, erasable: true, writable: true },
      { start: 0x08020000, end: 0x08040000, sectorSize: 0x20000, readable: true, erasable: true, writable: true },
    ]);
  });

  it('uses the built-in DFU filters for STM32 and AT32 controllers', async () => {
    const stm32Device = makeDfuDevice({ vendorId: 0x0483, productId: 0xDF11 });
    installUsb([stm32Device]);
    const oholeo = new OholeoKeyboardController();
    expect(oholeo.get_feature().bootloader.download).toBe(true);
    expect(oholeo.get_feature().bootloader.upload).toBe(true);
    await expect(oholeo.detect_bootloader(true)).resolves.toEqual([stm32Device]);

    const at32Device = makeDfuDevice({ vendorId: 0x2E3C, productId: 0xDF11 });
    installUsb([at32Device]);
    const zellia60 = new Zellia60Controller();
    const starlight = new ZelliaStarlightController();
    expect(zellia60.get_feature().bootloader.enable).toBe(true);
    expect(starlight.get_feature().bootloader.enable).toBe(true);
    await expect(zellia60.detect_bootloader(true)).resolves.toEqual([at32Device]);
    await expect(starlight.detect_bootloader(true)).resolves.toEqual([at32Device]);
  });

  it('uses the Oholeo V2 Bootloader filter through IKeyboardController', async () => {
    const device = makeDfuDevice();
    installUsb([device]);
    const controller = new OholeoKeyboardV2Controller();

    expect(controller.get_feature().bootloader.enable).toBe(true);
    await expect(controller.detect_bootloader(true)).resolves.toEqual([device]);
  });

  it('connects, reads DFU capabilities, and downloads firmware in blocks', async () => {
    const device = makeDfuDevice();
    const progress: number[] = [];
    const session = await WebDfuDevice.connect(device);

    expect(session.capabilities.canDownload).toBe(true);
    expect(session.capabilities.canUpload).toBe(true);
    expect(session.capabilities.transferSize).toBe(4);

    await session.download(new Uint8Array([1, 2, 3, 4, 5]), {
      onProgress: (value) => progress.push(value.transferred),
    });

    expect(progress).toEqual([0, 4, 5, 5]);
    await session.close();
  });

  it('uploads until the device returns a zero-length block', async () => {
    const session = await WebDfuDevice.connect(makeDfuDevice());
    const blob = await session.upload();

    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    await session.close();
  });
});
