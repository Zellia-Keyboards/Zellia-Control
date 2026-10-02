import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE_COUNT,
  INVALID_PROFILE_FILE,
  MAX_PROFILES,
  createDefaultProfile,
  createProfile,
  deleteProfile,
  duplicateProfile,
  exportProfile,
  freeProfileSlot,
  importProfile,
  initialProfileState,
  parseProfileState,
  restoreDefault,
  setActiveProfile,
  type Profile,
  type ProfileState,
} from './profiles';

const NOW = '2026-09-30T12:00:00.000Z';
const LATER = '2026-10-01T08:30:00.000Z';

/** A profile as the Svelte store wrote it (`createDefaultProfile`, then renamed). */
function stored(id: number, name = `Profile ${id}`, extra: Partial<Profile> = {}): Profile {
  return {
    id,
    name,
    createdAt: NOW,
    modifiedAt: NOW,
    isDefault: id === 1,
    keyMappings: {},
    lighting: {},
    performance: {},
    advancedKeys: {},
    ...extra,
  };
}

/** The initial state plus profiles in the given additional slots (5–16). */
function withSlots(...ids: number[]): ProfileState {
  const state = initialProfileState(NOW);
  return {
    ...state,
    profiles: state.profiles.map((profile, index) =>
      ids.includes(index + 1) ? stored(index + 1) : profile
    ),
  };
}

function full(): ProfileState {
  return withSlots(5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
}

function names(state: ProfileState): (string | null)[] {
  return state.profiles.map(profile => profile?.name ?? null);
}

describe('initial state', () => {
  it('has 16 slots with the four default profiles and profile 1 active', () => {
    const state = initialProfileState(NOW);

    expect(state.profiles).toHaveLength(MAX_PROFILES);
    expect(state.profiles.slice(0, DEFAULT_PROFILE_COUNT)).toEqual([
      stored(1),
      stored(2),
      stored(3),
      stored(4),
    ]);
    expect(state.profiles.slice(DEFAULT_PROFILE_COUNT)).toEqual(Array(12).fill(null));
    expect(state.activeProfileId).toBe(1);
  });

  it('builds default profiles like the Svelte store (only profile 1 is the default)', () => {
    expect(createDefaultProfile(3, NOW)).toEqual({
      id: 3,
      name: 'Profile 3',
      createdAt: NOW,
      modifiedAt: NOW,
      isDefault: false,
      keyMappings: {},
      lighting: {},
      performance: {},
      advancedKeys: {},
    });
    expect(createDefaultProfile(1, NOW).isDefault).toBe(true);
  });
});

describe('parseProfileState (keyboard-profiles)', () => {
  it('reads a state stored by the Svelte app unchanged', () => {
    const svelteState = {
      profiles: [
        stored(1),
        stored(2),
        stored(3, 'Gaming'),
        stored(4),
        stored(5, 'Profile 2 (Copy)', { isDefault: false, lighting: { mode: 3 } }),
        ...Array<null>(11).fill(null),
      ],
      activeProfileId: 5,
    };
    const parsed = parseProfileState(JSON.parse(JSON.stringify(svelteState)), LATER);

    expect(parsed).toEqual(svelteState);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(svelteState));
  });

  it.each([
    ['a number', 42],
    ['null', null],
    ['an array', []],
    ['an object without profiles', { activeProfileId: 2 }],
    ['profiles that are not an array', { profiles: {}, activeProfileId: 1 }],
  ])('rejects %s, so the store starts from the defaults', (_label, value) => {
    expect(() => parseProfileState(value, NOW)).toThrow(TypeError);
  });

  it('restores missing default profiles, as the Svelte store did on load', () => {
    const parsed = parseProfileState(
      { profiles: [null, stored(2, 'Work'), undefined, 'garbage'], activeProfileId: 2 },
      LATER
    );

    expect(parsed.profiles.slice(0, 4)).toEqual([
      createDefaultProfile(1, LATER),
      stored(2, 'Work'),
      createDefaultProfile(3, LATER),
      createDefaultProfile(4, LATER),
    ]);
    expect(parsed.profiles).toHaveLength(MAX_PROFILES);
    expect(parsed.activeProfileId).toBe(2);
  });

  it('keeps exactly 16 slots and drops entries that are not profiles', () => {
    const profiles: unknown[] = [stored(1), stored(2), stored(3), stored(4)];
    profiles[5] = { name: 'No dates' };
    profiles[6] = stored(7, 'Kept');
    profiles[20] = stored(21, 'Beyond the last slot');

    const parsed = parseProfileState({ profiles, activeProfileId: 1 }, NOW);

    expect(names(parsed)).toEqual([
      'Profile 1',
      'Profile 2',
      'Profile 3',
      'Profile 4',
      null,
      null,
      'Kept',
      ...Array<null>(9).fill(null),
    ]);
  });

  it('gives every profile the id of its slot', () => {
    const parsed = parseProfileState(
      {
        profiles: [stored(1), stored(2), stored(3), stored(4), stored(9, 'Moved')],
        activeProfileId: 1,
      },
      NOW
    );
    expect(parsed.profiles[4]).toEqual(stored(5, 'Moved', { isDefault: false }));
  });

  it('keeps the configuration fields as stored and omits absent ones', () => {
    const { keyMappings: _k, lighting: _l, ...bare } = stored(5, 'Bare');
    const parsed = parseProfileState(
      {
        profiles: [stored(1), stored(2), stored(3), stored(4), { ...bare, performance: [1, 2] }],
        activeProfileId: 1,
      },
      NOW
    );
    expect(parsed.profiles[4]).toStrictEqual({ ...bare, isDefault: false, performance: [1, 2] });
  });

  it.each([['2'], [0], [17], [2.5], [null]])('falls back to profile 1 for the active id %j', id => {
    const parsed = parseProfileState({ profiles: [], activeProfileId: id }, NOW);
    expect(parsed.activeProfileId).toBe(1);
  });

  it('keeps an active id whose slot is empty (the dropdown then shows "No Profile")', () => {
    expect(parseProfileState({ profiles: [], activeProfileId: 9 }, NOW).activeProfileId).toBe(9);
  });
});

