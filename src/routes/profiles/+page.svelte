<script lang="ts">
  import { profileStore, type Profile } from '$lib/ProfileStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { MoreVertical, Download, Copy, RotateCcw, Trash2, Plus, AlertCircle } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  
  let currentLanguage = $derived($language);
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
  
  let showDeleteModal = $state(false);
  let deleteProfileId = $state<number | null>(null);
  
  let showErrorModal = $state(false);
  let errorMessage = $state('');
  
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
        right: window.innerWidth - rect.right
      };
    }
  }
  
  function handleOutsideClick() {
    openMenuId = null;
    menuPosition = null;
  }
  
  function setActive(profileId: number) {
    profileStore.setActiveProfile(profileId);
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
  
  function showDeleteDialog(profileId: number) {
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
    
    deleteProfileId = profileId;
    showDeleteModal = true;
    openMenuId = null;
  }
  
  function executeDelete() {
    if (deleteProfileId === null) return;
    profileStore.deleteProfile(deleteProfileId);
    showDeleteModal = false;
    deleteProfileId = null;
  }

</script>

<svelte:window onclick={handleOutsideClick} />

<div class="w-full max-w-4xl mx-auto p-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      Configure Profiles
    </h1>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Manage your keyboard profiles here. You can import, export, and customize them.
    </p>
  </div>

  <!-- Profile Grid -->
  <div class="grid grid-cols-2 gap-4">
    <!-- Default Profiles (1-4) - Always shown -->
    {#each defaultProfiles as profile, index}
      <div
        class="relative rounded-lg border transition-all duration-200 p-6 {profile?.id === activeProfileId
          ? 'border-green-500/50 cursor-default'
          : 'border-gray-700 cursor-pointer hover:border-gray-600'} {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-900'}"
        onclick={() => profile && profile.id !== activeProfileId && setActive(profile.id)}
        role="button"
        tabindex={0}
      >
        <!-- Profile Name -->
        <h3 class="text-base font-semibold text-gray-900 dark:text-white pr-12">
          {profile?.name || `Profile ${index + 1}`}
        </h3>

        <!-- Active Badge -->
        {#if profile?.id === activeProfileId}
          <div class="absolute top-4 right-12 px-2 py-1 rounded-md bg-gray-700 text-white text-xs font-medium">
            Active
          </div>
        {/if}

        <!-- Menu Button -->
        {#if profile}
          <button
            class="absolute top-4 right-4 p-1 rounded hover:bg-gray-800 transition-colors z-10"
            onclick={(e) => toggleMenu(profile.id, e)}
            aria-label="Menu"
          >
            <MoreVertical class="w-5 h-5 text-gray-400" />
          </button>
        {/if}
      </div>
    {/each}

    <!-- Additional Profiles (5-16) - Only shown if created -->
    {#each additionalProfiles as profile}
      <div
        class="relative rounded-lg border transition-all duration-200 p-6 {profile.id === activeProfileId
          ? 'border-green-500/50 cursor-default'
          : 'border-gray-700 cursor-pointer hover:border-gray-600'} {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-900'}"
        onclick={() => profile.id !== activeProfileId && setActive(profile.id)}
        role="button"
        tabindex={0}
      >
        <!-- Profile Name -->
        <h3 class="text-base font-semibold text-gray-900 dark:text-white pr-12">
          {profile.name}
        </h3>

        <!-- Active Badge -->
        {#if profile.id === activeProfileId}
          <div class="absolute top-4 right-12 px-2 py-1 rounded-md bg-gray-700 text-white text-xs font-medium">
            Active
          </div>
        {/if}

        <!-- Menu Button -->
        <button
          class="absolute top-4 right-4 p-1 rounded hover:bg-gray-800 transition-colors z-10"
          onclick={(e) => toggleMenu(profile.id, e)}
          aria-label="Menu"
        >
          <MoreVertical class="w-5 h-5 text-gray-400" />
        </button>
      </div>
    {/each}

    <!-- Add Profile Button - Only show if we can add more -->
    {#if canAddMore}
      <button
        class="rounded-lg border-2 border-dashed border-gray-700 p-6 transition-all duration-200 hover:border-gray-600 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-transparent hover:bg-gray-900/50'}"
        onclick={addNewProfile}
      >
        <Plus class="w-5 h-5" />
        <span class="font-medium">Add Profile</span>
      </button>
    {/if}
  </div>
</div>

<!-- Dropdown Menu Portal - Renders on top of everything -->
{#if openMenuId !== null && menuPosition !== null}
  <div
    class="fixed border rounded-lg shadow-2xl z-[9999] w-48 overflow-hidden backdrop-blur-2xl {$glassmorphismMode ? 'glassmorphism-card border-primary-500/30' : 'bg-primary-900 dark:bg-primary-900 border-primary-700'}"
    style="top: {menuPosition.top}px; right: {menuPosition.right}px;"
    transition:slide={{ duration: 150, axis: 'y' }}
    onclick={(e) => e.stopPropagation()}
  >
    <button
      class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
      onclick={() => exportProfile(openMenuId)}
    >
      <Download class="w-4 h-4" />
      Export
    </button>
    
    <button
      class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
      onclick={() => showDuplicateDialog(openMenuId)}
    >
      <Copy class="w-4 h-4" />
      Duplicate
    </button>
    
    <button
      class="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-800/50 flex items-center gap-3 text-gray-200 dark:text-gray-200 transition-colors"
      onclick={() => showRestoreDialog(openMenuId)}
    >
      <RotateCcw class="w-4 h-4" />
      Restore Default
    </button>
    
    {#if openMenuId > 4 && openMenuId !== activeProfileId}
      <div class="border-t border-primary-700/50"></div>
      <button
        class="w-full px-4 py-2.5 text-left text-sm hover:bg-red-900/20 flex items-center gap-3 text-red-400 transition-colors"
        onclick={() => showDeleteDialog(openMenuId)}
      >
        <Trash2 class="w-4 h-4" />
        Delete
      </button>
    {/if}
  </div>
{/if}

<!-- Duplicate Modal -->
{#if showDuplicateModal && duplicateSourceId !== null}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (showDuplicateModal = false)}
  >
    <div
      class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-800'}"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="text-xl font-bold text-white mb-3">
        Duplicate Profile
      </h3>
      <p class="text-sm text-gray-400 mb-6">
        Create a copy of <strong class="text-white">{profiles.find(p => p?.id === duplicateSourceId)?.name}</strong> in the next available slot?
      </p>

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button border-gray-600 text-gray-300' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}"
          onclick={() => (showDuplicateModal = false)}
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}"
          onclick={executeDuplicate}
        >
          Duplicate
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Restore Default Modal -->
{#if showRestoreModal && restoreProfileId !== null}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (showRestoreModal = false)}
  >
    <div
      class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-800'}"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="text-xl font-bold text-white mb-3">
        Restore to Default
      </h3>
      <p class="text-sm text-gray-400 mb-6">
        Are you sure you want to restore <strong class="text-white">{profiles.find(p => p?.id === restoreProfileId)?.name}</strong> to its default settings? This action cannot be undone.
      </p>

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button border-gray-600 text-gray-300' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}"
          onclick={() => (showRestoreModal = false)}
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button bg-orange-600/80 border border-orange-500/50 text-white hover:bg-orange-600' : 'bg-orange-600 text-white hover:bg-orange-700'}"
          onclick={executeRestore}
        >
          Restore
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal && deleteProfileId !== null}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (showDeleteModal = false)}
  >
    <div
      class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-800'}"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="text-xl font-bold text-white mb-3">
        Delete Profile
      </h3>
      <p class="text-sm text-gray-400 mb-6">
        Are you sure you want to delete <strong class="text-white">{profiles.find(p => p?.id === deleteProfileId)?.name}</strong>? This action cannot be undone.
      </p>

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button border-gray-600 text-gray-300' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}"
          onclick={() => (showDeleteModal = false)}
        >
          Cancel
        </button>
        <button
          class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button bg-red-600/80 border border-red-500/50 text-white hover:bg-red-600' : 'bg-red-600 text-white hover:bg-red-700'}"
          onclick={executeDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 150 }}
    onclick={() => (showErrorModal = false)}
  >
    <div
      class="border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-800'}"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-start gap-3 mb-4">
        <AlertCircle class="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 class="text-xl font-bold text-white mb-2">
            Notice
          </h3>
          <p class="text-sm text-gray-400">
            {errorMessage}
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="px-4 py-2.5 rounded-lg font-medium transition-colors {$glassmorphismMode ? 'glassmorphism-button bg-gray-700/80 border border-gray-600/50 text-white hover:bg-gray-700' : 'bg-gray-700 text-white hover:bg-gray-600'}"
          onclick={() => (showErrorModal = false)}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";
</style>
