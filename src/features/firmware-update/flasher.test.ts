import { KeyboardKeycode } from 'emi-keyboard-controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceStore } from '../device';
import { kc } from '../keycodes';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import type { VirtualKeyboardOptions } from '../../testing/virtual-keyboard';
import { createFirmwareFlasher, type FirmwareFlasher } from './flasher';
import type { FlasherState } from './model/flash-steps';
import { firmwareUpdateSession } from './session';

const BOOTLOADER = kc.keyboardOperation(KeyboardKeycode.KeyboardBootloader);

let keyboard: ConnectedKeyboard | null = null;
let flasher: FirmwareFlasher;
let detach: () => void;
let phases: string[];

function firmware(size: number, name = 'zellia.bin'): File {
  return new File([Uint8Array.from({ length: size }, (_, index) => (index * 7 + 3) & 0xff)], name);
}

async function bytesOf(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function vk() {
  if (!keyboard) throw new Error('no keyboard');
  return keyboard.vk;
}

function dfu() {
  const device = vk().dfu;
  if (!device) throw new Error('model without bootloader');
  return device;
}

async function setup(options: VirtualKeyboardOptions = {}): Promise<void> {
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, ...options });
  flasher = createFirmwareFlasher({ pollIntervalMs: 10 });
  phases = [flasher.getState().phase];
  flasher.subscribe(() => {
    const { phase } = flasher.getState();
    if (phases[phases.length - 1] !== phase) phases.push(phase);
  });
  detach = flasher.attach();
}

async function phase(expected: FlasherState['phase']): Promise<FlasherState> {
  return vi.waitFor(() => {
    const state = flasher.getState();
    expect(state.phase).toBe(expected);
    return state;
  });
}

function sentOperations(): number[] {
  return vk().sentPackets.flatMap(packet => (packet.op === 'event' ? [packet.keycode] : []));
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  detach();
  keyboard?.dispose();
  keyboard = null;
});

describe('firmware flasher', () => {
  it('starts on step 1 without a session', async () => {
    await setup();
    expect(flasher.getState()).toEqual({ phase: 'choose' });
    expect(firmwareUpdateSession.getState().active).toBe(false);
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
    expect(firmwareUpdateSession.getState().active).toBe(false);
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
    flasher.subscribe(() => {
      const state = flasher.getState();
      if (state.phase === 'flash') progress.push(state.progress);
    });
    const file = firmware(5000);

    await flasher.chooseFile(file);
    expect(firmwareUpdateSession.getState().active).toBe(true);
    await phase('done');

    expect(sentOperations()).toContain(BOOTLOADER);
    expect(phases).toEqual(['choose', 'reboot', 'connect', 'erase', 'flash', 'done']);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(dfu().image).toEqual(await bytesOf(file));
    await vi.waitFor(() => {
      expect(vk().connected).toBe(true);
    });
    expect(vk().state.firmware.patch).toBe(9);
    // The finish panel stays up (the app itself is disconnected) until the user moves on.
    expect(firmwareUpdateSession.getState().active).toBe(true);
    expect(deviceStore.getState().connection.status).toBe('disconnected');
  });

  it('waits for "Connect USB Device" when the bootloader needs permission', async () => {
    await setup();
    const file = firmware(3000);

    await flasher.chooseFile(file);
    await phase('connect');
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(flasher.getState().phase).toBe('connect');
    expect(dfu().connected).toBe(true);

    await flasher.connectDevice();
    await phase('done');
    expect(dfu().image).toEqual(await bytesOf(file));
  });

  it('opens the picker from "Device is in DFU Mode" when the keyboard entered DFU by hand', async () => {
    await setup();
    const restore = vk().dropReplies(
      packet => packet.op === 'event' && packet.keycode === BOOTLOADER
    );
    await flasher.chooseFile(firmware(2048));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(flasher.getState().phase).toBe('reboot');
    restore();

    // The user enters DFU mode with the BOOT button.
    vk().usb.plugIn(dfu());
    await flasher.confirmDfuMode();

    await phase('done');
    expect(dfu().image).toHaveLength(2048);
  });

  it('finds an authorized bootloader that appears later', async () => {
    await setup({ dfu: { authorized: true } });
    vk().dropReplies(packet => packet.op === 'event' && packet.keycode === BOOTLOADER);
    await flasher.chooseFile(firmware(2048));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(flasher.getState().phase).toBe('reboot');

    vk().usb.plugIn(dfu());

    await phase('done');
  });

  it('ignores "Device is in DFU Mode" while the file is still being read or rejected', async () => {
    await setup();
    await flasher.chooseFile(firmware(10));
    await flasher.confirmDfuMode();
    expect(flasher.getState()).toMatchObject({ phase: 'error', step: 'reboot_recovery' });
  });

  it('fails step 3 when no device is picked, and Try Again keeps the session for it', async () => {
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
    flasher.reset();
    expect(flasher.getState()).toEqual({ phase: 'choose' });
    // The keyboard waits in its bootloader: the page must stay to flash it.
    expect(firmwareUpdateSession.getState().active).toBe(true);

    vk().usb.picker = 'first';
    await flasher.chooseFile(firmware(2048));
    await flasher.confirmDfuMode();
    await phase('done');
  });

  it('ends the session on Try Again while the keyboard is still connected', async () => {
    await setup();
    vk().dropReplies(packet => packet.op === 'event' && packet.keycode === BOOTLOADER);
    await flasher.chooseFile(firmware(2048));
    expect(firmwareUpdateSession.getState().active).toBe(true);

    await flasher.confirmDfuMode();
    expect(flasher.getState()).toMatchObject({ phase: 'error', step: 'connect_recovery' });

    flasher.reset();
    expect(firmwareUpdateSession.getState().active).toBe(false);
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
  });

  it('fails the Flash Firmware step when the device goes away mid-transfer', async () => {
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
    expect(firmwareUpdateSession.getState().active).toBe(true);
  });

  it('aborts a running update when detached and ends the session', async () => {
    await setup({ dfu: { authorized: true, busyPolls: 2, pollTimeoutMs: 5 } });
    const size = 32 * 1024;
    await flasher.chooseFile(firmware(size));
    await vi.waitFor(() => {
      const state = flasher.getState();
      expect(state.phase === 'flash' && state.progress > 0).toBe(true);
    });

    detach();
    detach = () => undefined;

    expect(firmwareUpdateSession.getState().active).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(dfu().image.length).toBeLessThan(size);
    // Not manifested: the keyboard stays in its bootloader, ready for another attempt.
    expect(dfu().connected).toBe(true);
    expect(vk().connected).toBe(false);
    expect(flasher.getState()).toEqual({ phase: 'choose' });
  });

  it('can be attached again after being detached (React StrictMode)', async () => {
    await setup({ dfu: { authorized: true } });
    detach();
    detach = flasher.attach();

    await flasher.chooseFile(firmware(2048));
    await phase('done');
  });
});
