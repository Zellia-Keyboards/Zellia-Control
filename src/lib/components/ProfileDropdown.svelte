<script lang="ts">
  import { profileStore } from '$lib/stores/ProfileStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Check } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  let currentLanguage = $derived($language);
  let profiles = $derived($profileStore.profiles);
  let activeProfileId = $derived($profileStore.activeProfileId);
  let activeProfile = $derived(profiles.find(p => p?.id === activeProfileId));

  let showDropdown = $state(false);

  function selectProfile(profileId: number) {
    profileStore.setActiveProfile(profileId);
    showDropdown = false;
  }

  function toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    showDropdown = !showDropdown;
  }

  function handleOutsideClick() {
    showDropdown = false;
  }

  // Get non-null profiles
  let availableProfiles = $derived(profiles.filter(p => p !== null));
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative">
  <!-- Dropdown Button -->
  <button
    class="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 glassmorphism-button hover:shadow-md active:scale-95"
    onclick={toggleDropdown}
    title="Switch profiles"
  >
    <div class="flex flex-col items-start">
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {t('ui.profiles', currentLanguage)}
      </span>
      <span class="text-sm font-semibold text-gray-900 dark:text-white">
        {activeProfile?.name || t('profiles.noProfile', currentLanguage)}
      </span>
    </div>
    <svg
      class="w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 {showDropdown ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Dropdown Menu -->
  {#if showDropdown}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute top-full mt-2 right-0 w-72 glassmorphism-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl"
      transition:slide={{ duration: 200, axis: 'y' }}
      onclick={e => e.stopPropagation()}
    >
      <div class="max-h-80 overflow-y-auto">
        {#if availableProfiles.length === 0}
          <div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('ui.noProfilesAvailable', currentLanguage)}
          </div>
        {:else}
          {#each availableProfiles as profile}
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center justify-between group"
              onclick={() => selectProfile(profile.id)}
            >
              <div class="flex-1">
                <div class="text-sm font-semibold text-gray-900 dark:text-white">
                  {profile.name}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {t('profiles.slot', currentLanguage)}
                  {profile.id}
                </div>
              </div>

              {#if profile.id === activeProfileId}
                <Check class="w-4 h-4 text-primary-500" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700">
        <a
          href="/profiles"
          class="block px-4 py-3 text-sm font-semibold text-center text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onclick={() => (showDropdown = false)}
        >
          {t('profiles.manageAll', currentLanguage)}
        </a>
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  @reference "tailwindcss";
</style>
