import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import {
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../../testing/virtual-keyboard';
import { firmwareFlasher } from './flasher';
import { firmwareUpdateSession, UpdatePage, useFirmwareUpdateSession } from './index';

const STEP_NAMES = [
  'Choose Binary',
  'Reboot to Recovery',
  'Connect Recovery',
  'Update Program',
  'Connect Flash',
  'Flash Firmware',
  'Finish',
];

/** Waits for update phases: a full flash takes a while in jsdom on a busy machine. */
const FLOW = { timeout: 5000 };

let keyboard: { readonly vk: InstalledVirtualKeyboard; readonly dispose: () => void };

function firmware(size: number, name = 'zellia.bin'): File {
  return new File([Uint8Array.from({ length: size }, (_, index) => index & 0xff)], name);
}

async function connect(options: VirtualKeyboardOptions = {}): Promise<void> {
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false, ...options });
}

/** No keyboard connected to the app; its bootloader waits on the USB bus (§1.7). */
function inBootloader(options: VirtualKeyboardOptions = {}): void {
  const vk = installVirtualHid(navigator, { seedDynamicKeys: false, ...options });
  keyboard = {
    vk,
    dispose: () => {
      vk.uninstall();
    },
  };
  vk.enterBootloader();
}

function SessionFlag() {
  const { active } = useFirmwareUpdateSession();
  return <output aria-label="update session">{active ? 'active' : 'inactive'}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/update/']}>
      <UpdatePage />
      <SessionFlag />
    </MemoryRouter>
  );
}

function fileInput(): HTMLInputElement {
  const input = document.getElementById('firmware-file-input');
  if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
  return input;
}

/** The step list, in order, as `name: status` (the active step is `aria-current`). */
function steps(): string[] {
  const list = screen.getByRole('list', { name: 'Update steps' });
  return within(list)
    .getAllByRole('listitem')
    .map(item => {
      const circle = item.querySelector('.rounded-full');
      const status = item.getAttribute('aria-current')
        ? 'active'
        : circle?.classList.contains('bg-red-500')
          ? 'error'
          : circle?.classList.contains('bg-primary-500')
            ? 'completed'
            : 'pending';
      return `${item.textContent}: ${status}`;
    });
}

function drop(file: File): void {
  fireEvent.drop(screen.getByRole('region', { name: 'Firmware file drop zone' }), {
    dataTransfer: { files: [file] },
  });
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  // The update outlives the page (D3): end it between tests.
  firmwareFlasher().reset();
  keyboard.dispose();
});

