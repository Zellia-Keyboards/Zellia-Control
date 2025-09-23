<script lang="ts">
  import '../app.css';
  import Zellia80HE from '../lib/Zellia80HE.svelte';
  import NewZellia60HE from '../lib/NewZellia60HE.svelte';
  import NewZellia80HE from '../lib/NewZellia80HE.svelte';
  import { KeyboardDisplayValues } from '$lib/KeyboardState.svelte';
  import { keyboardConnection } from '$lib/KeyboardConnectionStore.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    selectedThemeColor,
    themeColors,
    type ThemeColorName,
    glassmorphismMode,
    updateThemeForDarkMode,
  } from '$lib/DarkModeStore.svelte';
  import { language, t, type Language } from '$lib/LanguageStore.svelte';
  import { Palette, Sun, Moon, Globe } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  
  const NAVIGATE = [
    ['/performance', 'nav.performance'],
    ['/remap', 'nav.remap'],
    ['/lighting', 'nav.lighting'],
    ['/advancedkey', 'nav.advancedkey'],
    ['/calibration', 'nav.calibration'],
    ['/debug', 'nav.debug'],
    ['/settings', 'nav.settings'],
    ['/update', 'nav.update'],
    ['/about', 'nav.about'],
  ];
  
  let { children } = $props();
  let selectedLayer = $state(1);
  let showDropdown = $state(false);
  let showThemeSelector = $state(false);
  let showLanguageSelector = $state(false);
  let showFirefoxWarning = $state(false);
  let firefoxWarningDismissed = $state(false);
  let currentTheme = $state<ThemeColorName | null>(null);
  
  // Make language reactive to store changes
  let currentLanguage = $derived($language);

  // Check if current page should use the sidebar layout
  const usesSidebarLayout = $derived(() => {
    const path = $page.url.pathname;
    const sidebarPages = ['/performance', '/remap', '/lighting', '/advancedkey', '/calibration', '/debug', '/settings', '/about', '/update'];
    return sidebarPages.some(sidebarPage => path === sidebarPage || path.startsWith(sidebarPage + '/'));
  });

  // Check if we should show the configurator layout
  const shouldShowConfiguratorLayout = $derived(() => {
    return keyboardConnection.shouldShowConfigurator && usesSidebarLayout();
  });

  // Derived variable to determine when to show layer selector
  let shouldShowLayerSelector = $derived(() => {
    const path = $page.url.pathname;
    const showPagesForLayerSelector = ['/performance', '/remap', '/advancedkey'];
    return !showPagesForLayerSelector.some(page => path === page || path.startsWith(page + '/'));
  });

  // Derived variable to determine which keyboard component to show
  const currentKeyboardComponent = $derived(() => {
    const selectedModel = keyboardConnection.state.selectedModel;
    if (selectedModel === 'zellia60he') {
      return NewZellia60HE;
    } else if (selectedModel === 'zellia80he') {
      return NewZellia80HE;
    }
    // Default fallback
    return Zellia80HE;
  });

  selectedThemeColor.subscribe(value => {
    currentTheme = value;
  });

  function setTheme(colorName: ThemeColorName) {
    // If clicking the currently selected theme, deselect it
    if (currentTheme === colorName) {
      selectedThemeColor.set(null);
    } else {
      selectedThemeColor.set(colorName);
    }
  }

  function setLanguage(lang: Language) {
    language.set(lang);
  }

  // Function to check if a navigation item is active
  function isActive(href: string): boolean {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }

  // Disconnect function
  function handleDisconnect() {
    keyboardConnection.disconnect();
    goto('/welcome');
  }

  // Set page language for accessibility
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;

      // Check if user is using Firefox - only show warning if not dismissed
      if (navigator.userAgent.toLowerCase().includes('firefox') && !firefoxWarningDismissed) {
        showFirefoxWarning = true;
      }
    }
  });

  // Centralized navigation logic - single source of truth
  let navigationInProgress = $state(false);
  
  $effect(() => {
    if (navigationInProgress) return; // Prevent navigation loops
    
    const path = $page.url.pathname;
    const shouldShowConfigurator = keyboardConnection.shouldShowConfigurator;
    
    // Root page - redirect appropriately
    if (path === '/') {
      navigationInProgress = true;
      if (shouldShowConfigurator) {
        goto('/remap', { replaceState: true });
      } else {
        goto('/welcome', { replaceState: true });
      }
      setTimeout(() => navigationInProgress = false, 100);
      return;
    }
    
    // Welcome/demo pages - redirect if connected
    if ((path === '/welcome' || path === '/demo-select') && shouldShowConfigurator) {
      navigationInProgress = true;
      goto('/remap', { replaceState: true });
      setTimeout(() => navigationInProgress = false, 100);
      return;
    }
    
    // Configurator pages - redirect if not connected
    if (usesSidebarLayout() && !shouldShowConfigurator) {
      navigationInProgress = true;
      goto('/welcome', { replaceState: true });
      setTimeout(() => navigationInProgress = false, 100);
      return;
    }
  });
