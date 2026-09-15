import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { installFakeAnimations } from '../../lib/transitions/testing';
import { connectVirtualKeyboard } from '../../testing/app-keyboard';
import { selectProfile } from '../../testing/virtual-keyboard';
import { deviceStore } from '../device';
import { PROFILES_STORAGE_KEY, initialProfileState, type Profile } from './model/profiles';
import { ProfilesPage } from './ProfilesPage';
import { profileActions, profileStore } from './store/profile-store';

const NOW = '2026-09-30T12:00:00.000Z';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilesPage />
    </MemoryRouter>
  );
}

/** A profile card, named by its profile. */
function card(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** Names of the profile cards, in grid order. */
function cardNames(): string[] {
  return screen
    .getAllByRole('button')
    .filter(button => button.hasAttribute('aria-pressed'))
    .map(button => button.querySelector('h3')?.textContent ?? '');
}

function activeCard(): HTMLElement {
  return screen.getByRole('button', { pressed: true });
}

function profile(id: number): Profile | null {
  return profileStore.getState().profiles[id - 1] ?? null;
}

function addProfiles(count: number) {
  act(() => {
    for (let i = 0; i < count; i++) profileActions.create();
  });
}

async function openMenu(name: string) {
  await userEvent.click(within(card(name)).getByRole('button', { name: 'Menu' }));
  return screen.getByRole('menu');
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
  vi.useRealTimers();
  localStorage.clear();
});

