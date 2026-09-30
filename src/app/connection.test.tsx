import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { deviceStore } from '../features/device';
import {
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../testing/virtual-keyboard';
import { isConnecting, sessionEnded } from './connection';
import { currentPath, renderApp, resetShellState } from './testing/render-app';

afterEach(resetShellState);

function install(options: VirtualKeyboardOptions = {}): InstalledVirtualKeyboard {
  const keyboard = installVirtualHid(navigator, { seedDynamicKeys: false, ...options });
  onTestFinished(() => {
    keyboard.uninstall();
  });
  return keyboard;
}

describe('connecting from the welcome screen', () => {
  it('shows the loading overlay until the configuration is loaded, then opens Remap', async () => {
    install({ latencyMs: 5 });
    const user = userEvent.setup();
    const { router } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Get Started' }));

    expect(await screen.findByText('Loading configurator interface...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
    expect(document.querySelector('.keycap')).toBeNull();

    expect(await screen.findByTestId('page', {}, { timeout: 5000 })).toHaveTextContent(
      'remap page'
    );
    expect(currentPath(router)).toBe('/remap/');
    expect(screen.queryByText('Loading configurator interface...')).not.toBeInTheDocument();
    expect(document.querySelector('.keycap')).not.toBeNull();
    expect(screen.getByText('ZelliaKB')).toBeInTheDocument();
  });

  it('shows why the connection failed and lets the user try again', async () => {
    const keyboard = install({ picker: 'cancel' });
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Get Started' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No compatible keyboards found');

    keyboard.hid.picker = 'first';
    await user.click(screen.getByRole('button', { name: 'Get Started' }));

    expect(await screen.findByTestId('page', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('returns to the connection screen when the keyboard is unplugged', async () => {
    const keyboard = install();
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Get Started' }));
    await screen.findByTestId('page', {}, { timeout: 5000 });
    await user.click(screen.getByRole('link', { name: 'Lighting' }));
    await waitFor(() => {
      expect(screen.getByTestId('page')).toHaveTextContent('lighting page');
    });

    act(() => {
      keyboard.disconnect();
    });

    await waitFor(() => {
      expect(currentPath(router)).toBe('/');
    });
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.getByText('Waiting to connect')).toBeInTheDocument();
    expect(deviceStore.getState().connection.status).toBe('disconnected');
  });

  it('shows the error on the connection screen when a later reload fails', async () => {
    const keyboard = install();
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Get Started' }));
    await screen.findByTestId('page', {}, { timeout: 5000 });

    // The keyboard changed its configuration on board, but stops answering the reload.
    keyboard.dropReplies(() => true);
    keyboard.notifyConfigChanged();

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      /^Failed to load keyboard configuration: /
    );
    expect(currentPath(router)).toBe('/');
  });
});

describe('isConnecting', () => {
  it('covers the picker, opening and loading', () => {
    expect(isConnecting('selecting')).toBe(true);
    expect(isConnecting('connecting')).toBe(true);
    expect(isConnecting('loading')).toBe(true);
    expect(isConnecting('ready')).toBe(false);
    expect(isConnecting('disconnected')).toBe(false);
    expect(isConnecting('error')).toBe(false);
  });
});

describe('sessionEnded', () => {
  it('is a loading or connected keyboard going away or failing', () => {
    expect(sessionEnded('ready', 'disconnected')).toBe(true);
    expect(sessionEnded('ready', 'error')).toBe(true);
    expect(sessionEnded('loading', 'error')).toBe(true);
    expect(sessionEnded('selecting', 'error')).toBe(false);
    expect(sessionEnded('disconnected', 'selecting')).toBe(false);
    expect(sessionEnded('ready', 'ready')).toBe(false);
  });
});
