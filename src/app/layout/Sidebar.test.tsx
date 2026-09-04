import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { deviceSession, deviceStore } from '../../features/device';
import { setFirmwareUpdateActive } from '../../features/firmware-update';
import { setLanguage } from '../../lib/i18n';
import {
  connectShellKeyboard,
  currentPath,
  renderApp,
  resetShellState,
} from '../testing/render-app';

afterEach(resetShellState);

function sidebar(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.sidebar');
  if (!element) throw new Error('no sidebar');
  return element;
}

describe('Sidebar', () => {
  it('waits for a keyboard without Save and Disconnect', async () => {
    renderApp('/');

    expect(await screen.findByText('Waiting to connect')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
  });

  it('shows the connected keyboard with Save and Disconnect', async () => {
    await connectShellKeyboard();
    renderApp('/remap/');

    expect(await screen.findByText('ZelliaKB')).toBeInTheDocument();
    expect(screen.queryByText('Waiting to connect')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'title',
      'Save configuration'
    );
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });

  it('saves the configuration to the keyboard (PL-002)', async () => {
    const keyboard = await connectShellKeyboard();
    const user = userEvent.setup();
    renderApp('/remap/');
    const before = keyboard.vk.state.profiles[0]?.keymap[0]?.[1];
    expect(before).not.toBe(0x04);

    deviceSession.setKeycodes(0, [1], 0x04);
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(keyboard.vk.state.profiles[0]?.keymap[0]?.[1]).toBe(0x04);
    });
    expect(deviceStore.getState().lastError).toBeNull();
  });

  it('disconnects and returns to the connection screen', async () => {
    await connectShellKeyboard();
    const user = userEvent.setup();
    const { router } = renderApp('/performance/');

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));

    expect(deviceStore.getState().connection.status).toBe('disconnected');
    await waitFor(() => {
      expect(currentPath(router)).toBe('/');
    });
    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('adds a single history entry when disconnecting', async () => {
    await connectShellKeyboard();
    const user = userEvent.setup();
    const { router } = renderApp('/performance/');

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));
    await waitFor(() => {
      expect(currentPath(router)).toBe('/');
    });

    await act(async () => {
      await router.navigate(-1);
    });
    expect(currentPath(router)).toBe('/performance/');
  });

  it('disconnects to the connection screen during a firmware update too', async () => {
    await connectShellKeyboard();
    const user = userEvent.setup();
    const { router } = renderApp('/update/');
    act(() => {
      setFirmwareUpdateActive(true);
    });

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));

    await waitFor(() => {
      expect(currentPath(router)).toBe('/');
    });
    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('links every page and marks the current one', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/remap/');
    const nav = within(await screen.findByRole('navigation'));

    expect(nav.getAllByRole('link').map(link => link.textContent)).toEqual([
      'Performance',
      'Remap',
      'Lighting',
      'Dynamic Keys',
      'Debug',
      'Settings',
      'Update',
      'About',
    ]);
    expect(nav.getByRole('link', { name: 'Remap' })).toHaveAttribute('data-active', 'true');
    expect(nav.getByRole('link', { name: 'Remap' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Lighting' })).toHaveAttribute('data-active', 'false');

    await user.click(nav.getByRole('link', { name: 'Dynamic Keys' }));

    await waitFor(() => {
      expect(nav.getByRole('link', { name: 'Dynamic Keys' })).toHaveAttribute(
        'data-active',
        'true'
      );
    });
    expect(currentPath(router)).toBe('/dynamic/');
    expect(nav.getByRole('link', { name: 'Remap' })).not.toHaveAttribute('aria-current');
  });

  it('opens the profiles page', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: 'Profiles' }));

    await waitFor(() => {
      expect(currentPath(router)).toBe('/profiles/');
    });
  });

  it('follows the language', async () => {
    await connectShellKeyboard();
    renderApp('/remap/');
    await screen.findByText('ZelliaKB');

    act(() => {
      setLanguage('zh');
    });

    const titles = within(sidebar()).getByRole('heading', { level: 1 });
    expect(titles).toHaveTextContent('ZELLIA 控制');
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '断开连接' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '按键映射' })).toHaveAttribute('data-active', 'true');
  });
});