describe('ProfilesPage', () => {
  it('shows the default profiles, the active one and the add card', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Configure Profiles' })).toHaveClass(
      'text-2xl font-bold text-gray-900 dark:text-white'
    );
    expect(
      screen.getByText(
        'Manage your keyboard profiles here. You can import, export, and customize them.'
      )
    ).toBeInTheDocument();
    expect(cardNames()).toEqual(['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4']);
    expect(activeCard()).toBe(card('Profile 1'));
    expect(within(card('Profile 1')).getByText('Active')).toHaveClass(
      'absolute top-4 right-12 px-2 py-1 rounded-md bg-gray-700 text-white text-xs font-medium'
    );
    expect(within(card('Profile 2')).queryByText('Active')).not.toBeInTheDocument();
    expect(card('Profile 1')).toHaveClass('border-green-500/50 cursor-default');
    expect(card('Profile 2')).toHaveClass('border-gray-700 cursor-pointer hover:border-gray-600');
    expect(screen.getByRole('button', { name: 'Add Profile' })).toBeInTheDocument();
  });

  it('adds profiles into the next free slot until all 16 exist', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Add Profile' }));
    expect(cardNames()).toEqual(['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', 'Profile 5']);
    expect(localStorage.getItem(PROFILES_STORAGE_KEY)).toContain('"name":"Profile 5"');

    for (let i = 0; i < 11; i++)
      await user.click(screen.getByRole('button', { name: 'Add Profile' }));

    expect(cardNames()).toHaveLength(16);
    expect(cardNames().at(-1)).toBe('Profile 16');
    expect(screen.queryByRole('button', { name: 'Add Profile' })).not.toBeInTheDocument();
  });

  it('names a new profile after its slot', async () => {
    addProfiles(3);
    act(() => {
      profileActions.delete(6);
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Add Profile' }));

    expect(profile(6)?.name).toBe('Profile 6');
  });

  describe('menu', () => {
    it('opens below the menu button and closes on a second click or outside', async () => {
      const user = userEvent.setup();
      renderPage();

      const menu = await openMenu('Profile 2');
      expect(menu).toHaveClass(
        'fixed border rounded-lg shadow-2xl z-[9999] w-48 overflow-hidden backdrop-blur-2xl glassmorphism-card border-primary-500/30'
      );
      expect(menu).toHaveStyle({ top: '4px', right: `${window.innerWidth}px` });
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map(item => item.textContent)
      ).toEqual(['Export', 'Duplicate', 'Restore Default']);
      expect(within(card('Profile 2')).getByRole('button', { name: 'Menu' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );

      await user.click(within(card('Profile 2')).getByRole('button', { name: 'Menu' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await openMenu('Profile 2');
      await user.click(screen.getByRole('heading', { level: 1 }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      // The menu button does not activate its card.
      expect(activeCard()).toBe(card('Profile 1'));
    });

    it('stays open for clicks inside and moves to another card’s menu', async () => {
      const user = userEvent.setup();
      renderPage();
      const menu = await openMenu('Profile 2');

      await user.click(menu);
      expect(screen.getByRole('menu')).toBe(menu);

      await openMenu('Profile 3');
      expect(screen.getAllByRole('menu')).toEqual([menu]);
      expect(within(card('Profile 3')).getByRole('button', { name: 'Menu' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('offers Delete only for additional profiles that are not active', async () => {
      addProfiles(2);
      act(() => {
        profileActions.activate(6);
      });
      renderPage();

      let menu = await openMenu('Profile 1');
      expect(within(menu).queryByRole('menuitem', { name: /Delete/ })).not.toBeInTheDocument();
      menu = await openMenu('Profile 6');
      expect(within(menu).queryByRole('menuitem', { name: /Delete/ })).not.toBeInTheDocument();
      menu = await openMenu('Profile 5');
      expect(within(menu).getByRole('menuitem', { name: 'Hold to Delete (1.5s)' })).toHaveClass(
        'text-red-400 hover:bg-red-900/20'
      );
    });
  });

  describe('duplicate', () => {
    it('copies the profile into the next free slot after confirmation', async () => {
      const user = userEvent.setup();
      renderPage();
      const menu = await openMenu('Profile 2');

      await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      const dialog = screen.getByRole('dialog', { name: 'Duplicate Profile' });
      expect(dialog).toHaveAccessibleDescription(
        'Create a copy of Profile 2 in the next available slot?'
      );
      expect(within(dialog).getByText('Profile 2', { selector: 'strong' })).toHaveClass(
        'text-white'
      );

      await user.click(within(dialog).getByRole('button', { name: 'Duplicate' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(cardNames().at(-1)).toBe('Profile 2 (Copy)');
      expect(profile(5)).toMatchObject({ id: 5, name: 'Profile 2 (Copy)', isDefault: false });
    });

    it('changes nothing when cancelled', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(
        within(await openMenu('Profile 2')).getByRole('menuitem', { name: 'Duplicate' })
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(cardNames()).toHaveLength(4);
    });

    it('reports that all 16 slots are used', async () => {
      const user = userEvent.setup();
      addProfiles(12);
      renderPage();

      await user.click(
        within(await openMenu('Profile 2')).getByRole('menuitem', { name: 'Duplicate' })
      );

      const dialog = screen.getByRole('dialog', { name: 'Notice' });
      expect(dialog).toHaveAccessibleDescription('Maximum 16 profiles reached');
      await user.click(within(dialog).getByRole('button', { name: 'OK' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(cardNames()).toHaveLength(16);
    });
  });

  describe('restore default', () => {
    it('resets the profile after confirmation, keeping its name', async () => {
      const user = userEvent.setup();
      act(() => {
        profileActions.importFile(
          JSON.stringify({ name: 'Tuned', lighting: { mode: 2 }, keyMappings: { 3: 4 } }),
          5
        );
      });
      renderPage();

      await user.click(
        within(await openMenu('Tuned')).getByRole('menuitem', { name: 'Restore Default' })
      );
      const dialog = screen.getByRole('dialog', { name: 'Restore to Default' });
      expect(dialog).toHaveAccessibleDescription(
        'Are you sure you want to restore Tuned to its default settings? This action cannot be undone.'
      );
      expect(within(dialog).getByRole('button', { name: 'Restore' })).toHaveClass(
        'bg-orange-600/80'
      );

      await user.click(within(dialog).getByRole('button', { name: 'Restore' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(profile(5)).toMatchObject({
        name: 'Tuned',
        keyMappings: {},
        lighting: {},
        performance: {},
        advancedKeys: {},
      });
    });
  });

  describe('hold to delete', () => {
    function deleteItem(): HTMLElement {
      return screen.getByRole('menuitem', { name: /Delet/ });
    }

    it('deletes the profile after holding for 1.5 s and closes the menu', async () => {
      addProfiles(1);
      renderPage();
      await openMenu('Profile 5');
      vi.useFakeTimers();

      fireEvent.mouseDown(deleteItem());
      act(() => {
        vi.advanceTimersByTime(1008);
      });
      expect(deleteItem()).toHaveTextContent('Deleting... 67%');
      expect(deleteItem()).toHaveClass('bg-red-900/30');
      act(() => {
        vi.advanceTimersByTime(480);
      });
      expect(profile(5)).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(profile(5)).toBeNull();
      expect(cardNames()).toEqual(['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4']);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('slides the menu out with its last frame, like the Svelte block', () => {
      vi.useFakeTimers();
      const animations = installFakeAnimations();
      onTestFinished(() => {
        animations.uninstall();
      });
      addProfiles(1);
      renderPage();
      fireEvent.click(within(card('Profile 5')).getByRole('button', { name: 'Menu' }));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const menu = screen.getByRole('menu');

      fireEvent.mouseDown(deleteItem());
      act(() => {
        vi.advanceTimersByTime(1504);
      });

      expect(profile(5)).toBeNull();
      expect(menu).toBeInTheDocument();
      expect(menu.inert).toBe(true);
      expect(menu).toHaveTextContent('Deleting... 99%');
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(menu).not.toBeInTheDocument();
    });

    it('keeps the profile when released early', async () => {
      addProfiles(1);
      renderPage();
      await openMenu('Profile 5');
      vi.useFakeTimers();

      fireEvent.mouseDown(deleteItem());
      act(() => {
        vi.advanceTimersByTime(800);
      });
      fireEvent.mouseUp(deleteItem());
      expect(deleteItem()).toHaveTextContent('Hold to Delete (1.5s)');
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(profile(5)).not.toBeNull();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('cancels when the pointer leaves the button', async () => {
      addProfiles(1);
      renderPage();
      await openMenu('Profile 5');
      vi.useFakeTimers();

      fireEvent.mouseDown(deleteItem());
      fireEvent.mouseLeave(deleteItem());
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(profile(5)).not.toBeNull();
    });

    it('can be held with the keyboard', async () => {
      addProfiles(1);
      renderPage();
      await openMenu('Profile 5');
      vi.useFakeTimers();

      fireEvent.keyDown(deleteItem(), { key: 'Enter' });
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      expect(profile(5)).toBeNull();
    });
  });

  describe('export', () => {
    it('downloads the profile as <name>.json and closes the menu', async () => {
      const user = userEvent.setup();
      const blobs: Blob[] = [];
      vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
        if (object instanceof Blob) blobs.push(object);
        return 'blob:profile';
      });
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      const downloads: { href: string; download: string }[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement
      ) {
        downloads.push({ href: this.href, download: this.download });
      });
      renderPage();

      await user.click(
        within(await openMenu('Profile 3')).getByRole('menuitem', { name: 'Export' })
      );

      expect(downloads).toEqual([{ href: 'blob:profile', download: 'Profile 3.json' }]);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile');
      expect(blobs[0]?.type).toBe('application/json');
      expect(await blobs[0]?.text()).toBe(JSON.stringify(profile(3), null, 2));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('import', () => {
    function fileInput(): HTMLInputElement {
      const input = screen.getByLabelText('Import profile');
      if (!(input instanceof HTMLInputElement)) throw new Error('Missing file input');
      return input;
    }

    function profileFile(content: string): File {
      return new File([content], 'profile.json', { type: 'application/json' });
    }

    it('opens the file chooser from the Import Profile button', async () => {
      renderPage();
      const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => undefined);

      await userEvent.click(screen.getByRole('button', { name: 'Import Profile' }));

      expect(click).toHaveBeenCalledTimes(1);
      expect(fileInput()).toHaveAttribute('accept', '.json');
      expect(fileInput()).toHaveClass('hidden');
    });

    it('adds the profile in the next free slot', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.upload(fileInput(), profileFile(JSON.stringify({ name: 'From a friend' })));

      await vi.waitFor(() => {
        expect(cardNames().at(-1)).toBe('From a friend');
      });
      expect(profile(5)).toMatchObject({ id: 5, name: 'From a friend', isDefault: false });
      expect(fileInput().value).toBe('');
    });

    it('reports a file that is not JSON', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.upload(fileInput(), profileFile('not a profile'));

      const dialog = await screen.findByRole('dialog', { name: 'Notice' });
      expect(dialog).toHaveAccessibleDescription(/^Failed to import profile: .*JSON/);
      expect(cardNames()).toHaveLength(4);
      expect(fileInput().value).toBe('');
    });

    it('reports JSON that is not a profile', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.upload(fileInput(), profileFile('[1, 2, 3]'));

      const dialog = await screen.findByRole('dialog', { name: 'Notice' });
      expect(dialog).toHaveAccessibleDescription('Failed to import profile: Invalid profile file');
    });

    it('reports that all 16 slots are used', async () => {
      const user = userEvent.setup();
      addProfiles(12);
      renderPage();

      await user.upload(fileInput(), profileFile(JSON.stringify({ name: 'One too many' })));

      const dialog = await screen.findByRole('dialog', { name: 'Notice' });
      expect(dialog).toHaveAccessibleDescription(
        'No available profile slots. Maximum 16 profiles reached.'
      );
      expect(fileInput().value).toBe('');
    });

    it('reports a file that cannot be read', async () => {
      const user = userEvent.setup();
      vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
        this.dispatchEvent(new ProgressEvent('error'));
      });
      renderPage();

      await user.upload(fileInput(), profileFile('{}'));

      const dialog = await screen.findByRole('dialog', { name: 'Notice' });
      expect(dialog).toHaveAccessibleDescription('Failed to read the file. Please try again.');
    });
  });

  describe('activation (D7)', () => {
    it('switches the keyboard to profiles 1–4', async () => {
      const keyboard = await connect();
      const user = userEvent.setup();
      renderPage();

      await user.click(card('Profile 3'));

      expect(activeCard()).toBe(card('Profile 3'));
      expect(within(card('Profile 3')).getByText('Active')).toBeInTheDocument();
      await vi.waitFor(() => {
        expect(keyboard.vk.state.profileIndex).toBe(2);
      });
    });

    it('marks additional profiles active without switching the keyboard', async () => {
      const keyboard = await connect();
      addProfiles(1);
      keyboard.vk.clearHistory();
      const user = userEvent.setup();
      renderPage();

      await user.click(card('Profile 5'));

      expect(activeCard()).toBe(card('Profile 5'));
      expect(keyboard.vk.sentPackets).toEqual([]);
      expect(keyboard.vk.state.profileIndex).toBe(0);
    });

    it('activates a card with Enter or Space, but not from its menu button', async () => {
      const keyboard = await connect();
      const user = userEvent.setup();
      renderPage();

      card('Profile 2').focus();
      await user.keyboard('{Enter}');
      expect(activeCard()).toBe(card('Profile 2'));

      card('Profile 4').focus();
      await user.keyboard(' ');
      expect(activeCard()).toBe(card('Profile 4'));

      within(card('Profile 3')).getByRole('button', { name: 'Menu' }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(activeCard()).toBe(card('Profile 4'));
      await vi.waitFor(() => {
        expect(keyboard.vk.state.profileIndex).toBe(3);
      });
    });

    it('shows the profile the keyboard switched to', async () => {
      const keyboard = await connect();
      renderPage();

      selectProfile(keyboard.vk.state, 3);
      keyboard.vk.notifyConfigChanged();

      await vi.waitFor(() => {
        expect(activeCard()).toBe(card('Profile 4'));
      });
    });
  });
});
