<script lang="ts">
  import '../app.css';
  import KeyboardRender from '$lib/KeyboardRender.svelte';
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import * as kle from '@ijprest/kle-serial';
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
  import { Palette, Sun, Moon, Globe, Settings } from 'lucide-svelte';
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
  let showLayoutMenu = $state(false);
  let showDemoDropdown = $state(false);
  let isEnteringDemo = $state(false);
  
  // Layout configuration state
  let bottomRowConfig = $state<'6.25u' | '7u'>('6.25u');
  let splitSpacebar = $state(false);
  let rightShiftSplit = $state(false);
  let leftShiftSplit = $state(false);
  let splitBackspace = $state(false);
  
  // Make language reactive to store changes
  let currentLanguage = $derived($language);

  // Keyboard layout for global KeyboardRender
  const layout = `[[{"x":2.25},"~\\n\`","!\\n1","@\\n2","#\\n3","$\\n4","%\\n5","^\\n6","&\\n7","*\\n8","(\\n9",")\\n0","_\\n-","+\\n=",{"w":2},"Backspace",{"a":7},"",""],[{"x":2.25,"a":4,"w":1.5},"Tab","Q","W","E","R","T","Y","U","I","O","P","{\\n[","}\\n]",{"w":1.5},"|\\n\\\\"   ],   [     {       "x": 2.25,       "w": 1.75     },     "CapsLock",     "A",     "S",     "D",     "F",     "G",     "H",     "J",     "K",     "L",     ":\\n;",     "\\"\\n'",{"w":2.25},"Enter"],[{"a":7,"w":1.25},"","",{"a":4,"w":2.25},"Shift","Z","X","C","V","B","N","M","<\\n,",">\\n.","?\\n/",{"w":2.75},"Shift",{"a":7,"w":1.75},"",""],[{"x":2.25,"a":4,"w":1.5},"Ctrl","Win",{"w":1.5},"Alt",{"a":7,"w":7},"",{"a":4,"w":1.5},"Alt","Win",{"w":1.5},"Ctrl"],[{"x":6.25,"a":7,"w":3.5},"",{"w":3.5},""]]`;
  let keyboard_keys: kle.Key[] = kle.Serial.deserialize(JSON.parse(layout)).keys;

  // Check if current page should use the sidebar layout
  const usesSidebarLayout = $derived(() => {
    const path = $page.url.pathname;
    const sidebarPages = ['/performance', '/remap', '/lighting', '/advancedkey', '/calibration', '/debug', '/settings', '/about', '/update'];
    return sidebarPages.some(sidebarPage => path === sidebarPage || path.startsWith(sidebarPage + '/'));
  });

  // Always show the sidebar layout for configurator pages and root page
  const shouldShowConfiguratorLayout = $derived(() => {
    return usesSidebarLayout() || $page.url.pathname === '/';
  });

  // Derived variable to determine when to show layer selector
  let shouldShowLayerSelector = $derived(() => {
    const path = $page.url.pathname;
    const showPagesForLayerSelector = ['/performance', '/remap', '/advancedkey'];
    return !showPagesForLayerSelector.some(page => path === page || path.startsWith(page + '/'));
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
    keyboardAPI.disconnect();
    // Redirect to home page to show connection interface
    goto('/');
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
    const shouldShowConfigurator = keyboardAPI.shouldShowConfigurator;
    
    // Root page - redirect to remap only if connected
    if (path === '/' && shouldShowConfigurator) {
      navigationInProgress = true;
      goto('/remap', { replaceState: true });
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
          {#if keyboardAPI.shouldShowConfigurator}
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              {keyboardAPI.state.isDemoMode 
                ? `Demo: ${keyboardAPI.state.selectedModel?.toUpperCase() || ''}`
                : keyboardAPI.state.lastConnectedDevice || 'Connected'}
            </span>
          {:else}
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Waiting to connect</span>
          {/if}
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
      
      <!-- Disconnect Button - only show when connected -->
      {#if keyboardAPI.shouldShowConfigurator}
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
    <!-- Layer selector and Layout toggle (only show when connected) -->
    {#if keyboardAPI.shouldShowConfigurator}
      <div class="flex items-center justify-between -mb-3">
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

        <!-- Layout Configuration Dropdown -->
        <div class="relative px-4 py-2">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 {$glassmorphismMode
              ? 'glassmorphism-button'
              : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
            onclick={() => (showLayoutMenu = !showLayoutMenu)}
          >
            <Settings class="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">Layout</span>
            <svg
              class="w-4 h-4 transition-transform duration-200 text-gray-600 dark:text-gray-400"
              class:rotate-180={showLayoutMenu}
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        
          <!-- Dropdown Menu -->
          {#if showLayoutMenu}
            <div 
              class="absolute right-0 top-12 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 p-4 {$glassmorphismMode ? 'glassmorphism-card' : ''}"
              transition:slide={{ duration: 300, axis: 'y' }}
            >
              <!-- Bottom Row Configuration -->
              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bottom Row</h4>
                <div class="space-y-1">
                  <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                    <input
                      type="radio"
                      bind:group={bottomRowConfig}
                      value="6.25u"
                      class="mr-2 text-primary-500"
                    />
                    <span class="text-gray-900 dark:text-white">6.25u (standard)</span>
                  </label>
                  <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                    <input
                      type="radio"
                      bind:group={bottomRowConfig}
                      value="7u"
                      class="mr-2 text-primary-500"
                    />
                    <span class="text-gray-900 dark:text-white">7u (Tsangan)</span>
                  </label>
                </div>
              </div>
              
              <!-- Split Spacebar (only if 7u is selected) -->
              {#if bottomRowConfig === '7u'}
                <div class="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                  <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                    <input
                      type="checkbox"
                      bind:checked={splitSpacebar}
                      class="mr-2 text-primary-500"
                    />
                    <span class="text-gray-900 dark:text-white">Split spacebar (3u+1u+3u)</span>
                  </label>
                </div>
              {/if}
              
              <!-- Other Split Options -->
              <div class="space-y-1">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Keys</h4>
                <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                  <input
                    type="checkbox"
                    bind:checked={rightShiftSplit}
                    class="mr-2 text-primary-500"
                  />
                  <span class="text-gray-900 dark:text-white">Right shift split</span>
                </label>
                
                <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                  <input
                    type="checkbox"
                    bind:checked={leftShiftSplit}
                    class="mr-2 text-primary-500"
                  />
                  <span class="text-gray-900 dark:text-white">Left shift split</span>
                </label>
                
                <label class="flex items-center text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                  <input
                    type="checkbox"
                    bind:checked={splitBackspace}
                    class="mr-2 text-primary-500"
                  />
                  <span class="text-gray-900 dark:text-white">Split backspace</span>
                </label>
              </div>
              
              <!-- Apply Button -->
              <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <button
                  class="w-full px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium {$glassmorphismMode
                    ? 'glassmorphism-button text-gray-900 dark:text-white'
                    : 'bg-primary-500 text-white hover:bg-primary-600'}"
                  onclick={() => {
                    // Apply layout configuration logic here
                    console.log('Layout config applied:', {
                      bottomRowConfig,
                      splitSpacebar,
                      rightShiftSplit,
                      leftShiftSplit,
                      splitBackspace
                    });
                    showLayoutMenu = false;
                  }}
                >
                  Apply Configuration
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    <!-- Component for adjust part -->

    <!-- Global KeyboardRender - only show when connected -->
    {#if keyboardAPI.shouldShowConfigurator && !$page.url.pathname.includes('/about')}
      <div class="relative">
        <KeyboardRender keys={keyboard_keys}/>
      </div>
    {/if}

    <!-- Connection Interface when not connected and on root page -->
    {#if !keyboardAPI.shouldShowConfigurator && $page.url.pathname === '/'}
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-2xl mx-auto">
          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
            </div>
          </div>

          <!-- Connection Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Connect Physical Device -->
            <div class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} transition-all duration-200 hover:shadow-lg">
              <div class="text-center mb-4">
                <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('welcome.connectKeyboard', currentLanguage)}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('welcome.connectDescription', currentLanguage)}
                </p>
              </div>
              
              <button
                class="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode ? 'glassmorphism-button' : ''}"
                onclick={async () => {
                  const success = await keyboardAPI.connect();
                  // Navigation is handled automatically by keyboardAPI
                }}
                disabled={keyboardAPI.state.connectionStatus === 'connecting' || isEnteringDemo}
              >
                {#if keyboardAPI.state.connectionStatus === 'connecting'}
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    {t('welcome.connecting', currentLanguage)}
                  </div>
                {:else}
                  {t('welcome.getStarted', currentLanguage)}
                {/if}
              </button>
            </div>

            <!-- Demo Mode -->
            <div class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} transition-all duration-200 hover:shadow-lg relative">
              <div class="text-center mb-4">
                <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('welcome.tryDemo', currentLanguage)}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('welcome.demoDescription', currentLanguage)}
                </p>
              </div>
              
              <button
                class="w-full px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode ? 'glassmorphism-button' : ''} flex items-center justify-center gap-2"
                onclick={() => (showDemoDropdown = !showDemoDropdown)}
                disabled={keyboardAPI.state.connectionStatus === 'connecting' || isEnteringDemo}
              >
                {#if isEnteringDemo}
                  <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  {t('demo.entering', currentLanguage)}
                {:else}
                  {t('demo.selectKeyboard', currentLanguage)}
                  <svg class="w-4 h-4 transition-transform duration-200" class:rotate-180={showDemoDropdown} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                {/if}
              </button>

              <!-- Demo Dropdown -->
              {#if showDemoDropdown && !isEnteringDemo}
                <div class="absolute top-full left-6 right-6 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 {$glassmorphismMode ? 'glassmorphism-card' : ''}" transition:slide={{ duration: 300, axis: 'y' }}>
                  <div class="p-2">
                    <button
                      class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      disabled={isEnteringDemo}
                      onclick={async () => {
                        isEnteringDemo = true;
                        showDemoDropdown = false;
                        
                        // Small delay for better UX
                        await new Promise(resolve => setTimeout(resolve, 300));
                        keyboardAPI.enterDemoMode('zellia60he');
                        
                        // Reset state after navigation
                        setTimeout(() => {
                          isEnteringDemo = false;
                        }, 800);
                      }}
                    >
                      <div class="flex items-center gap-3">
                        <div>
                          <div class="font-medium text-gray-900 dark:text-white">Zellia 60HE</div>
                          <div class="text-sm text-gray-500 dark:text-gray-400">{t('demo.zellia60.description', currentLanguage)}</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      disabled={isEnteringDemo}
                      onclick={async () => {
                        isEnteringDemo = true;
                        showDemoDropdown = false;
                        
                        // Small delay for better UX
                        await new Promise(resolve => setTimeout(resolve, 300));
                        keyboardAPI.enterDemoMode('zellia80he');
                        
                        // Reset state after navigation
                        setTimeout(() => {
                          isEnteringDemo = false;
                        }, 800);
                      }}
                    >
                      <div class="flex items-center gap-3">
                        <div>
                          <div class="font-medium text-gray-900 dark:text-white">Zellia 80HE</div>
                          <div class="text-sm text-gray-500 dark:text-gray-400">{t('demo.zellia80.description', currentLanguage)}</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Connection Error Display -->
          {#if keyboardAPI.state.error}
            <div class="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" transition:fade>
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <div class="text-sm font-medium text-red-800 dark:text-red-200">Connection Failed</div>
                  <div class="text-sm text-red-600 dark:text-red-300">{keyboardAPI.state.error}</div>
                </div>
              </div>
            </div>
          {/if}

          <!-- USB HID Warning -->
          <div class="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" transition:fade>
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {t('ui.usbHubWarning', currentLanguage)}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if keyboardAPI.shouldShowConfigurator}
      {@render children()}
    {:else}
      <!-- Fallback content for pages when not connected -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="text-center">
          <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Keyboard Connected
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Please connect a keyboard or go to the home page to start.
          </p>
          <button
            class="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200"
            onclick={() => goto('/')}
          >
            Go to Home
          </button>
        </div>
      </div>
    {/if}
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