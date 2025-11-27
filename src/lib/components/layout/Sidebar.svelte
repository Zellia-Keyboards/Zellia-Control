<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import ThemeSelector from './ThemeSelector.svelte';
  import LanguageSwitch from './LanguageSwitch.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { NAVIGATE } from '$lib/config/navigation';
  import { LogOut } from 'lucide-svelte';

  let currentLanguage = $derived($language);

  function isActive(href: string): boolean {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }

  function handleDisconnect() {
    keyboardAPI.disconnect();
    goto('/');
  }
</script>

<div
  class="sidebar flex flex-col dark:bg-black dark:border-gray-600 bg-white border-gray-200 {$glassmorphismMode
    ? 'glassmorphism-sidebar'
    : ''} shadow-xl h-full overflow-y-auto border-r"
  style="width: var(--sidebar-width, 13rem);"
>
  <!-- Header -->
  <div class="p-4">
    <h1
      class="font-black text-xl dark:text-white text-gray-900 {$glassmorphismMode
        ? ''
        : ''} text-center"
    >
      <span class="italic">{currentLanguage === 'en' ? 'ZELLIA' : 'ZELLIA'}</span>
      {currentLanguage === 'en' ? 'Control' : '控制'}
    </h1>

    <!-- Connection Status -->
    <div class="mt-3 text-center">
      <div class="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        {#if keyboardAPI.shouldShowConfigurator}
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>
            <i>
              {keyboardAPI.state.isDemoMode
                ? `Demo: ${keyboardAPI.state.selectedModel?.toUpperCase() || ''}`
                : keyboardAPI.state.lastConnectedDevice || 'Connected'}
            </i>
          </span>
        {:else}
          <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span><i>Waiting to connect</i></span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Profile Section -->
  <div class="px-3 pb-3 border-b border-gray-100 dark:border-gray-600 space-y-2">
    <a
      href="/profiles"
      class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''}"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
          />
        </svg>
        <span><i>{t('ui.profiles', currentLanguage)}</i></span>
      </div>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>

    <!-- Disconnect Button -->
    {#if keyboardAPI.shouldShowConfigurator}
      <button
        class="w-full px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={handleDisconnect}
      >
        <div class="flex items-center justify-center gap-1">
          <LogOut class="w-3 h-3" />
          <i>{t('ui.disconnect', currentLanguage)}</i>
        </div>
      </button>
    {/if}
  </div>

  <!-- Navigation -->
  <div class="flex-1 p-3">
    <nav class="space-y-1">
      {#each NAVIGATE as [href, name]}
        <a
          {href}
          class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg relative overflow-hidden text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 data-[active=true]:bg-primary-500 data-[active=true]:text-white data-[active=true]:shadow-sm transition-all duration-200 ease-in {$glassmorphismMode
            ? 'glassmorphism-nav-item'
            : ''}"
          data-active={isActive(href)}
        >
          <span class="relative z-10"><i>{t(name, currentLanguage)}</i></span>
        </a>
      {/each}
    </nav>
  </div>

  <!-- Theme Selector -->
  <ThemeSelector />

  <!-- Language Selector -->
  <LanguageSwitch />

  <!-- Dark Mode Toggle -->
  <DarkModeToggle />
</div>

<style lang="postcss">
  .sidebar {
    user-select: none;
  }
</style>
