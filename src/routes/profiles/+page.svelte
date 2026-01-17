<script lang="ts">
  import { profileStore } from '$lib/stores/ProfileStore.svelte';
  import ProfileCard from '$lib/components/profiles/ProfileCard.svelte';
  import AddProfileCard from '$lib/components/profiles/AddProfileCard.svelte';
  import ProfileMenu from '$lib/components/profiles/ProfileMenu.svelte';
  import ConfirmationModal from '$lib/components/profiles/ConfirmationModal.svelte';
  import ErrorModal from '$lib/components/profiles/ErrorModal.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';

  let profiles = $derived($profileStore.profiles);
  let activeProfileId = $derived($profileStore.activeProfileId);

  // Get first 4 default profiles
  let defaultProfiles = $derived(profiles.slice(0, 4));

  // Get additional profiles (5-16)
  let additionalProfiles = $derived(profiles.slice(4, 16).filter(p => p !== null));

  // Count total number of profiles
  let totalProfileCount = $derived(profiles.filter(p => p !== null).length);
  let canAddMore = $derived(totalProfileCount < 16);

  let openMenuId = $state<number | null>(null);
  let menuPosition = $state<{ top: number; right: number } | null>(null);

  // Modal states
  let showDuplicateModal = $state(false);
  let duplicateSourceId = $state<number | null>(null);

  let showRestoreModal = $state(false);
  let restoreProfileId = $state<number | null>(null);

  let showErrorModal = $state(false);
  let errorMessage = $state('');

  let fileInput: HTMLInputElement | undefined;

  function toggleMenu(profileId: number, event: MouseEvent) {
    event.stopPropagation();
    if (openMenuId === profileId) {
      openMenuId = null;
      menuPosition = null;
    } else {
      openMenuId = profileId;
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      menuPosition = {
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      };
    }
  }

  function handleOutsideClick() {
    openMenuId = null;
    menuPosition = null;
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string;
        const targetSlot = profiles.findIndex((p, idx) => idx >= 4 && p === null);
        
        if (targetSlot === -1) {
          errorMessage = 'No available profile slots. Maximum 16 profiles reached.';
          showErrorModal = true;
          return;
        }

        profileStore.importProfile(content, targetSlot + 1);
        
        // Reset the file input
        if (fileInput) {
          fileInput.value = '';
        }
      } catch (error) {
        errorMessage = `Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`;
        showErrorModal = true;
        
        // Reset the file input
        if (fileInput) {
          fileInput.value = '';
        }
      }
    };

    reader.onerror = () => {
      errorMessage = 'Failed to read the file. Please try again.';
      showErrorModal = true;
      
      // Reset the file input
      if (fileInput) {
        fileInput.value = '';
      }
    };

    reader.readAsText(file);
  }

  function triggerImport() {
    fileInput?.click();
  }

  function setActive(profileId: number) {
    profileStore.setActiveProfile(profileId);
    keyboardConnectionState.controller?.set_config_file_index(profileId - 1);
    openMenuId = null;
  }

  function exportProfile(profileId: number) {
    const jsonData = profileStore.exportProfile(profileId);
    if (!jsonData) return;

    const profile = profiles.find(p => p?.id === profileId);
    const filename = `${profile?.name || 'profile'}.json`;

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    openMenuId = null;
  }

  function addNewProfile() {
    if (!canAddMore) {
      errorMessage = 'Maximum 16 profiles reached';
      showErrorModal = true;
      return;
    }
    // Find the next available slot index
    const nextSlot = profiles.findIndex((p, idx) => idx >= 4 && p === null);
    if (nextSlot !== -1) {
      const newProfileName = `Profile ${nextSlot + 1}`;
      profileStore.createProfile(newProfileName);
    }
  }

  function showDuplicateDialog(sourceId: number) {
    if (!canAddMore) {
      errorMessage = 'Maximum 16 profiles reached';
      showErrorModal = true;
      return;
    }
    duplicateSourceId = sourceId;
    showDuplicateModal = true;
    openMenuId = null;
  }

  function executeDuplicate() {
    if (duplicateSourceId === null) return;
    profileStore.duplicateProfile(duplicateSourceId);
    showDuplicateModal = false;
    duplicateSourceId = null;
  }

  function showRestoreDialog(profileId: number) {
    restoreProfileId = profileId;
    showRestoreModal = true;
    openMenuId = null;
  }

  function executeRestore() {
    if (restoreProfileId === null) return;
    profileStore.restoreDefault(restoreProfileId);
    showRestoreModal = false;
    restoreProfileId = null;
  }

  function deleteProfile(profileId: number) {
    if (profileId === activeProfileId) {
      errorMessage = 'Cannot delete the active profile. Please activate another profile first.';
      showErrorModal = true;
      return;
    }

    if (profileId <= 4) {
      errorMessage = 'Cannot delete default profiles (1-4)';
      showErrorModal = true;
      return;
    }

    profileStore.deleteProfile(profileId);
    openMenuId = null;
  }
