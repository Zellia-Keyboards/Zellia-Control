import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardKeycode } from 'emi-keyboard-controller';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kc } from '../keycodes';
import { setLanguage } from '../../lib/i18n';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { SettingsPage } from './index';

const REBOOT = kc.keyboardOperation(KeyboardKeycode.KeyboardReboot);
const BOOTLOADER = kc.keyboardOperation(KeyboardKeycode.KeyboardBootloader);
const FACTORY_RESET = kc.keyboardOperation(KeyboardKeycode.KeyboardFactoryReset);

let keyboard: ConnectedKeyboard;

/** Keyboard-operation keycodes the app sent since the last `clearHistory()`. */
function operations(): number[] {
  return keyboard.vk.sentPackets.flatMap(packet => (packet.op === 'event' ? [packet.keycode] : []));
}

/** Lets the controller queue and the virtual keyboard finish pending exchanges. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/']}>
      <SettingsPage />
    </MemoryRouter>
  );
}

function card(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

beforeEach(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  setLanguage('en');
  keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  keyboard.vk.clearHistory();
});

afterEach(() => {
  keyboard.dispose();
  setLanguage('en');
  localStorage.clear();
});

describe('SettingsPage', () => {
  it('shows the translated header, the three actions and the warning', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(
      screen.getByText('Configure device settings and manage your keyboard')
    ).toBeInTheDocument();
    for (const [name, description] of [
      ['Restart Device', 'Restart your keyboard to apply changes'],
      ['Enter Bootloader', 'Enter bootloader mode for firmware updates'],
      ['Factory Reset', 'Reset all settings to factory defaults'],
    ] as const) {
      const action = card(name);
      expect(within(action).getByRole('heading', { level: 3, name })).toBeInTheDocument();
      expect(within(action).getByText(description)).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        "These actions affect your keyboard's firmware and settings. Use with caution."
      )
    ).toBeInTheDocument();
  });

  it('staggers the card animations like the Svelte page', () => {
    renderPage();
    expect(
      ['Restart Device', 'Enter Bootloader', 'Factory Reset'].map(
        name => card(name).style.animationDelay
      )
    ).toEqual(['0ms', '100ms', '200ms']);
  });

  it('restarts the keyboard at once', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Restart Device'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => {
      expect(operations()).toEqual([REBOOT]);
    });
  });

  it('asks before entering the bootloader and sends nothing when cancelled', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Enter Bootloader'));
    const dialog = screen.getByRole('dialog', { name: 'Enter Bootloader' });
    expect(dialog).toHaveAccessibleDescription(/bootloader mode/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await settle();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(operations()).toEqual([]);
    expect(keyboard.vk.connected).toBe(true);
  });

  it('enters the bootloader once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Enter Bootloader'));
    const dialog = screen.getByRole('dialog', { name: 'Enter Bootloader' });
    await user.click(within(dialog).getByRole('button', { name: 'Enter Bootloader' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => {
      expect(operations()).toEqual([BOOTLOADER]);
    });
    await vi.waitFor(() => {
      expect(keyboard.vk.dfu?.connected).toBe(true);
    });
  });

  it('asks before a factory reset and sends nothing when cancelled with Escape', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Factory Reset'));
    const dialog = screen.getByRole('dialog', { name: 'Factory Reset' });
    expect(dialog).toHaveAccessibleDescription(/cannot be undone/);
    await user.keyboard('{Escape}');
    await settle();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(operations()).toEqual([]);
  });

  it('factory resets the keyboard once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Factory Reset'));
    const dialog = screen.getByRole('dialog', { name: 'Factory Reset' });
    const confirm = within(dialog).getByRole('button', { name: 'Factory Reset' });
    expect(confirm).toHaveClass('bg-red-600/80');
    await user.click(confirm);

    await vi.waitFor(() => {
      expect(operations()).toEqual([FACTORY_RESET]);
    });
  });

  it('runs the actions from the keyboard with Enter and Space', async () => {
    const user = userEvent.setup();
    renderPage();

    card('Factory Reset').focus();
    await user.keyboard(' ');
    expect(screen.getByRole('dialog', { name: 'Factory Reset' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    card('Restart Device').focus();
    await user.keyboard('{Enter}');
    await vi.waitFor(() => {
      expect(operations()).toEqual([REBOOT]);
    });
  });

  it('returns focus to the action when the confirmation closes', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(card('Enter Bootloader'));
    await user.keyboard('{Escape}');

    expect(card('Enter Bootloader')).toHaveFocus();
  });

  it('translates the page and the confirmation title to Chinese', async () => {
    const user = userEvent.setup();
    renderPage();
    act(() => {
      setLanguage('zh');
    });

    expect(screen.getByRole('heading', { level: 1, name: '设置' })).toBeInTheDocument();
    await user.click(card('恢复出厂设置'));
    expect(screen.getByRole('dialog', { name: '恢复出厂设置' })).toBeInTheDocument();
  });
});
