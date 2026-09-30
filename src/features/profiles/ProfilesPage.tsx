import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { ConfirmationModal, ErrorModal } from '../../components/ui';
import { Transition, slide } from '../../lib/transitions';
import { AddProfileCard } from './components/AddProfileCard';
import { ProfileCard } from './components/ProfileCard';
import { ProfileMenu, type ProfileMenuPosition } from './components/ProfileMenu';
import { DEFAULT_PROFILE_COUNT, MAX_PROFILES, freeProfileSlot } from './model/profiles';
import { profileActions, profileStore, useProfileState } from './store/profile-store';

interface OpenMenu {
  readonly profileId: number;
  readonly position: ProfileMenuPosition;
}

/** Props of the closed menu, which is never rendered (hidden, or frozen while sliding out). */
const CLOSED_MENU: OpenMenu = { profileId: 0, position: { top: 0, right: 0 } };

function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** `/profiles/`: the 16 local profile slots (port of `routes/profiles/+page.svelte`). */
export function ProfilesPage() {
  const { profiles, activeProfileId } = useProfileState();

  // The first 4 default profiles are always shown; additional profiles (5-16) once created.
  const defaultProfiles = profiles.slice(0, DEFAULT_PROFILE_COUNT);
  const additionalProfiles = profiles
    .slice(DEFAULT_PROFILE_COUNT, MAX_PROFILES)
    .filter(profile => profile !== null);
  const totalProfileCount = profiles.filter(profile => profile !== null).length;
  const canAddMore = totalProfileCount < MAX_PROFILES;

  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<number | null>(null);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreProfileId, setRestoreProfileId] = useState<number | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInput = useRef<HTMLInputElement>(null);

  // Any click that reaches the window closes the menu (the menu and its buttons stop theirs).
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const nameOf = (profileId: number | null) =>
    profiles.find(profile => profile !== null && profile.id === profileId)?.name;

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const closeMenu = () => {
    setOpenMenu(null);
  };

  const toggleMenu = (profileId: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (openMenu?.profileId === profileId) {
      setOpenMenu(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setOpenMenu({
        profileId,
        position: { top: rect.bottom + 4, right: window.innerWidth - rect.right },
      });
    }
  };

  const resetFileInput = () => {
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const targetSlot = freeProfileSlot(profileStore.getState());
        if (targetSlot === null) {
          showError('No available profile slots. Maximum 16 profiles reached.');
          return;
        }
        profileActions.importFile(content, targetSlot);
      } catch (error) {
        showError(
          `Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        resetFileInput();
      }
    };
    reader.onerror = () => {
      showError('Failed to read the file. Please try again.');
      resetFileInput();
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    fileInput.current?.click();
  };

  const setActive = (profileId: number) => {
    profileActions.activate(profileId);
    closeMenu();
  };

  const exportProfile = (profileId: number) => {
    const json = profileActions.exportFile(profileId);
    if (json === null) return;
    downloadJson(json, `${nameOf(profileId) || 'profile'}.json`);
    closeMenu();
  };

  const addNewProfile = () => {
    if (!canAddMore) {
      showError('Maximum 16 profiles reached');
      return;
    }
    const nextSlot = freeProfileSlot(profileStore.getState());
    if (nextSlot !== null) profileActions.create(`Profile ${nextSlot}`);
  };

  const showDuplicateDialog = (sourceId: number) => {
    if (!canAddMore) {
      showError('Maximum 16 profiles reached');
      return;
    }
    setDuplicateSourceId(sourceId);
    setShowDuplicateModal(true);
    closeMenu();
  };

  const executeDuplicate = () => {
    if (duplicateSourceId === null) return;
    profileActions.duplicate(duplicateSourceId);
    setShowDuplicateModal(false);
    setDuplicateSourceId(null);
  };

  const showRestoreDialog = (profileId: number) => {
    setRestoreProfileId(profileId);
    setShowRestoreModal(true);
    closeMenu();
  };

  const executeRestore = () => {
    if (restoreProfileId === null) return;
    profileActions.restoreDefault(restoreProfileId);
    setShowRestoreModal(false);
    setRestoreProfileId(null);
  };

  const deleteProfile = (profileId: number) => {
    if (profileId === activeProfileId) {
      showError('Cannot delete the active profile. Please activate another profile first.');
      return;
    }
    if (profileId <= DEFAULT_PROFILE_COUNT) {
      showError('Cannot delete default profiles (1-4)');
      return;
    }
    profileActions.delete(profileId);
    closeMenu();
  };

  const menu = openMenu ?? CLOSED_MENU;

  return (
    <>
      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json"
        ref={fileInput}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Import profile"
      />

      <div className="w-full max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configure Profiles</h1>
            <button
              type="button"
              onClick={triggerImport}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg glassmorphism-button flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Import Profile
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your keyboard profiles here. You can import, export, and customize them.
          </p>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Default Profiles (1-4) - Always shown */}
          {defaultProfiles.map((profile, index) => (
            <ProfileCard
              key={index}
              profile={profile}
              index={index}
              isActive={profile?.id === activeProfileId}
              menuOpen={profile !== null && openMenu?.profileId === profile.id}
              onActivate={() => {
                if (profile) setActive(profile.id);
              }}
              onMenuClick={event => {
                if (profile) toggleMenu(profile.id, event);
              }}
            />
          ))}

          {/* Additional Profiles (5-16) - Only shown if created */}
          {additionalProfiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              index={index + DEFAULT_PROFILE_COUNT}
              isActive={profile.id === activeProfileId}
              menuOpen={openMenu?.profileId === profile.id}
              onActivate={() => {
                setActive(profile.id);
              }}
              onMenuClick={event => {
                toggleMenu(profile.id, event);
              }}
            />
          ))}

          {/* Add Profile Button - Only show if we can add more */}
          {canAddMore && <AddProfileCard onAdd={addNewProfile} />}
        </div>
      </div>

      {/* Profile Menu */}
      <Transition show={openMenu !== null} transition={[slide, { duration: 150, axis: 'y' }]}>
        <ProfileMenu
          position={menu.position}
          isActive={menu.profileId === activeProfileId}
          canDelete={menu.profileId > DEFAULT_PROFILE_COUNT}
          onExport={() => {
            exportProfile(menu.profileId);
          }}
          onDuplicate={() => {
            showDuplicateDialog(menu.profileId);
          }}
          onRestore={() => {
            showRestoreDialog(menu.profileId);
          }}
          onDelete={() => {
            deleteProfile(menu.profileId);
          }}
        />
      </Transition>

      {/* Duplicate Modal */}
      <ConfirmationModal
        open={showDuplicateModal && duplicateSourceId !== null}
        title="Duplicate Profile"
        message={
          <>
            Create a copy of <strong className="text-white">{nameOf(duplicateSourceId)}</strong> in
            the next available slot?
          </>
        }
        confirmText="Duplicate"
        confirmColor="blue"
        onConfirm={executeDuplicate}
        onCancel={() => {
          setShowDuplicateModal(false);
        }}
      />

      {/* Restore Default Modal */}
      <ConfirmationModal
        open={showRestoreModal && restoreProfileId !== null}
        title="Restore to Default"
        message={
          <>
            Are you sure you want to restore{' '}
            <strong className="text-white">{nameOf(restoreProfileId)}</strong> to its default
            settings? This action cannot be undone.
          </>
        }
        confirmText="Restore"
        confirmColor="orange"
        onConfirm={executeRestore}
        onCancel={() => {
          setShowRestoreModal(false);
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        open={showErrorModal}
        message={errorMessage}
        onClose={() => {
          setShowErrorModal(false);
        }}
      />
    </>
  );
}