describe('UpdatePage', { timeout: 15_000 }, () => {
  it('shows the seven steps with the file chooser active', async () => {
    await connect();
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Zellia Firmware Updater' })
    ).toBeInTheDocument();
    expect(screen.getByText('Update your device firmware via USB DFU')).toBeInTheDocument();
    expect(steps()).toEqual([
      'Choose Binary: active',
      ...STEP_NAMES.slice(1).map(name => `${name}: pending`),
    ]);
    expect(screen.getByRole('heading', { name: 'Select Firmware File' })).toBeInTheDocument();
    expect(fileInput()).toHaveAttribute('accept', '.bin');
    expect(screen.getByText('Drop firmware here')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'update session' })).toHaveTextContent('inactive');
  });

  it('highlights the drop zone while a file is dragged over it', async () => {
    await connect();
    renderPage();
    const zone = screen.getByRole('region', { name: 'Firmware file drop zone' });

    fireEvent.dragOver(zone);
    expect(zone).toHaveClass('border-primary-500 scale-105 bg-primary-900/40');
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('scale-105');
  });

  it('updates the keyboard from a chosen file through to the finish step', async () => {
    await connect({ dfu: { authorized: true }, firmwareAfterUpdate: { minor: 2 } });
    const user = userEvent.setup();
    renderPage();
    const file = firmware(6000);

    await user.upload(fileInput(), file);

    expect(
      await screen.findByRole('heading', { name: 'Flashing Complete!' }, FLOW)
    ).toBeInTheDocument();
    expect(steps()).toEqual([
      ...STEP_NAMES.slice(0, 6).map(name => `${name}: completed`),
      'Finish: active',
    ]);
    expect(keyboard.vk.dfu?.image).toEqual(new Uint8Array(await file.arrayBuffer()));
    expect(screen.getByRole('status', { name: 'update session' })).toHaveTextContent('active');

    await user.click(screen.getByRole('button', { name: 'Flash Another Device' }));
    expect(screen.getByRole('heading', { name: 'Select Firmware File' })).toBeInTheDocument();
  });

  it('shows the DFU instructions, then asks to connect the bootloader', async () => {
    await connect();
    const user = userEvent.setup();
    renderPage();

    await user.upload(fileInput(), firmware(4096));

    // The keyboard rebooted into its bootloader, which is not authorized yet.
    expect(
      await screen.findByRole('heading', { name: 'Connect USB Device' }, FLOW)
    ).toBeInTheDocument();
    expect(screen.getByText('Connect your device in DFU mode')).toBeInTheDocument();
    expect(steps().slice(0, 3)).toEqual([
      'Choose Binary: completed',
      'Reboot to Recovery: completed',
      'Connect Recovery: active',
    ]);
    expect(screen.getByRole('status', { name: 'update session' })).toHaveTextContent('active');

    await user.click(screen.getByRole('button', { name: 'Connect USB Device' }));

    expect(
      await screen.findByRole('heading', { name: 'Flashing Complete!' }, FLOW)
    ).toBeInTheDocument();
  });

  it('shows the flashing progress', async () => {
    await connect({ dfu: { authorized: true, busyPolls: 2, pollTimeoutMs: 5 } });
    renderPage();

    drop(firmware(24 * 1024));

    const heading = await screen.findByRole('heading', { name: 'Flashing Firmware' }, FLOW);
    const panel = heading.parentElement ?? document.body;
    expect(within(panel).getByText('Do not disconnect your device')).toBeInTheDocument();
    const bar = within(panel).getByRole('progressbar', { name: 'Progress' });
    await vi.waitFor(() => {
      expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    }, FLOW);
    expect(steps()[5]).toBe('Flash Firmware: active');
    await screen.findByRole('heading', { name: 'Flashing Complete!' }, FLOW);
  });

  it('keeps the DFU panel next to the error for a wrong file, like Svelte', async () => {
    await connect();
    const user = userEvent.setup();
    renderPage();

    drop(firmware(4096, 'zellia.hex'));

    expect(screen.getByRole('alert')).toHaveTextContent('Please select a .bin firmware file');
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enter DFU Mode' })).toBeInTheDocument();
    expect(steps().slice(0, 2)).toEqual(['Choose Binary: completed', 'Reboot to Recovery: active']);
    expect(keyboard.vk.connected).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Device is in DFU Mode' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(steps()[0]).toBe('Choose Binary: active');
  });

  it('marks the connect step failed when no bootloader is picked', async () => {
    await connect();
    keyboard.vk.usb.picker = 'cancel';
    const user = userEvent.setup();
    renderPage();

    await user.upload(fileInput(), firmware(4096));
    await user.click(await screen.findByRole('button', { name: 'Connect USB Device' }, FLOW));

    expect(await screen.findByRole('alert', {}, FLOW)).toHaveTextContent(
      'No device in DFU mode found. Please enter recovery mode first.'
    );
    expect(steps()[2]).toBe('Connect Recovery: error');
  });

  it('keeps flashing when the page is left and shows the result on return (D3)', async () => {
    await connect({ dfu: { authorized: true, busyPolls: 2, pollTimeoutMs: 5 } });
    const first = renderPage();
    const file = firmware(48 * 1024);

    drop(file);
    await screen.findByRole('heading', { name: 'Flashing Firmware' }, FLOW);
    act(() => {
      first.unmount();
    });

    expect(firmwareUpdateSession.getState().active).toBe(true);
    await vi.waitFor(() => {
      expect(firmwareUpdateSession.getState().active).toBe(false);
    }, FLOW);
    expect(keyboard.vk.dfu?.image).toEqual(new Uint8Array(await file.arrayBuffer()));

    renderPage();
    expect(screen.getByRole('heading', { name: 'Flashing Complete!' })).toBeInTheDocument();
    expect(steps()[6]).toBe('Finish: active');
  });

  it('shows a running flash when the page is opened again', async () => {
    await connect({ dfu: { authorized: true, busyPolls: 2, pollTimeoutMs: 5 } });
    const first = renderPage();

    drop(firmware(48 * 1024));
    await screen.findByRole('heading', { name: 'Flashing Firmware' }, FLOW);
    act(() => {
      first.unmount();
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Flashing Firmware' })).toBeInTheDocument();
    expect(steps()[5]).toBe('Flash Firmware: active');
    await screen.findByRole('heading', { name: 'Flashing Complete!' }, FLOW);
  });

  it('flashes a keyboard waiting in its bootloader without a keyboard connected (§1.7)', async () => {
    inBootloader();
    const user = userEvent.setup();
    renderPage();

    await user.upload(fileInput(), firmware(4096));

    expect(
      await screen.findByRole('heading', { name: 'Connect USB Device' }, FLOW)
    ).toBeInTheDocument();
    expect(steps().slice(0, 3)).toEqual([
      'Choose Binary: completed',
      'Reboot to Recovery: completed',
      'Connect Recovery: active',
    ]);
    await user.click(screen.getByRole('button', { name: 'Connect USB Device' }));

    expect(
      await screen.findByRole('heading', { name: 'Flashing Complete!' }, FLOW)
    ).toBeInTheDocument();
    expect(keyboard.vk.dfu?.image).toHaveLength(4096);
  });
});
