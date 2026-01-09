import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Profile {
  id: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  isDefault: boolean;
  // Add your keyboard configuration data here
  keyMappings?: any;
  lighting?: any;
  performance?: any;
  advancedKeys?: any;
}

interface ProfileState {
  profiles: (Profile | null)[];
  activeProfileId: number;
}

const MAX_PROFILES = 16;

// Create default profile
const createDefaultProfile = (id: number): Profile => ({
  id,
  name: `Profile ${id}`,
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  isDefault: id === 1,
  keyMappings: {},
  lighting: {},
  performance: {},
  advancedKeys: {},
});

// Initialize profile store
const createProfileStore = () => {
  const storedValue = browser ? localStorage.getItem('keyboard-profiles') : null;

  let initialState: ProfileState;

  if (storedValue) {
    try {
      initialState = JSON.parse(storedValue);
      // Ensure first 4 profiles always exist (default profiles)
      for (let i = 0; i < 4; i++) {
        if (!initialState.profiles[i]) {
          initialState.profiles[i] = createDefaultProfile(i + 1);
        }
      }
    } catch {
      initialState = {
        profiles: Array(MAX_PROFILES).fill(null),
        activeProfileId: 1,
      };
      // Create first 4 default profiles
      for (let i = 0; i < 4; i++) {
        initialState.profiles[i] = createDefaultProfile(i + 1);
      }
    }
  } else {
    initialState = {
      profiles: Array(MAX_PROFILES).fill(null),
      activeProfileId: 1,
    };
    // Create first 4 default profiles
    for (let i = 0; i < 4; i++) {
      initialState.profiles[i] = createDefaultProfile(i + 1);
    }
  }

  const { subscribe, set, update } = writable<ProfileState>(initialState);

  const saveToLocalStorage = (state: ProfileState) => {
    if (browser) {
      localStorage.setItem('keyboard-profiles', JSON.stringify(state));
    }
  };

  return {
    subscribe,

    // Create a new profile
    createProfile: (name?: string) => {
      update(state => {
        const emptySlotIndex = state.profiles.findIndex(p => p === null);
        if (emptySlotIndex === -1) {
          console.error('No empty profile slots available');
          return state;
        }

        const newProfile = createDefaultProfile(emptySlotIndex + 1);
        if (name) {
          newProfile.name = name;
        }

        const newProfiles = [...state.profiles];
        newProfiles[emptySlotIndex] = newProfile;

        const newState = {
          ...state,
          profiles: newProfiles,
        };

        saveToLocalStorage(newState);
        return newState;
      });
    },

    // Update a profile
    updateProfile: (id: number, updates: Partial<Profile>) => {
      update(state => {
        const profileIndex = state.profiles.findIndex(p => p?.id === id);
        if (profileIndex === -1) return state;

        const profile = state.profiles[profileIndex];
        if (!profile) return state;

        state.profiles[profileIndex] = {
          ...profile,
          ...updates,
          modifiedAt: new Date().toISOString(),
        };

        saveToLocalStorage(state);
        return state;
      });
    },

    // Delete a profile
    deleteProfile: (id: number) => {
      update(state => {
        const profileIndex = state.profiles.findIndex(p => p?.id === id);
        if (profileIndex === -1) return state;

        // Don't allow deleting the active profile
        if (state.activeProfileId === id) {
          console.error('Cannot delete active profile');
          return state;
        }

        // Don't allow deleting default profiles (1-4)
        if (id <= 4) {
          console.error('Cannot delete default profiles 1-4');
          return state;
        }

        const newProfiles = [...state.profiles];
        newProfiles[profileIndex] = null;

        const newState = {
          ...state,
          profiles: newProfiles,
        };

        saveToLocalStorage(newState);
        return newState;
      });
    },

    // Set active profile
    setActiveProfile: (id: number) => {
      update(state => {
        const profile = state.profiles.find(p => p?.id === id);
        if (!profile) {
          console.error('Profile not found');
          return state;
        }

        state.activeProfileId = id;
        saveToLocalStorage(state);
        return state;
      });
    },

    // Duplicate profile from another profile
    duplicateProfile: (sourceId: number, targetSlot?: number) => {
      update(state => {
        const sourceProfile = state.profiles.find(p => p?.id === sourceId);
        if (!sourceProfile) {
          console.error('Source profile not found');
          return state;
        }

        let emptySlotIndex =
          targetSlot !== undefined ? targetSlot - 1 : state.profiles.findIndex(p => p === null);
        if (emptySlotIndex === -1 || state.profiles[emptySlotIndex] !== null) {
          console.error('No empty profile slot available');
          return state;
        }

        const duplicatedProfile: Profile = {
          ...JSON.parse(JSON.stringify(sourceProfile)),
          id: emptySlotIndex + 1,
          name: `${sourceProfile.name} (Copy)`,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          isDefault: false,
        };

        const newProfiles = [...state.profiles];
        newProfiles[emptySlotIndex] = duplicatedProfile;

        const newState = {
          ...state,
          profiles: newProfiles,
        };

        saveToLocalStorage(newState);
        return newState;
      });
    },

    // Restore profile to default
    restoreDefault: (id: number) => {
      update(state => {
        const profileIndex = state.profiles.findIndex(p => p?.id === id);
        if (profileIndex === -1) return state;

        const profile = state.profiles[profileIndex];
        if (!profile) return state;

        state.profiles[profileIndex] = {
          ...createDefaultProfile(id),
          name: profile.name,
          createdAt: profile.createdAt,
        };

        saveToLocalStorage(state);
        return state;
      });
    },

    // Export profile to JSON
    exportProfile: (id: number): string | null => {
      let result: string | null = null;

      update(state => {
        const profile = state.profiles.find(p => p?.id === id);
        if (!profile) {
          console.error('Profile not found');
          return state;
        }

        result = JSON.stringify(profile, null, 2);
        return state;
      });

      return result;
    },

    // Import profile from JSON
    importProfile: (jsonString: string, targetSlot?: number) => {
      update(state => {
        try {
          const importedProfile = JSON.parse(jsonString) as Profile;

          let emptySlotIndex =
            targetSlot !== undefined ? targetSlot - 1 : state.profiles.findIndex(p => p === null);
          if (emptySlotIndex === -1) {
            console.error('No empty profile slot available');
            return state;
          }

          // Update the imported profile with new ID and timestamps
          importedProfile.id = emptySlotIndex + 1;
          importedProfile.createdAt = new Date().toISOString();
          importedProfile.modifiedAt = new Date().toISOString();
          importedProfile.isDefault = false;

          state.profiles[emptySlotIndex] = importedProfile;
          saveToLocalStorage(state);
        } catch (error) {
          console.error('Failed to import profile:', error);
        }

        return state;
      });
    },

    // Get active profile
    getActiveProfile: (): Promise<Profile | null> => {
      return new Promise(resolve => {
        let activeProfile: Profile | null = null;

        update(state => {
          activeProfile = state.profiles.find(p => p?.id === state.activeProfileId) || null;
          return state;
        });

        resolve(activeProfile);
      });
    },
  };
};

export const profileStore = createProfileStore();
