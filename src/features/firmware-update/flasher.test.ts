import { KeyboardKeycode, WebDfuDevice } from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceSession, deviceStore } from '../device';
import { kc } from '../keycodes';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import {
  installVirtualHid,
  VirtualDfuDevice,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../../testing/virtual-keyboard';
import { createFirmwareFlasher, type FirmwareFlasher } from './flasher';
import type { FlasherState } from './model/flash-steps';
import { firmwareUpdateSession, setFirmwareUpdateActive } from './session';

const BOOTLOADER = kc.keyboardOperation(KeyboardKeycode.KeyboardBootloader);

let keyboard: { readonly vk: InstalledVirtualKeyboard; readonly dispose: () => void } | null = null;
let flasher: FirmwareFlasher;
let phases: string[];

function firmware(size: number, name = 'zellia.bin'): File {
  return new File([Uint8Array.from({ length: size }, (_, index) => (index * 7 + 3) & 0xff)], name);
}

async function bytesOf(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function vk(): InstalledVirtualKeyboard {
  if (!keyboard) throw new Error('no keyboard');
  return keyboard.vk;
}

function dfu(): VirtualDfuDevice {
  const device = vk().dfu;
  if (!device) throw new Error('model without bootloader');
  return device;
}

function createFlasher(): void {
  flasher = createFirmwareFlasher({ pollIntervalMs: 10 });
  phases = [flasher.getState().phase];
  flasher.subscribe(() => {
    const { phase } = flasher.getState();
    if (phases[phases.length - 1] !== phase) phases.push(phase);
  });
}

/** A connected keyboard. */
async function setup(options: VirtualKeyboardOptions = {}): Promise<void> {
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, ...options });
  createFlasher();
}

/** No keyboard connected to the app; its bootloader waits on the USB bus (§1.7). */
function setupInBootloader(options: VirtualKeyboardOptions = {}): void {
  const installed = installVirtualHid(navigator, { seedDynamicKeys: false, ...options });
  keyboard = {
    vk: installed,
    dispose: () => {
      installed.uninstall();
    },
  };
  installed.enterBootloader();
  createFlasher();
}

/** Waits for update phases: a flash takes a while on a busy machine. */
const FLOW = { timeout: 10_000 };

async function phase(expected: FlasherState['phase']): Promise<FlasherState> {
  return vi.waitFor(() => {
    const state = flasher.getState();
    expect(state.phase).toBe(expected);
    return state;
  }, FLOW);
}

async function keyboardGone(): Promise<void> {
  await vi.waitFor(() => {
    expect(deviceStore.getState().connection.status).toBe('disconnected');
  }, FLOW);
}

function sentOperations(): number[] {
  return vk().sentPackets.flatMap(packet => (packet.op === 'event' ? [packet.keycode] : []));
}

function sessionActive(): boolean {
  return firmwareUpdateSession.getState().active;
}

/** Keeps the keyboard connected: it ignores the bootloader request. */
function ignoreBootloaderRequests(): () => void {
  return vk().dropReplies(packet => packet.op === 'event' && packet.keycode === BOOTLOADER);
}

/** Another board of the same kind, already in its bootloader and authorized. */
function otherAuthorizedBootloader(): VirtualDfuDevice {
  const other = new VirtualDfuDevice({
    vendorId: 0x2e3c,
    productId: 0xdf11,
    productName: 'Other board',
  });
  vk().usb.attach(other, { authorized: true });
  vk().usb.plugIn(other);
  return other;
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  flasher.dispose();
  keyboard?.dispose();
  keyboard = null;
  setFirmwareUpdateActive(false);
});

