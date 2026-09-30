/**
 * The app's profile records (Svelte `ProfileStore`): a Zustand store persisted under
 * `keyboard-profiles` with the Svelte schema, validated when read. It also keeps the active
 * profile in step with the keyboard (spec D7), for as long as the app runs.
 */
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { readJson, writeJson } from '../../../lib/storage';
import { deviceSession, deviceStore, type DeviceConfig, type DeviceState } from '../../device';
import {
  DEFAULT_PROFILE_COUNT,
  PROFILES_STORAGE_KEY,
  createProfile,
  deleteProfile,
  duplicateProfile,
  exportProfile,
  importProfile,
  initialProfileState,
  parseProfileState,
  restoreDefault,
  setActiveProfile,
  type ProfileState,
} from '../model/profiles';

export type ProfileStore = StoreApi<ProfileState>;

function now(): string {
  return new Date().toISOString();
}

/** Nothing is written at startup: like the Svelte store, the first change persists the state. */
export const profileStore: ProfileStore = createStore<ProfileState>()(() =>
  readJson(
    PROFILES_STORAGE_KEY,
    value => parseProfileState(value, now()),
    initialProfileState(now())
  )
);

profileStore.subscribe(state => {
  writeJson(PROFILES_STORAGE_KEY, state);
});

function update(transition: (state: ProfileState) => ProfileState): void {
  const state = profileStore.getState();
  const next = transition(state);
  if (next !== state) profileStore.setState(next, true);
}

/** The Profiles page's and the toolbar dropdown's actions (failures change nothing). */
export const profileActions = {
  create(name?: string): void {
    update(state => createProfile(state, name, now()));
  },
  delete(id: number): void {
    update(state => deleteProfile(state, id));
  },
  duplicate(sourceId: number): void {
    update(state => duplicateProfile(state, sourceId, now()));
  },
  restoreDefault(id: number): void {
    update(state => restoreDefault(state, id, now()));
  },
  /** Stores a profile file in the empty `slot`; throws when the file is not a profile. */
  importFile(json: string, slot: number): void {
    update(state => importProfile(state, json, slot, now()));
  },
  /** The profile file content, or null for an empty slot. */
  exportFile(id: number): string | null {
    return exportProfile(profileStore.getState(), id);
  },
  /**
   * Makes a profile active (D7). Profiles 1–4 are the keyboard's own: activating one switches the
   * keyboard to it. Profiles 5–16 are local records: activating one only marks it active.
   */
  activate(id: number): void {
    const state = profileStore.getState();
    const next = setActiveProfile(state, id);
    if (next === state) return;
    profileStore.setState(next, true);
    if (id <= DEFAULT_PROFILE_COUNT) void deviceSession.switchProfile(id - 1);
  },
};

type DeviceStoreApi = Pick<StoreApi<DeviceState>, 'getState' | 'subscribe'>;

/**
 * D7: after every completed keyboard load — the first one after connecting, profile switches,
 * reloads the keyboard starts itself — the active profile is the keyboard's (`profileIndex + 1`),
 * also when a local profile (5–16) was active. A load has completed when the device store stops
 * reloading with a configuration; a keyboard that has already loaded is followed at once.
 */
export function followKeyboardProfile(profiles: ProfileStore, device: DeviceStoreApi): () => void {
  const follow = (config: DeviceConfig) => {
    const state = profiles.getState();
    const next = setActiveProfile(state, config.profileIndex + 1);
    if (next !== state) profiles.setState(next, true);
  };
  const { config, reloading } = device.getState();
  if (config && !reloading) follow(config);
  return device.subscribe((state, previous) => {
    if (state.config && !state.reloading && (previous.reloading || !previous.config)) {
      follow(state.config);
    }
  });
}

// For the app's lifetime, from the first import of the profiles feature on.
followKeyboardProfile(profileStore, deviceStore);

export function useProfileState(): ProfileState {
  return useStore(profileStore);
}
