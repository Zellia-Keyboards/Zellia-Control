/**
 * Local profile records (port of the Svelte `ProfileStore`), as pure functions over an immutable
 * state. The state keeps the Svelte schema, stored as JSON under `keyboard-profiles`:
 * `{ profiles: (Profile | null)[16], activeProfileId }`, where a profile's `id` is its slot
 * number (1–16). Slots 1–4 always hold a profile: they stand for the keyboard's four firmware
 * profiles (spec D7); slots 5–16 are optional local records.
 *
 * Every transition returns the same state object when it changes nothing, so a store only
 * notifies (and persists) real changes, like the Svelte store only saved successful updates.
 */

export const PROFILES_STORAGE_KEY = 'keyboard-profiles';
export const MAX_PROFILES = 16;
/** Slots 1–4, which always exist and mirror the keyboard's firmware profiles. */
export const DEFAULT_PROFILE_COUNT = 4;
/** Why an imported file was rejected (shown after "Failed to import profile: "). */
export const INVALID_PROFILE_FILE = 'Invalid profile file';

export interface Profile {
  /** Slot number, 1–16. */
  readonly id: number;
  readonly name: string;
  /** ISO 8601 timestamps. */
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly isDefault: boolean;
  /** Configuration snapshots reserved by the Svelte schema (`{}` so far), kept as stored. */
  readonly keyMappings?: unknown;
  readonly lighting?: unknown;
  readonly performance?: unknown;
  readonly advancedKeys?: unknown;
}

export interface ProfileState {
  /** Always {@link MAX_PROFILES} slots; `null` is an empty slot. */
  readonly profiles: readonly (Profile | null)[];
  /** Id of the active profile (its slot may be empty in stored data). */
  readonly activeProfileId: number;
}

const DATA_FIELDS = ['keyMappings', 'lighting', 'performance', 'advancedKeys'] as const;
type DataField = (typeof DATA_FIELDS)[number];

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The configuration fields present in `record`, in schema order. */
function dataFieldsOf(record: JsonRecord): Partial<Record<DataField, unknown>> {
  const data: Partial<Record<DataField, unknown>> = {};
  for (const field of DATA_FIELDS) {
    const value = record[field];
    if (value !== undefined) data[field] = value;
  }
  return data;
}

export function createDefaultProfile(id: number, now: string): Profile {
  return {
    id,
    name: `Profile ${id}`,
    createdAt: now,
    modifiedAt: now,
    isDefault: id === 1,
    keyMappings: {},
    lighting: {},
    performance: {},
    advancedKeys: {},
  };
}

/** Sixteen slots with the four default profiles, profile 1 active. */
export function initialProfileState(now: string): ProfileState {
  return {
    profiles: Array.from({ length: MAX_PROFILES }, (_, index) =>
      index < DEFAULT_PROFILE_COUNT ? createDefaultProfile(index + 1, now) : null
    ),
    activeProfileId: 1,
  };
}

/** A stored profile for slot `id`, or null when `value` is not one. */
function parseProfile(value: unknown, id: number): Profile | null {
  if (!isRecord(value)) return null;
  const { name, createdAt, modifiedAt, isDefault } = value;
  if (
    typeof name !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof modifiedAt !== 'string' ||
    typeof isDefault !== 'boolean'
  ) {
    return null;
  }
  return { id, name, createdAt, modifiedAt, isDefault, ...dataFieldsOf(value) };
}

function parseActiveProfileId(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_PROFILES
    ? value
    : 1;
}

/**
 * Validates a `keyboard-profiles` value (the storage boundary). Throws when it is not a profile
 * state at all, so the store starts from the defaults (as the Svelte store did for unreadable
 * data). Otherwise the state is normalized: exactly 16 slots, entries that are not profiles are
 * dropped, missing default profiles (slots 1–4) are recreated like the Svelte store did on load,
 * each profile's id is its slot, and an invalid active id falls back to 1.
 */
