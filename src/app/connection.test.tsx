import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { deviceSession, deviceStore } from '../features/device';
import {
  installVirtualHid,
  type InstalledVirtualKeyboard,
  type VirtualKeyboardOptions,
} from '../testing/virtual-keyboard';
import { isConnecting, sessionEnded } from './connection';
import { currentPath, renderApp, resetShellState, standInPages } from './testing/render-app';

afterEach(resetShellState);

function install(options: VirtualKeyboardOptions = {}): InstalledVirtualKeyboard {
  const keyboard = installVirtualHid(navigator, { seedDynamicKeys: false, ...options });
  onTestFinished(() => {
    keyboard.uninstall();
  });
  return keyboard;
}

describe('connecting from the welcome screen', () => {
  // Loads the whole configuration with a delay per packet: allow for slow machines.
  it(
    'shows the loading overlay until the configuration is loaded, then opens Remap',
    {
      timeout: 15_000,
    },
    async () => {
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
    }
  );

  it('keeps the sidebar waiting while the configuration loads (PL-003)', async () => {
    // Slow replies keep the session loading well past the checks below.
    install({ latencyMs: 50 });
    void deviceSession.connect();
    await waitFor(() => {
      expect(deviceStore.getState().connection.status).toBe('loading');
    });

    renderApp('/');

    // The keyboard is open and its name known, yet the screen stays as it was while connecting.
    expect(await screen.findByText('Loading configurator interface...')).toBeInTheDocument();
    expect(screen.getByText('Waiting to connect')).toBeInTheDocument();
    expect(screen.queryByText('ZelliaKB')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
    expect(deviceStore.getState().connection).toMatchObject({
      status: 'loading',
      deviceName: 'ZelliaKB',
    });
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
    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.getByText('Waiting to connect')).toBeInTheDocument();
    expect(deviceStore.getState().connection.status).toBe('disconnected');
  });

  it('stays on the connection screen when the keyboard goes away before Remap has loaded', async () => {
    const keyboard = install();
    let loadRemap = () => {};
    const remapLoaded = new Promise<void>(resolve => {
      loadRemap = resolve;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/', {
      ...standInPages(),
      remap: async () => {
        await remapLoaded;
        return function RemapStandIn() {
          return <p data-testid="page">remap page</p>;
        };
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Get Started' }));
    // Ready: the redirect to /remap/ waits for the page's chunk.
    await waitFor(() => {
      expect(router.state.navigation.location?.pathname).toBe('/remap/');
    });

    act(() => {
      keyboard.disconnect();
    });
    await act(async () => {
      loadRemap();
      await remapLoaded;
    });

    await waitFor(() => {
      expect(router.state.navigation.state).toBe('idle');
    });
    expect(currentPath(router)).toBe('/');
    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
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