</script>

<svelte:window onclick={handleOutsideClick} />

<!-- Hidden file input for import -->
<input
  type="file"
  accept=".json"
  bind:this={fileInput}
  onchange={handleFileSelect}
  class="hidden"
  aria-label="Import profile"
/>

<div class="w-full max-w-4xl mx-auto p-8">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Configure Profiles</h1>
      <button
        onclick={triggerImport}
        class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg glassmorphism-button flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Import Profile
      </button>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Manage your keyboard profiles here. You can import, export, and customize them.
    </p>
  </div>

  <!-- Profile Grid -->
  <div class="grid grid-cols-2 gap-4">
    <!-- Default Profiles (1-4) - Always shown -->
    {#each defaultProfiles as profile, index}
      <ProfileCard
        {profile}
        {index}
        isActive={profile?.id === activeProfileId}
        onActivate={() => profile && setActive(profile.id)}
        onMenuClick={e => profile && toggleMenu(profile.id, e)}
      />
    {/each}

    <!-- Additional Profiles (5-16) - Only shown if created -->
    {#each additionalProfiles as profile, index}
      <ProfileCard
        {profile}
        index={index + 4}
        isActive={profile.id === activeProfileId}
        onActivate={() => setActive(profile.id)}
        onMenuClick={e => toggleMenu(profile.id, e)}
      />
    {/each}

    <!-- Add Profile Button - Only show if we can add more -->
    {#if canAddMore}
      <AddProfileCard onAdd={addNewProfile} />
    {/if}
  </div>
</div>

<!-- Profile Menu -->
{#if openMenuId !== null && menuPosition !== null}
  <ProfileMenu
    profileId={openMenuId}
    position={menuPosition}
    isActive={openMenuId === activeProfileId}
    canDelete={openMenuId > 4}
    onExport={() => exportProfile(openMenuId)}
    onDuplicate={() => showDuplicateDialog(openMenuId)}
    onRestore={() => showRestoreDialog(openMenuId)}
    onDelete={() => deleteProfile(openMenuId)}
  />
{/if}

<!-- Duplicate Modal -->
{#if showDuplicateModal && duplicateSourceId !== null}
  <ConfirmationModal
    title="Duplicate Profile"
    message="Create a copy of <strong class='text-white'>{profiles.find(
      p => p?.id === duplicateSourceId
    )?.name}</strong> in the next available slot?"
    confirmText="Duplicate"
    confirmColor="blue"
    onConfirm={executeDuplicate}
    onCancel={() => (showDuplicateModal = false)}
  />
{/if}

<!-- Restore Default Modal -->
{#if showRestoreModal && restoreProfileId !== null}
  <ConfirmationModal
    title="Restore to Default"
    message="Are you sure you want to restore <strong class='text-white'>{profiles.find(
      p => p?.id === restoreProfileId
    )?.name}</strong> to its default settings? This action cannot be undone."
    confirmText="Restore"
    confirmColor="orange"
    onConfirm={executeRestore}
    onCancel={() => (showRestoreModal = false)}
  />
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <ErrorModal message={errorMessage} onClose={() => (showErrorModal = false)} />
{/if}

<style lang="postcss">
  @reference "tailwindcss";
</style>