describe('createProfile', () => {
  it('fills the first empty slot with the given name', () => {
    const state = createProfile(withSlots(5, 7), 'Profile 6', LATER);
    expect(state.profiles[5]).toEqual({ ...createDefaultProfile(6, LATER), name: 'Profile 6' });
    expect(names(state).filter(name => name !== null)).toHaveLength(7);
  });

  it('keeps the default name without one', () => {
    expect(createProfile(withSlots(), undefined, NOW).profiles[4]?.name).toBe('Profile 5');
  });

  it('changes nothing when all 16 slots are used', () => {
    const state = full();
    expect(createProfile(state, 'Profile 17', NOW)).toBe(state);
  });
});

describe('deleteProfile', () => {
  it('empties an additional profile slot', () => {
    const state = deleteProfile(withSlots(5, 6), 5);
    expect(names(state).slice(4, 6)).toEqual([null, 'Profile 6']);
  });

  it('refuses the active profile, default profiles and unknown ids', () => {
    const active = { ...withSlots(5), activeProfileId: 5 };
    expect(deleteProfile(active, 5)).toBe(active);
    const defaults = withSlots(5);
    expect(deleteProfile(defaults, 4)).toBe(defaults);
    expect(deleteProfile(defaults, 6)).toBe(defaults);
  });
});

describe('setActiveProfile', () => {
  it('marks an existing profile active', () => {
    expect(setActiveProfile(withSlots(5), 5).activeProfileId).toBe(5);
    expect(setActiveProfile(withSlots(), 3).activeProfileId).toBe(3);
  });

  it('changes nothing for an empty slot or the already active profile', () => {
    const state = withSlots();
    expect(setActiveProfile(state, 5)).toBe(state);
    expect(setActiveProfile(state, 1)).toBe(state);
  });
});

