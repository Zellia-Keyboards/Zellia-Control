import {
  DFU_REQUEST,
  DFU_STATE,
  DfuAbortError,
  DfuError,
  KeyboardKeycode,
  Keycode,
  WebDfuDevice,
  ZelliaStarlightController,
  type DfuProgress,
} from 'emi-keyboard-controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVirtualKeyboard, type VirtualKeyboard, type VirtualKeyboardOptions } from './device';
import { DFU_STATUS, VirtualDfuDevice, VirtualUsb } from './dfu';
import { encodeHostPacket, KeyEvent } from './protocol';

const keyboards: VirtualKeyboard[] = [];
const originalUsb = Object.getOwnPropertyDescriptor(navigator, 'usb');

function installUsb(usb: VirtualUsb): void {
  Object.defineProperty(navigator, 'usb', { configurable: true, value: usb });
}

afterEach(() => {
  for (const keyboard of keyboards.splice(0)) keyboard.dispose();
  if (originalUsb) Object.defineProperty(navigator, 'usb', originalUsb);
  else Reflect.deleteProperty(navigator, 'usb');
  vi.useRealTimers();
});

function firmware(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 31 + 7) & 0xff);
}

function inBootloader(options: VirtualKeyboardOptions = {}): VirtualKeyboard {
  const keyboard = createVirtualKeyboard(options);
  keyboards.push(keyboard);
  installUsb(keyboard.usb);
  keyboard.enterBootloader();
  return keyboard;
}

function dfuOf(keyboard: VirtualKeyboard): VirtualDfuDevice {
  if (!keyboard.dfu) throw new Error('model without bootloader');
  return keyboard.dfu;
}