export function parseProfileState(value: unknown, now: string): ProfileState {
  if (!isRecord(value)) throw new TypeError('Stored profiles are not an object');
  const stored: unknown = value.profiles;
  if (!Array.isArray(stored)) throw new TypeError('Stored profiles have no profile list');
  const slots: readonly unknown[] = stored;
  return {
    profiles: Array.from({ length: MAX_PROFILES }, (_, index) => {
      const id = index + 1;
      const profile = parseProfile(slots[index], id);
      if (profile) return profile;
      return id <= DEFAULT_PROFILE_COUNT ? createDefaultProfile(id, now) : null;
    }),
    activeProfileId: parseActiveProfileId(value.activeProfileId),
  };
}

function findProfile(state: ProfileState, id: number): Profile | undefined {
  return state.profiles.find(profile => profile?.id === id) ?? undefined;
}

function withProfile(state: ProfileState, index: number, profile: Profile | null): ProfileState {
  return {
    ...state,
    profiles: state.profiles.map((current, slot) => (slot === index ? profile : current)),
  };
}

function firstEmptyIndex(state: ProfileState): number {
  return state.profiles.findIndex(profile => profile === null);
}

/** The first empty slot for a new local profile (5–16), or null when all 16 are used. */
export function freeProfileSlot(state: ProfileState): number | null {
  const index = state.profiles.findIndex(
    (profile, slot) => slot >= DEFAULT_PROFILE_COUNT && profile === null
  );
  return index === -1 ? null : index + 1;
}

/** A default profile in the first empty slot, named `name` when given. */
export function createProfile(
  state: ProfileState,
  name: string | undefined,
  now: string
): ProfileState {
  const index = firstEmptyIndex(state);
  if (index === -1) return state;
  const profile = createDefaultProfile(index + 1, now);
  return withProfile(state, index, name ? { ...profile, name } : profile);
}

/** Empties the profile's slot; the active profile and profiles 1–4 cannot be deleted. */
export function deleteProfile(state: ProfileState, id: number): ProfileState {
  const index = state.profiles.findIndex(profile => profile?.id === id);
  if (index === -1 || state.activeProfileId === id || id <= DEFAULT_PROFILE_COUNT) return state;
  return withProfile(state, index, null);
}

export function setActiveProfile(state: ProfileState, id: number): ProfileState {
  if (state.activeProfileId === id || !findProfile(state, id)) return state;
  return { ...state, activeProfileId: id };
}

/** Copies the profile into the first empty slot as "<name> (Copy)". */
export function duplicateProfile(state: ProfileState, sourceId: number, now: string): ProfileState {
  const source = findProfile(state, sourceId);
  const index = firstEmptyIndex(state);
  if (!source || index === -1) return state;
  return withProfile(state, index, {
    ...source,
    id: index + 1,
    name: `${source.name} (Copy)`,
    createdAt: now,
    modifiedAt: now,
    isDefault: false,
  });
}

/** Resets the profile's configuration, keeping its name and creation date. */
export function restoreDefault(state: ProfileState, id: number, now: string): ProfileState {
  const index = state.profiles.findIndex(profile => profile?.id === id);
  const profile = state.profiles[index];
  if (!profile) return state;
  return withProfile(state, index, {
    ...createDefaultProfile(id, now),
    name: profile.name,
    createdAt: profile.createdAt,
  });
}

/** The profile file content (indented JSON), or null for an empty slot. */
export function exportProfile(state: ProfileState, id: number): string | null {
  const profile = findProfile(state, id);
  return profile ? JSON.stringify(profile, null, 2) : null;
}

/**
 * Stores a profile file in the empty slot `slot` with new dates, not as a default. Throws a
 * `SyntaxError` for a file that is not JSON, and `INVALID_PROFILE_FILE` when it is not a profile
 * (an object with a string `name`); the other profile fields are taken from the file when present.
 */
export function importProfile(
  state: ProfileState,
  json: string,
  slot: number,
  now: string
): ProfileState {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new TypeError(INVALID_PROFILE_FILE);
  }
  const index = slot - 1;
  if (!Number.isInteger(slot) || state.profiles[index] !== null) {
    throw new RangeError(`Profile slot ${slot} is not free`);
  }
  return withProfile(state, index, {
    id: slot,
    name: value.name,
    createdAt: now,
    modifiedAt: now,
    isDefault: false,
    ...dataFieldsOf(value),
  });
}
