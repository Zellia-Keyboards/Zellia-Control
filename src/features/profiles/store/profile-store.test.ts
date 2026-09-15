import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { connectVirtualKeyboard } from '../../../testing/app-keyboard';
import { installVirtualHid, selectProfile } from '../../../testing/virtual-keyboard';
import { deviceSession, deviceStore } from '../../device';
import {
  PROFILES_STORAGE_KEY,
  createDefaultProfile,
  initialProfileState,
  type ProfileState,
} from '../model/profiles';
import { profileActions, profileStore } from './profile-store';

const NOW = '2026-09-30T12:00:00.000Z';

function persisted(): unknown {
  return JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? 'null');
}

function activeProfileId(): number {
  return profileStore.getState().activeProfileId;
}

/** Lets queued packets and replies of the virtual keyboard run. */
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/** Resolves once the keyboard's reload (here: the first load) has ended. */
async function loaded(): Promise<void> {
  await vi.waitFor(() => {
    expect(deviceStore.getState()).toMatchObject({
      connection: { status: 'ready' },
      reloading: false,
    });
  });
}

async function connect() {
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);
  await loaded();
  return keyboard;
}

beforeEach(() => {
  profileStore.setState(initialProfileState(NOW), true);
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('profile store persistence', () => {
  async function loadFreshStore() {
    vi.resetModules();
    return import('./profile-store');
  }

  it('starts from the profiles stored under keyboard-profiles', async () => {
    const stored: ProfileState = {
      ...initialProfileState(NOW),
      activeProfileId: 3,
    };
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(stored));

    const fresh = await loadFreshStore();

    expect(fresh.profileStore.getState()).toEqual(stored);
  });

  it.each([['{not json'], ['{"profiles":42}'], ['[]']])(
    'starts from the default profiles when the stored value is %s',
    async value => {
      localStorage.setItem(PROFILES_STORAGE_KEY, value);

      const fresh = await loadFreshStore();

      const state = fresh.profileStore.getState();
      expect(state.profiles.map(profile => profile?.name ?? null)).toEqual([
        'Profile 1',
        'Profile 2',
        'Profile 3',
        'Profile 4',
        ...Array<null>(12).fill(null),
      ]);
      expect(state.activeProfileId).toBe(1);
      // Like the Svelte store, nothing is written before the first change.
      expect(localStorage.getItem(PROFILES_STORAGE_KEY)).toBe(value);
    }
  );

  it('persists every change in the Svelte schema', () => {
    profileActions.create('Profile 5');

    expect(persisted()).toEqual(profileStore.getState());
    expect(Object.keys(persisted() ?? {})).toEqual(['profiles', 'activeProfileId']);
  });

  it('does not write when an action changes nothing', () => {
    profileActions.delete(1);
    profileActions.restoreDefault(9);
    expect(localStorage.getItem(PROFILES_STORAGE_KEY)).toBeNull();
  });
});

describe('profile actions', () => {
  it('creates, duplicates, restores and deletes profiles', () => {
    profileActions.create('Profile 5');
    profileActions.duplicate(5);
    expect(profileStore.getState().profiles[5]?.name).toBe('Profile 5 (Copy)');

    profileActions.restoreDefault(6);
    expect(profileStore.getState().profiles[5]).toMatchObject({
      name: 'Profile 5 (Copy)',
      isDefault: false,
      lighting: {},
    });

    profileActions.delete(5);
    expect(profileStore.getState().profiles[4]).toBeNull();
  });

  it('imports and exports profile files', () => {
    profileActions.importFile(
      JSON.stringify({ ...createDefaultProfile(2, NOW), name: 'Shared' }),
      5
    );
    expect(profileStore.getState().profiles[4]).toMatchObject({ id: 5, name: 'Shared' });

    expect(JSON.parse(profileActions.exportFile(5) ?? 'null')).toEqual(
      profileStore.getState().profiles[4]
    );
    expect(profileActions.exportFile(6)).toBeNull();
    expect(() => {
      profileActions.importFile('nope', 6);
    }).toThrow(SyntaxError);
  });
});

describe('keyboard profiles (D7)', () => {
  it('switches the keyboard to profile 1–4 when it is activated', async () => {
    const keyboard = await connect();

    profileActions.activate(3);

    expect(activeProfileId()).toBe(3);
    await vi.waitFor(() => {
      expect(deviceStore.getState()).toMatchObject({
        reloading: false,
        config: { profileIndex: 2 },
      });
    });
    expect(keyboard.vk.state.profileIndex).toBe(2);
    expect(activeProfileId()).toBe(3);
  });

  it('only marks profiles 5–16 active, without asking the keyboard', async () => {
    const keyboard = await connect();
    profileActions.create('Profile 5');
    keyboard.vk.clearHistory();

    profileActions.activate(5);
    await settle();

    expect(activeProfileId()).toBe(5);
    expect(keyboard.vk.sentPackets).toEqual([]);
    expect(keyboard.vk.state.profileIndex).toBe(0);
  });

  it('does not switch the keyboard again for the profile that is already active', async () => {
    const keyboard = await connect();
    keyboard.vk.clearHistory();

    profileActions.activate(1);
    await settle();

    expect(keyboard.vk.sentPackets).toEqual([]);
  });

  it('follows a profile switched on the keyboard itself', async () => {
    const keyboard = await connect();

    selectProfile(keyboard.vk.state, 3);
    keyboard.vk.notifyConfigChanged();

    await vi.waitFor(() => {
      expect(activeProfileId()).toBe(4);
    });
  });

  it('returns from a local profile to the keyboard profile whenever the keyboard reloads', async () => {
    const keyboard = await connect();
    profileActions.create('Profile 5');
    profileActions.activate(5);

    keyboard.vk.notifyConfigChanged();

    await vi.waitFor(() => {
      expect(activeProfileId()).toBe(1);
    });
  });

  it('takes the keyboard profile when a keyboard connects', async () => {
    profileActions.create('Profile 5');
    profileActions.activate(5);
    const vk = installVirtualHid(navigator, { seedDynamicKeys: false });
    onTestFinished(() => {
      deviceSession.disconnect();
      vk.uninstall();
    });
    selectProfile(vk.state, 1);

    await deviceSession.connect();
    await loaded();

    expect(activeProfileId()).toBe(2);
  });
});