describe('bootloader enumeration', () => {
  it('appears after KeyboardBootloader and is found by the controller', async () => {
    const keyboard = createVirtualKeyboard();
    keyboards.push(keyboard);
    installUsb(keyboard.usb);
    const controller = new ZelliaStarlightController();
    await expect(controller.detect_bootloader(false)).resolves.toEqual([]);

    await keyboard.device.open();
    await keyboard.device.sendReport(
      0,
      encodeHostPacket({
        op: 'event',
        event: KeyEvent.KeyDown,
        keycode: Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardBootloader << 8),
        keyId: 0,
        isVirtual: true,
        useKeymap: false,
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(keyboard.connected).toBe(false);

    // Not granted yet: the silent lookup finds nothing, the picker grants it.
    await expect(controller.detect_bootloader(true)).resolves.toEqual([]);
    await expect(controller.detect_bootloader(false)).resolves.toEqual([keyboard.dfu]);
    await expect(controller.detect_bootloader(true)).resolves.toEqual([keyboard.dfu]);
  });

  it('can be pre-authorized and cancelled in the picker', async () => {
    const keyboard = inBootloader({ dfu: { authorized: true } });
    await expect(keyboard.usb.getDevices()).resolves.toEqual([keyboard.dfu]);
    keyboard.usb.picker = 'cancel';
    await expect(
      keyboard.usb.requestDevice({ filters: [{ vendorId: 0x2e3c, productId: 0xdf11 }] })
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});

describe('WebDfuDevice on the virtual bootloader', () => {
  it('reads DfuSe capabilities from the descriptors', async () => {
    const dfu = dfuOf(inBootloader());
    const session = await WebDfuDevice.connect(dfu);
    expect(session.capabilities).toMatchObject({
      canDownload: true,
      canUpload: true,
      manifestationTolerant: false,
      transferSize: 2048,
      isDfuSe: true,
      protocol: 'dfu',
    });
    expect(session.capabilities.memoryInfo?.segments[0]).toMatchObject({
      start: 0x08000000,
      sectorSize: 2048,
      erasable: true,
      writable: true,
    });
    await session.close();
    expect(dfu.opened).toBe(false);
  });

  it('downloads an image with erase, transfer and manifest progress, then boots it', async () => {
    const keyboard = inBootloader({ firmwareAfterUpdate: { patch: 9 } });
    const dfu = dfuOf(keyboard);
    const image = firmware(5000);
    const reconnected = vi.fn();
    keyboard.hid.addEventListener('connect', reconnected);
    const session = await WebDfuDevice.connect(dfu);
    const progress: DfuProgress[] = [];

    await session.download(image, { onProgress: value => void progress.push(value) });

    expect(dfu.image).toEqual(image);
    const phases = [...new Set(progress.map(item => item.phase))];
    expect(phases).toEqual(['erase', 'transfer', 'manifest']);
    expect(progress.filter(item => item.phase === 'erase').at(-1)).toMatchObject({
      transferred: 6144,
      total: 6144,
    });
    expect(
      progress.filter(item => item.phase === 'transfer').map(item => item.transferred)
    ).toEqual([0, 2048, 4096, 5000]);
    expect(dfu.connected).toBe(false);

    await vi.waitFor(() => {
      expect(reconnected).toHaveBeenCalledOnce();
    });
    expect(keyboard.connected).toBe(true);
    expect(keyboard.state.firmware.patch).toBe(9);
  });

  it('aborts through an AbortSignal and stays in the bootloader', async () => {
    const dfu = dfuOf(inBootloader());
    const session = await WebDfuDevice.connect(dfu);
    const abort = new AbortController();

    const download = session.download(firmware(8192), {
      signal: abort.signal,
      onProgress: value => {
        if (value.phase === 'transfer' && value.transferred >= 2048) abort.abort();
      },
    });

    await expect(download).rejects.toBeInstanceOf(DfuAbortError);
    expect(dfu.connected).toBe(true);
    expect(dfu.image).toHaveLength(2048);
    await session.close();
  });

  it('aborts through WebDfuDevice.abort and returns to dfuIDLE', async () => {
    const dfu = dfuOf(inBootloader());
    const session = await WebDfuDevice.connect(dfu);
    let aborted = false;

    const download = session.download(firmware(8192), {
      onProgress: async value => {
        if (!aborted && value.phase === 'transfer' && value.transferred > 0) {
          aborted = true;
          await session.abort();
        }
      },
    });

    await expect(download).rejects.toBeInstanceOf(DfuAbortError);
    expect(dfu.state).toBe(DFU_STATE.IDLE);
    expect(dfu.requests.some(request => request.request === DFU_REQUEST.ABORT)).toBe(true);
  });

  it('uploads what was programmed', async () => {
    const dfu = dfuOf(inBootloader());
    const session = await WebDfuDevice.connect(dfu);
    const image = firmware(3000);
    dfu.onReset = null;
    await session.download(image);

    const reopened = await WebDfuDevice.connect(dfu);
    const blob = await reopened.upload({ maxSize: image.length });
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(image);
  });

  it('supports plain DFU 1.1 devices with busy polling', async () => {
    const usb = new VirtualUsb();
    installUsb(usb);
    const dfu = new VirtualDfuDevice(
      { vendorId: 0x1234, productId: 0x5678, productName: 'Plain DFU' },
      { memoryMap: null, transferSize: 1024, busyPolls: 2, manifestationTolerant: true }
    );
    usb.plugIn(dfu);
    const session = await WebDfuDevice.connect(dfu);
    expect(session.capabilities).toMatchObject({ isDfuSe: false, transferSize: 1024 });
    expect(session.capabilities.interfaceName).toBe('DFU Firmware');

    const image = firmware(2500);
    await session.download(image);
    expect(dfu.image).toEqual(image);
    expect(
      dfu.requests.filter(request => request.request === DFU_REQUEST.GET_STATUS).length
    ).toBeGreaterThan(6);
  });

  it('refuses to program sectors that were not erased', async () => {
    const dfu = dfuOf(inBootloader());
    await dfu.open();
    await dfu.selectConfiguration(1);
    await dfu.claimInterface(0);
    const setup = { requestType: 'class', recipient: 'interface', index: 0 } as const;

    const written = await dfu.controlTransferOut(
      { ...setup, request: DFU_REQUEST.DOWNLOAD, value: 2 },
      new Uint8Array([1, 2, 3])
    );
    expect(written.status).toBe('stall');
    const status = await dfu.controlTransferIn(
      { ...setup, request: DFU_REQUEST.GET_STATUS, value: 0 },
      6
    );
    expect([status.data?.getUint8(0), status.data?.getUint8(4)]).toEqual([
      DFU_STATUS.ERR_PROG,
      DFU_STATE.ERROR,
    ]);

    const session = await WebDfuDevice.connect(dfu);
    await expect(session.download(new Uint8Array(0))).rejects.toBeInstanceOf(DfuError);
  });
});