describe('duplicateProfile', () => {
  it('copies the profile into the first empty slot with " (Copy)" and new dates', () => {
    const source = stored(2, 'Work', { lighting: { mode: 4 } });
    const base = withSlots(5);
    const state = duplicateProfile(
      {
        ...base,
        profiles: base.profiles.map((profile, index) => (index === 1 ? source : profile)),
      },
      2,
      LATER
    );

    expect(state.profiles[5]).toEqual({
      ...source,
      id: 6,
      name: 'Work (Copy)',
      createdAt: LATER,
      modifiedAt: LATER,
      isDefault: false,
    });
    expect(state.profiles[1]).toBe(source);
  });

  it('changes nothing when all slots are used or the source does not exist', () => {
    const state = full();
    expect(duplicateProfile(state, 2, NOW)).toBe(state);
    const empty = withSlots();
    expect(duplicateProfile(empty, 9, NOW)).toBe(empty);
  });
});

describe('restoreDefault', () => {
  it('resets the configuration and modification date, keeping name and creation date', () => {
    const base = withSlots();
    const tuned = stored(3, 'Gaming', { lighting: { mode: 2 }, keyMappings: { 1: 4 } });
    const state = restoreDefault(
      { ...base, profiles: base.profiles.map((profile, index) => (index === 2 ? tuned : profile)) },
      3,
      LATER
    );

    expect(state.profiles[2]).toEqual({
      ...createDefaultProfile(3, LATER),
      name: 'Gaming',
      createdAt: NOW,
    });
  });

  it('changes nothing for an empty slot', () => {
    const state = withSlots();
    expect(restoreDefault(state, 8, NOW)).toBe(state);
  });
});

describe('exportProfile', () => {
  it('serializes the profile as indented JSON', () => {
    expect(exportProfile(withSlots(), 2)).toBe(JSON.stringify(stored(2), null, 2));
  });

  it('returns null for an empty slot', () => {
    expect(exportProfile(withSlots(), 5)).toBeNull();
  });
});

describe('importProfile', () => {
  it('stores the file in the slot with its id, new dates and not as a default', () => {
    const file = JSON.stringify(stored(1, 'Shared', { performance: { actuation: 0.5 } }), null, 2);
    const state = importProfile(withSlots(5), file, 6, LATER);

    expect(state.profiles[5]).toEqual({
      ...stored(6, 'Shared', { performance: { actuation: 0.5 } }),
      createdAt: LATER,
      modifiedAt: LATER,
      isDefault: false,
    });
  });

  it('accepts a file with only a name', () => {
    const state = importProfile(withSlots(), '{"name":"Minimal"}', 5, NOW);
    expect(state.profiles[4]).toStrictEqual({
      id: 5,
      name: 'Minimal',
      createdAt: NOW,
      modifiedAt: NOW,
      isDefault: false,
    });
  });

  it('rejects files that are not JSON', () => {
    expect(() => importProfile(withSlots(), 'not json', 5, NOW)).toThrow(SyntaxError);
  });

  it.each([['[]'], ['null'], ['"Profile"'], ['{"id":5}'], ['{"name":5}']])(
    'rejects %s as not a profile',
    file => {
      expect(() => importProfile(withSlots(), file, 5, NOW)).toThrow(INVALID_PROFILE_FILE);
    }
  );

  it('rejects a slot that is taken or does not exist', () => {
    const file = '{"name":"Shared"}';
    expect(() => importProfile(withSlots(5), file, 5, NOW)).toThrow(RangeError);
    expect(() => importProfile(withSlots(), file, 2, NOW)).toThrow(RangeError);
    expect(() => importProfile(withSlots(), file, 17, NOW)).toThrow(RangeError);
  });
});

describe('freeProfileSlot', () => {
  it('is the first empty additional slot', () => {
    expect(freeProfileSlot(withSlots())).toBe(5);
    expect(freeProfileSlot(withSlots(5, 6, 8))).toBe(7);
  });

  it('is null when all 16 slots are used', () => {
    expect(freeProfileSlot(full())).toBeNull();
  });
});
