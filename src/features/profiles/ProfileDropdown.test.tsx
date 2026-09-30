import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { setLanguage } from '../../lib/i18n';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import { selectProfile } from '../../testing/virtual-keyboard';
import { deviceStore } from '../device';
import { initialProfileState } from './model/profiles';
import { ProfileDropdown } from './ProfileDropdown';
import { profileActions, profileStore } from './store/profile-store';

const NOW = '2026-09-30T12:00:00.000Z';

function renderDropdown() {
  return render(
    <MemoryRouter initialEntries={['/remap/']}>
      <Routes>
        <Route
          path="/remap/"
          element={
            <>
              <p>Outside</p>
              <ProfileDropdown />
            </>
          }
        />
        <Route path="/profiles/" element={<h1>Profiles route</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function toggle(): HTMLElement {
  return screen.getByTitle('Switch profiles');
}

/** The open dropdown panel (the list and the "Manage All Profiles" link). */
function panel(): HTMLElement {
  const root = screen.getByRole('link').parentElement?.parentElement;
  if (!root) throw new Error('Missing dropdown panel');
  return root;
}

function option(name: RegExp): HTMLElement {
  return within(panel()).getByRole('button', { name });
}

async function connect() {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);
  await vi.waitFor(() => {
    expect(deviceStore.getState()).toMatchObject({
      connection: { status: 'ready' },
      reloading: false,
    });
  });
  return keyboard;
}

beforeEach(() => {
  profileStore.setState(initialProfileState(NOW), true);
  localStorage.clear();
});

afterEach(() => {
  setLanguage('en');
  localStorage.clear();
});

describe('ProfileDropdown', () => {
  it('shows the active profile under the Profiles label', () => {
    renderDropdown();

    expect(toggle()).toHaveClass(
      'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 glassmorphism-button hover:shadow-md active:scale-95'
    );
    expect(toggle()).toHaveTextContent('ProfilesProfile 1');
    expect(within(toggle()).getByText('Profiles')).toHaveClass(
      'text-xs text-gray-500 dark:text-gray-400'
    );
    expect(within(toggle()).getByText('Profile 1')).toHaveClass(
      'text-sm font-semibold text-gray-900 dark:text-white'
    );
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows "No Profile" when the active slot is empty', () => {
    act(() => {
      profileStore.setState({ ...profileStore.getState(), activeProfileId: 9 });
    });
    renderDropdown();

    expect(toggle()).toHaveTextContent('ProfilesNo Profile');
  });

  it('lists every profile with its slot and marks the active one', async () => {
    const user = userEvent.setup();
    act(() => {
      profileActions.create('Travel');
    });
    renderDropdown();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle().querySelector('svg')).toHaveClass('rotate-180');
    const options = within(panel()).getAllByRole('button');
    expect(options.map(item => item.textContent)).toEqual([
      'Profile 1Slot 1',
      'Profile 2Slot 2',
      'Profile 3Slot 3',
      'Profile 4Slot 4',
      'TravelSlot 5',
    ]);
    expect(within(options[4] ?? panel()).getByText('Slot 5')).toHaveTextContent(/^Slot 5$/);
    expect(options[0]?.querySelector('.lucide-check')).toHaveClass('w-4 h-4 text-primary-500');
    expect(options[1]?.querySelector('.lucide-check')).toBeNull();
  });

  it('closes on a second click and on clicks outside, but not on clicks inside', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(toggle());
    await user.click(panel());
    expect(screen.getByRole('link', { name: 'Manage All Profiles' })).toBeInTheDocument();

    await user.click(toggle());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await user.click(toggle());
    await user.click(screen.getByText('Outside'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(toggle().querySelector('svg')).not.toHaveClass('rotate-180');
  });

  it('links to the Profiles page and closes', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(toggle());
    const link = screen.getByRole('link', { name: 'Manage All Profiles' });
    expect(link).toHaveAttribute('href', '/profiles/');
    await user.click(link);

    expect(screen.getByRole('heading', { name: 'Profiles route' })).toBeInTheDocument();
  });

  it('activates the chosen profile and switches the keyboard to profiles 1–4 (D7)', async () => {
    const keyboard = await connect();
    const user = userEvent.setup();
    renderDropdown();

    await user.click(toggle());
    await user.click(option(/^Profile 2/));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(toggle()).toHaveTextContent('ProfilesProfile 2');
    await vi.waitFor(() => {
      expect(keyboard.vk.state.profileIndex).toBe(1);
    });
  });

  it('activates local profiles without switching the keyboard', async () => {
    const keyboard = await connect();
    act(() => {
      profileActions.create('Travel');
    });
    keyboard.vk.clearHistory();
    const user = userEvent.setup();
    renderDropdown();

    await user.click(toggle());
    await user.click(option(/^Travel/));

    expect(toggle()).toHaveTextContent('ProfilesTravel');
    expect(keyboard.vk.sentPackets).toEqual([]);
  });

  it('shows the profile the keyboard switched to (D7)', async () => {
    const keyboard = await connect();
    renderDropdown();

    selectProfile(keyboard.vk.state, 3);
    keyboard.vk.notifyConfigChanged();

    await vi.waitFor(() => {
      expect(toggle()).toHaveTextContent('ProfilesProfile 4');
    });
  });

  it('translates its labels', async () => {
    const user = userEvent.setup();
    act(() => {
      setLanguage('zh');
    });
    renderDropdown();

    await user.click(toggle());

    expect(within(toggle()).getByText('配置文件')).toBeInTheDocument();
    expect(option(/^Profile 1/)).toHaveTextContent('Profile 1插槽 1');
    expect(screen.getByRole('link', { name: '管理所有配置文件' })).toBeInTheDocument();
  });
});