</script>

<!-- Main Application -->
{#if shouldShowConfiguratorLayout()}
  <!-- Small Screen Warning (follows codebase theme) -->
  <div
    class="xl:hidden fixed inset-0 flex items-center justify-center z-50 bg-primary-50 dark:bg-black"
  >
    <!-- Small screen warning content -->
    <div class="max-w-2xl mx-4">
      <!-- Main Warning Card -->
      <div
        class="rounded-xl shadow-lg border p-8 text-center bg-white dark:bg-black border-primary-200 dark:border-primary-700 text-gray-800 dark:text-white {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <!-- Icon and Title -->
        <div class="flex items-center justify-center mb-6">
          <div
            class="w-16 h-16 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800"
          >
            <svg
              class="w-8 h-8 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Display Too Small</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Zellia Control requires a larger display for the optimal keyboard configuration experience.
          Please use a desktop or laptop computer, or expand your browser window.
        </p>

        <!-- Requirements Info -->
        <div
          class="border rounded-lg p-4 mb-6 bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 {$glassmorphismMode
            ? 'glassmorphism-card'
            : ''}"
        >
          <div class="flex items-center gap-3 text-primary-600 dark:text-primary-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="text-sm font-medium">Minimum recommended width: 1280px</div>
          </div>
        </div>

        <!-- Features that require larger screen -->
        <div class="text-left space-y-3 mb-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
            {t('ui.featuresRequiringLargerDisplay', currentLanguage)}
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span>{t('ui.keyboardLayoutVisualization', currentLanguage)}</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span>{t('ui.advancedKeyConfigPanels', currentLanguage)}</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span>Performance tuning controls</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span>Lighting configuration interface</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Application (hidden on small screens) -->
  <div class="hidden xl:flex h-screen bg-gray-50 dark:bg-black">
  <!-- Sidebar -->
  <div
    class="flex flex-col w-52 dark:bg-black dark:border-gray-600 bg-white border-gray-200 {$glassmorphismMode
      ? 'glassmorphism-sidebar'
      : ''} shadow-xl h-full overflow-y-auto border-r"
  >
    <!-- Header -->
    <div class="p-4">
      <h1
        class="font-bold text-xl dark:text-white text-gray-900 {$glassmorphismMode
          ? ''
          : ''} text-center"
      >
        {t('common.zellia', currentLanguage)}
      </h1>
      
      <!-- Connection Status -->
      <div class="mt-3 text-center">
        <div class="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>
            {keyboardConnection.state.isDemoMode 
              ? `Demo: ${keyboardConnection.state.selectedModel?.toUpperCase() || ''}`
              : keyboardConnection.state.lastConnectedDevice || 'Connected'}
          </span>
        </div>
      </div>
    </div>

    <!-- Profile Section -->
    <div class="px-3 pb-3 border-b border-gray-100 dark:border-gray-600">
      <!-- Profile Dropdown -->
      <div class="mb-2">
        <button
          class="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 border-gray-200 hover:bg-gray-100 dark:text-white dark:bg-black dark:border-gray-600 dark:hover:bg-gray-900 {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''} border rounded-lg transition-colors duration-200"
          onclick={() => (showDropdown = !showDropdown)}
        >
          <span>{t('ui.profiles', currentLanguage)}</span>
          <svg
            class="w-4 h-4 transition-transform duration-200"
            class:rotate-180={showDropdown}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {#if showDropdown}
          <div
            class="mt-1 dark:bg-black dark:border-gray-600 bg-white border-gray-200 {$glassmorphismMode
              ? 'glassmorphism-card'
              : ''} border rounded-lg shadow-lg"
            transition:slide={{ duration: 300, axis: 'y' }}
          >
            <div class="p-3 text-sm dark:text-gray-300 text-gray-800">
              {t('ui.noProfilesAvailable', currentLanguage)}
            </div>
          </div>
        {/if}
      </div>

      <!-- Import/Export and Disconnect Buttons -->
      {#if !showDropdown}
        <div class="grid grid-cols-2 gap-2 mb-2" transition:slide={{ duration: 300, axis: 'y' }}>
          <button
            class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent bg-primary-500 hover:bg-primary-600 {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''}"
          >
            {t('ui.import', currentLanguage)}
          </button>
          <button
            class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent bg-primary-500 hover:bg-primary-600 {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''}"
          >
            {t('ui.export', currentLanguage)}
          </button>
        </div>

        
      {/if}
      <!-- Disconnect Button -->
        <button
          class="w-full px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          onclick={handleDisconnect}
        >
          <div class="flex items-center justify-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {t('ui.disconnect', currentLanguage)}
          </div>
        </button>
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
            <span class="relative z-10">{t(name, currentLanguage)}</span>
          </a>
        {/each}
      </nav>
    </div>
    <!-- Theme Selector -->
    <div class="p-3 border-t border-gray-200 dark:border-gray-600">
      <!-- Theme Button -->
      <button
        class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'}"
        onclick={() => (showThemeSelector = !showThemeSelector)}
      >
        <div class="flex items-center gap-3">
          <Palette class="w-4 h-4" />
          <span>{t('ui.themeColors', currentLanguage)}</span>
        </div>
        <svg
          class="w-4 h-4 transition-transform duration-200"
          class:rotate-180={showThemeSelector}
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Color Squares (collapsible) -->
      {#if showThemeSelector}
        <div class="grid grid-cols-4 gap-2 mt-2" transition:slide={{ duration: 300, axis: 'y' }}>
          {#each Object.entries(themeColors) as [name, color] (name)}
            <button
              title={name.charAt(0).toUpperCase() + name.slice(1) + (currentTheme === name ? ' (Click to deselect)' : '')}
              class="w-full h-7 rounded border transition-all duration-150
                                   {currentTheme === name
                ? 'border-white dark:border-white ring-2 ring-gray-400 dark:ring-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'}"
              style="background-color: {color};"
              onclick={() => setTheme(name as ThemeColorName)}
            ></button>
          {/each}
        </div>
        
      {/if}
    </div>

    <!-- Language Selector -->
    <div class="p-3">
      <!-- Language Button -->
      <button
        class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'}"
        onclick={() => (showLanguageSelector = !showLanguageSelector)}
      >
        <div class="flex items-center gap-3">
          <Globe class="w-4 h-4" />
          <span>{t('ui.language', currentLanguage)}</span>
        </div>
        <svg
          class="w-4 h-4 transition-transform duration-200"
          class:rotate-180={showLanguageSelector}
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Language Options (collapsible) -->
      {#if showLanguageSelector}
        <div class="mt-2 space-y-1" transition:slide={{ duration: 300, axis: 'y' }}>
          <button
            class="w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-150 {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''} {currentLanguage === 'en'
              ? 'bg-primary-500 text-white'
              : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
            onclick={() => setLanguage('en')}
          >
            {t('common.english', currentLanguage)}
          </button>
          <button
            class="w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-150 {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''} {currentLanguage === 'zh'
              ? 'bg-primary-500 text-white'
              : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
            onclick={() => setLanguage('zh')}
          >
            {t('common.chinese', currentLanguage)}
          </button>
        </div>
      {/if}
    </div>

    <!-- Dark Mode Toggle at Bottom -->
    <div class="p-3 border-transparent">
      <button
        class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'}"
        onclick={() => {
          // Toggle Tailwind dark mode
          document.documentElement.classList.toggle('dark');
          // Update theme color for plain theme if no color theme is selected
          updateThemeForDarkMode();
        }}
      >
        <div class="flex items-center gap-3">
          <Sun class="w-4 h-4 hidden dark:block" />
          <Moon class="w-4 h-4 block dark:hidden" />
          <span class="hidden dark:block">{t('ui.darkMode', currentLanguage)}</span>
          <span class="block dark:hidden">{t('ui.lightMode', currentLanguage)}</span>
        </div>
      </button>
    </div>
  </div>
  <!-- Main Content -->
  <div
    class="flex-1 flex flex-col gap-4 px-4 overflow-y-scroll {$glassmorphismMode
      ? 'glassmorphism-main'
      : 'bg-primary-50/20 dark:bg-black/20'}"
  >
    <!-- Layer selector (fades out on certain pages) -->
    <div class="flex items-center -mb-3">
      <div class="flex items-center gap-2 px-4 py-2 h-12">
        {#if !shouldShowLayerSelector()}
          <span
            class="font-semibold text-gray-900 dark:text-white mr-2 {$glassmorphismMode
              ? 'text-gray-800 dark:text-white'
              : ''}"
            >Layer:</span
          >
          {#each [1, 2, 3, 4] as layer}
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-lg transition-colors duration-200 focus:outline-none bg-white dark:bg-black border-gray-300 dark:border-gray-600 text-primary-500 hover:bg-primary-100 dark:hover:bg-gray-700 {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''} {selectedLayer === layer
                ? 'bg-primary-500 !text-white !border-primary-700'
                : ''}"
              onmouseover={e => {
                if (selectedLayer !== layer) {
                  const element = e.currentTarget as HTMLElement;
                  element.classList.add('hover:bg-primary-100', 'dark:hover:bg-gray-700');
                }
              }}
              onmouseout={e => {
                if (selectedLayer !== layer) {
                  const element = e.currentTarget as HTMLElement;
                  element.classList.remove('hover:bg-primary-100', 'dark:hover:bg-gray-700');
                }
              }}
              onclick={() => (selectedLayer = layer)}
            >
              {layer}
            </button>
          {/each}
        {/if}
      </div>
    </div>
    <!-- Component for adjust part -->

    {@render children()}
  </div>
</div>
{:else}
  <!-- Show standalone pages (welcome, demo-select) without sidebar -->
  <div class="min-h-screen">
    {@render children()}
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";
  :global(html) {
    background-color: theme(--color-gray-50);
    --theme-color-primary: #6366f1; /* Default Indigo, will be overridden */
  }

  /* Layer selector fade-in animation */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>