describe('firmware flasher', { timeout: 30_000 }, () => {
  it('starts on step 1 without a session', async () => {
    await setup();
    expect(flasher.getState()).toEqual({ phase: 'choose' });
    expect(sessionActive()).toBe(false);
  });

  it('rejects other files on step 2, as Svelte did, without touching the keyboard', async () => {
    await setup();
    vk().clearHistory();

    await flasher.chooseFile(firmware(4096, 'zellia.hex'));

    expect(flasher.getState()).toEqual({
      phase: 'error',
      step: 'reboot_recovery',
      stepStatus: 'active',
      message: 'Please select a .bin firmware file',
    });
    expect(sentOperations()).toEqual([]);
    expect(sessionActive()).toBe(false);
  });

  it.each([
    [100, 'Firmware file too small (min 1KB)'],
    [1024 * 1024 + 1, 'Firmware file too large (max 1MB)'],
  ])('rejects a %i byte image', async (size, message) => {
    await setup();
    await flasher.chooseFile(firmware(size));
    expect(flasher.getState()).toMatchObject({ phase: 'error', step: 'reboot_recovery', message });
    expect(vk().connected).toBe(true);
  });

  it('updates a keyboard whose bootloader is already authorized, start to finish', async () => {
    await setup({ dfu: { authorized: true }, firmwareAfterUpdate: { patch: 9 } });
    const progress: number[] = [];
    const sessionDuringFlash: boolean[] = [];
    flasher.subscribe(() => {
      const state = flasher.getState();
      if (state.phase === 'flash') {
        progress.push(state.progress);
        sessionDuringFlash.push(sessionActive());
      }
    });
    const file = firmware(5000);

    await flasher.chooseFile(file);
    expect(sessionActive()).toBe(true);
    await phase('done');

    expect(sentOperations()).toContain(BOOTLOADER);
    expect(phases).toEqual(['choose', 'reboot', 'connect', 'erase', 'flash', 'done']);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(sessionDuringFlash.every(Boolean)).toBe(true);
    expect(dfu().image).toEqual(await bytesOf(file));
    await vi.waitFor(() => {
      expect(vk().connected).toBe(true);
    }, FLOW);
    expect(vk().state.firmware.patch).toBe(9);
    // The update is over; the finish panel stays until the user moves on.
    expect(sessionActive()).toBe(false);
    expect(flasher.getState()).toEqual({ phase: 'done' });
  });

  it('waits for "Connect USB Device" when the bootloader needs permission', async () => {
    await setup();
    const file = firmware(3000);

    await flasher.chooseFile(file);
    await phase('connect');
    await delay(40);
    expect(flasher.getState().phase).toBe('connect');
    expect(dfu().connected).toBe(true);

    await flasher.connectDevice();
    await phase('done');
    expect(dfu().image).toEqual(await bytesOf(file));
  });

  it('opens the chooser from "Device is in DFU Mode" when the keyboard entered DFU by hand', async () => {
    await setup();
    const restore = ignoreBootloaderRequests();
    await flasher.chooseFile(firmware(2048));
    await delay(30);
    expect(flasher.getState().phase).toBe('reboot');
    restore();

    // The user enters DFU mode with the BOOT button.
    vk().usb.plugIn(dfu());
    await flasher.confirmDfuMode();

    await phase('done');
    expect(dfu().image).toHaveLength(2048);
  });

  it('does not flash a bootloader on its own before the keyboard has left', async () => {
    await setup({ dfu: { authorized: true } });
    ignoreBootloaderRequests();
    await flasher.chooseFile(firmware(2048));

    vk().usb.plugIn(dfu());
    await delay(60);
    expect(flasher.getState().phase).toBe('reboot');
    expect(dfu().image).toHaveLength(0);

    await flasher.confirmDfuMode();
    await phase('done');
  });

  it('flashes the bootloader that appears once the keyboard has left', async () => {
    await setup({ dfu: { authorized: true } });
    flasher.subscribe(() => {
      // The bootloader enumerates a little after the keyboard left.
      if (flasher.getState().phase === 'connect' && dfu().connected) {
        vk().usb.unplug(dfu());
        setTimeout(() => {
          vk().usb.plugIn(dfu());
        }, 40);
      }
    });

    await flasher.chooseFile(firmware(2048));

    await phase('done');
    expect(dfu().image).toHaveLength(2048);
  });

  it('never flashes a bootloader that was attached before the request on its own', async () => {
    await setup();
    const other = otherAuthorizedBootloader();
    const file = firmware(2048);

    await flasher.chooseFile(file);
    await phase('connect');
    await delay(60);
    expect(flasher.getState().phase).toBe('connect');
    expect(other.image).toHaveLength(0);

    // From the click, the browser's chooser picks the keyboard's own bootloader.
    await flasher.connectDevice();
    await phase('done');
    expect(dfu().image).toEqual(await bytesOf(file));
    expect(other.image).toHaveLength(0);
  });

  it('never flashes on its own when the bootloaders could not be listed before the request', async () => {
    await setup({ dfu: { authorized: true } });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(deviceSession, 'detectBootloader').mockRejectedValueOnce(new Error('USB busy'));
    const requestDevice = vi.spyOn(vk().usb, 'requestDevice');

    await flasher.chooseFile(firmware(2048));
    await phase('connect');
    await delay(60);
    expect(dfu().image).toHaveLength(0);

    await flasher.connectDevice();
    await phase('done');
    expect(requestDevice).toHaveBeenCalledOnce();
  });

  it('starts a single flash when the button is clicked twice during a lookup', async () => {
    await setup();
    const getDevices = vk().usb.getDevices.bind(vk().usb);
    let onLookup: (() => void) | null = null;
    vi.spyOn(vk().usb, 'getDevices').mockImplementation(async () => {
      onLookup?.();
      await delay(20);
      return getDevices();
    });
    const connect = vi.spyOn(WebDfuDevice, 'connect');

    await flasher.chooseFile(firmware(2048));
    await phase('connect');
    // Both clicks wait for the silent lookup that is looking for the new bootloader.
    await new Promise<void>(resolve => {
      onLookup = resolve;
    });
    onLookup = null;
    await Promise.all([flasher.connectDevice(), flasher.connectDevice()]);

    await phase('done');
    expect(connect).toHaveBeenCalledOnce();
  });

  it('waits for the click when more than one bootloader appeared after the request', async () => {
    await setup({ dfu: { authorized: true } });
    const requestDevice = vi.spyOn(vk().usb, 'requestDevice');
    const others: VirtualDfuDevice[] = [];
    flasher.subscribe(() => {
      // Another authorized board enters its bootloader together with the keyboard.
      if (flasher.getState().phase === 'connect' && others.length === 0) {
        others.push(otherAuthorizedBootloader());
      }
    });
    const file = firmware(2048);

    await flasher.chooseFile(file);
    await phase('connect');
    await delay(60);
    expect(flasher.getState().phase).toBe('connect');
    expect(dfu().image).toHaveLength(0);

    await flasher.connectDevice();
    await phase('done');
    expect(requestDevice).toHaveBeenCalledOnce();
    expect(dfu().image).toEqual(await bytesOf(file));
    expect(others.map(other => other.image.length)).toEqual([0]);
  });

  it('ignores "Device is in DFU Mode" while the file is rejected', async () => {
    await setup();
    await flasher.chooseFile(firmware(10));
    await flasher.confirmDfuMode();
    expect(flasher.getState()).toMatchObject({ phase: 'error', step: 'reboot_recovery' });
  });

  it('fails step 3 when no device is picked, which ends the update', async () => {
    await setup();
    vk().usb.picker = 'cancel';
    await flasher.chooseFile(firmware(2048));
    await phase('connect');

    await flasher.connectDevice();

    expect(flasher.getState()).toEqual({
      phase: 'error',
      step: 'connect_recovery',
      stepStatus: 'error',
      message: 'No device in DFU mode found. Please enter recovery mode first.',
    });
    expect(sessionActive()).toBe(false);

    // Try Again: the keyboard still waits in its bootloader, so step 2 is skipped.
    flasher.reset();
    expect(flasher.getState()).toEqual({ phase: 'choose' });
    vk().usb.picker = 'first';
    await flasher.chooseFile(firmware(2048));
    expect(flasher.getState().phase).toBe('connect');
    await flasher.connectDevice();
    await phase('done');
  });

  it('stops watching for the bootloader when reset', async () => {
    await setup({ dfu: { authorized: true } });
    ignoreBootloaderRequests();
    await flasher.chooseFile(firmware(2048));
    expect(sessionActive()).toBe(true);

    flasher.reset();
    vk().enterBootloader();
    await delay(60);

    expect(flasher.getState()).toEqual({ phase: 'choose' });
    expect(sessionActive()).toBe(false);
    expect(dfu().image).toHaveLength(0);
  });

  it('reports USB errors while opening the device', async () => {
    await setup({ dfu: { authorized: true } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(dfu(), 'open').mockRejectedValue(new DOMException('Access denied.', 'SecurityError'));

    await flasher.chooseFile(firmware(2048));

    await expect(phase('error')).resolves.toEqual({
      phase: 'error',
      step: 'connect_recovery',
      stepStatus: 'error',
      message: 'USB Error: Access denied.',
    });
  });

  it('fails the Update Program step when erasing fails', async () => {
    await setup({ dfu: { authorized: true } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(dfu(), 'controlTransferOut').mockResolvedValue({ status: 'stall', bytesWritten: 0 });

    await flasher.chooseFile(firmware(2048));

    await expect(phase('error')).resolves.toEqual({
      phase: 'error',
      step: 'update_program',
      stepStatus: 'error',
      message: 'Failed to flash firmware',
    });
    expect(sessionActive()).toBe(false);
  });

  it('fails the Flash Firmware step when the bootloader goes away mid-transfer', async () => {
    await setup({ dfu: { authorized: true, busyPolls: 2, pollTimeoutMs: 5 } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    flasher.subscribe(() => {
      const state = flasher.getState();
      if (state.phase === 'flash' && state.progress > 0) vk().usb.unplug(dfu());
    });

    await flasher.chooseFile(firmware(16 * 1024));

    await expect(phase('error')).resolves.toMatchObject({
      step: 'flash_firmware',
      stepStatus: 'error',
      message: 'Failed to flash firmware',
    });
    expect(sessionActive()).toBe(false);
  });

  describe('without a keyboard (§1.7)', () => {
    it('skips step 2 and flashes an authorized bootloader only through the chooser', async () => {
      setupInBootloader({ dfu: { authorized: true } });
      const requestDevice = vi.spyOn(vk().usb, 'requestDevice');
      const file = firmware(4096);

      await flasher.chooseFile(file);
      expect(phases).toEqual(['choose', 'reboot', 'connect']);
      expect(sessionActive()).toBe(true);
      expect(sentOperations()).toEqual([]);
      // The app did not ask for this bootloader, which may belong to another board: it is
      // flashed only once the user picked it.
      await delay(60);
      expect(dfu().image).toHaveLength(0);

      await flasher.connectDevice();
      await phase('done');
      expect(requestDevice).toHaveBeenCalledOnce();
      expect(dfu().image).toEqual(await bytesOf(file));
    });

    it('opens the chooser when the bootloader is not authorized yet', async () => {
      setupInBootloader();
      const requestDevice = vi.spyOn(vk().usb, 'requestDevice');

      await flasher.chooseFile(firmware(4096));
      await flasher.connectDevice();

      await phase('done');
      expect(requestDevice).toHaveBeenCalledOnce();
    });

    it('fails step 3 when the chooser is dismissed', async () => {
      setupInBootloader({ dfu: { authorized: true } });
      vk().usb.picker = 'cancel';

      await flasher.chooseFile(firmware(4096));
      await flasher.connectDevice();

      expect(flasher.getState()).toMatchObject({
        phase: 'error',
        step: 'connect_recovery',
        message: 'No device in DFU mode found. Please enter recovery mode first.',
      });
      expect(dfu().image).toHaveLength(0);
    });
  });

  describe('Settings → Enter Bootloader (§1.8)', () => {
    it('starts the update at once, then flashes the image chosen next', async () => {
      await setup({ dfu: { authorized: true } });
      vk().clearHistory();

      const request = flasher.enterBootloader();
      expect(sessionActive()).toBe(true);
      await request;
      expect(sentOperations()).toEqual([BOOTLOADER]);
      await keyboardGone();
      expect(flasher.getState()).toEqual({ phase: 'choose' });

      const file = firmware(3000);
      await flasher.chooseFile(file);

      await phase('done');
      expect(phases).toEqual(['choose', 'reboot', 'connect', 'erase', 'flash', 'done']);
      expect(dfu().image).toEqual(await bytesOf(file));
      expect(sessionActive()).toBe(false);
    });

    it('flashes only the bootloader that appeared after the request', async () => {
      await setup({ dfu: { authorized: true } });
      const other = otherAuthorizedBootloader();

      await flasher.enterBootloader();
      await keyboardGone();
      await flasher.chooseFile(firmware(2048));

      await phase('done');
      expect(dfu().image).toHaveLength(2048);
      expect(other.image).toHaveLength(0);
    });

    it('asks only once when the image is chosen before the keyboard has left', async () => {
      await setup({ dfu: { authorized: true } });
      vk().clearHistory();

      void flasher.enterBootloader();
      await flasher.chooseFile(firmware(2048));

      await phase('done');
      expect(sentOperations()).toEqual([BOOTLOADER]);
    });

    it('ends the update when the keyboard is connected again before an image is chosen', async () => {
      await setup();
      await flasher.enterBootloader();
      await keyboardGone();
      expect(sessionActive()).toBe(true);

      // The keyboard is power-cycled without an update and connected again.
      vk().usb.unplug(dfu());
      vk().reconnect();
      await deviceSession.connect();
      expect(deviceStore.getState().connection.status).toBe('ready');

      expect(sessionActive()).toBe(false);
      expect(flasher.getState()).toEqual({ phase: 'choose' });
    });

    it('starts over from a finished or failed update', async () => {
      await setup();
      vk().usb.picker = 'cancel';
      const restore = ignoreBootloaderRequests();
      await flasher.chooseFile(firmware(2048));
      await flasher.confirmDfuMode();
      expect(flasher.getState().phase).toBe('error');
      restore();

      await flasher.enterBootloader();

      expect(flasher.getState()).toEqual({ phase: 'choose' });
      expect(sessionActive()).toBe(true);
    });
  });

  it('ends the update and stops following the keyboard when disposed', async () => {
    await setup({ dfu: { authorized: true } });
    ignoreBootloaderRequests();
    await flasher.chooseFile(firmware(2048));

    flasher.dispose();
    vk().enterBootloader();
    await delay(60);

    expect(sessionActive()).toBe(false);
    expect(dfu().image).toHaveLength(0);
    await flasher.chooseFile(firmware(2048));
    expect(flasher.getState()).toEqual({ phase: 'choose' });
  });
});
