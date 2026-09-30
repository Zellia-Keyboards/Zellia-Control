import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AboutPage } from '../features/about';
import { DebugPage } from '../features/debug';
import { DynamicKeysPage } from '../features/dynamic-keys';
import { UpdatePage, setFirmwareUpdateActive } from '../features/firmware-update';
import { LightingPage } from '../features/lighting';
import { PerformancePage } from '../features/performance';
import { ProfilesPage } from '../features/profiles';
import { RemapPage } from '../features/remap';
import { SettingsPage } from '../features/settings';
import { APP_PAGES, PAGE_PATHS } from './pages';
import {
  connectShellKeyboard,
  currentPath,
  renderApp,
  resetShellState,
  standInPages,
} from './testing/render-app';

afterEach(resetShellState);

describe('routes', () => {
  it('shows the connection screen at / while no keyboard is connected', async () => {
    renderApp('/');

    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeEnabled();
    expect(screen.getByText('Waiting to connect')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('redirects page URLs to their trailing-slash form, keeping search and hash', async () => {
    const { router } = renderApp('/settings?tab=2#top');

    await waitFor(() => {
      expect(currentPath(router)).toBe('/settings/?tab=2#top');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows a 404 page without the sidebar for unknown paths', async () => {
    const { router, container } = renderApp('/not-a-route/');

    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(container.querySelector('.sidebar')).toBeNull();
    expect(currentPath(router)).toBe('/not-a-route/');
  });

  it('matches page paths case-sensitively', async () => {
    renderApp('/Remap/');

    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
  });

  it('asks to connect a keyboard on every page while none is connected', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/performance/');

    expect(await screen.findByText('No Keyboard Connected')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to Home' }));

    await waitFor(() => {
      expect(currentPath(router)).toBe('/');
    });
    expect(await screen.findByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('renders the lazily loaded page below the toolbar and the keyboard', async () => {
    await connectShellKeyboard();
    const { container } = renderApp('/remap/');

    const page = await screen.findByTestId('page');
    expect(page).toHaveTextContent('remap page');
    const main = container.querySelector('.glassmorphism-main');
    // Toolbar, keyboard, page — the page takes the place of the Svelte layout's children.
    expect(main?.lastElementChild).toBe(page);
    expect(main?.querySelector('.keycap')).not.toBeNull();
  });

  it('hides the toolbar and the keyboard on About, Profiles, Debug, Settings and Update', async () => {
    await connectShellKeyboard();
    for (const path of ['about', 'profiles', 'debug', 'settings', 'update']) {
      const { container, unmount } = renderApp(`/${path}/`);
      expect(await screen.findByTestId('page')).toHaveTextContent(`${path} page`);
      expect(container.querySelector('.keycap')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Configure keyboard layout' })).toBeNull();
      unmount();
    }
  });

  it('goes from / to Remap once connected, replacing the history entry', async () => {
    await connectShellKeyboard();
    const { router } = renderApp('/');

    await waitFor(() => {
      expect(currentPath(router)).toBe('/remap/');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByTestId('page')).toHaveTextContent('remap page');
  });

  it('keeps the Update page when the keyboard goes away (D3)', async () => {
    const keyboard = await connectShellKeyboard();
    const { router } = renderApp('/update/');
    const page = await screen.findByTestId('page');

    act(() => {
      keyboard.vk.disconnect();
    });

    await waitFor(() => {
      expect(screen.getByText('Waiting to connect')).toBeInTheDocument();
    });
    expect(screen.getByTestId('page')).toBe(page);
    expect(currentPath(router)).toBe('/update/');
    expect(screen.queryByText('No Keyboard Connected')).not.toBeInTheDocument();
  });

  it('shows the Update page without a keyboard (PL-025)', async () => {
    const { container } = renderApp('/update/');

    expect(await screen.findByTestId('page')).toHaveTextContent('update page');
    expect(screen.queryByText('No Keyboard Connected')).not.toBeInTheDocument();
    expect(container.querySelector('.keycap')).toBeNull();
  });

  it('stays on a page while a firmware update reboots the keyboard', async () => {
    const keyboard = await connectShellKeyboard();
    const { router } = renderApp('/about/');
    await screen.findByTestId('page');

    act(() => {
      setFirmwareUpdateActive(true);
    });
    act(() => {
      keyboard.vk.disconnect();
    });

    expect(await screen.findByText('No Keyboard Connected')).toBeInTheDocument();
    expect(currentPath(router)).toBe('/about/');
  });

  it('shows the error page inside the shell when a page fails to load', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await connectShellKeyboard();
    const { container } = renderApp('/about/', {
      ...standInPages(),
      about: () => Promise.reject(new Error('chunk failed')),
    });

    expect(await screen.findByRole('heading', { name: '500' })).toBeInTheDocument();
    expect(screen.getByText('Internal Error')).toBeInTheDocument();
    // Like SvelteKit's error page, it replaces the page only: the sidebar stays.
    expect(container.querySelector('.glassmorphism-main')).toContainElement(
      screen.getByRole('heading', { name: '500' })
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    await waitFor(() => {
      expect(logged).toHaveBeenCalledWith('[app] route error', expect.any(Error));
    });
  });

  it('still asks for a keyboard when a page fails to load without one', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderApp('/about/', {
      ...standInPages(),
      about: () => Promise.reject(new Error('chunk failed')),
    });

    expect(await screen.findByText('No Keyboard Connected')).toBeInTheDocument();
  });
});

describe('APP_PAGES', () => {
  it('loads every page from its feature', async () => {
    const pages = await Promise.all(PAGE_PATHS.map(path => APP_PAGES[path]()));

    expect(Object.fromEntries(PAGE_PATHS.map((path, index) => [path, pages[index]]))).toEqual({
      remap: RemapPage,
      performance: PerformancePage,
      lighting: LightingPage,
      dynamic: DynamicKeysPage,
      debug: DebugPage,
      settings: SettingsPage,
      update: UpdatePage,
      about: AboutPage,
      profiles: ProfilesPage,
    });
  });
});
