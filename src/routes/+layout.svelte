<script lang="ts">
  import '../app.css';
  import KeyboardRender from '$lib/KeyboardRender.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/keyboardAPI.svelte';
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
  import { Palette, Sun, Moon, Globe, Settings, AwardIcon } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys } from '$lib/ControllerStore.svelte';
  
  const NAVIGATE = [
    ['/performance', 'nav.performance'],
    ['/remap', 'nav.remap'],
    ['/lighting', 'nav.lighting'],
    ['/advancedkey', 'nav.advancedkey'],
    ['/debug', 'nav.debug'],
    ['/settings', 'nav.settings'],
    ['/update', 'nav.update'],
    ['/about', 'nav.about'],
  ];
  
  let { children } = $props();
  let selectedLayer = $state(1);
  let showDropdown = $state(false);
  let showThemeSelector = $state(false);
  let showFirefoxWarning = $state(false);
  let firefoxWarningDismissed = $state(false);
  let currentTheme = $state<ThemeColorName | null>(null);
  let showLayoutMenu = $state(false);
  let showDemoDropdown = $state(false);
  let isEnteringDemo = $state(false);
  let isLoadingConfigurator = $state(false);
  
  // Layout configuration state
  let bottomRowConfig = $state<'6.25u' | '7u'>('6.25u');
  let splitSpacebar = $state(false);
  let rightShiftSplit = $state(false);
  let leftShiftSplit = $state(false);
  let splitBackspace = $state(false);
  
  // Make language reactive to store changes
  let currentLanguage = $derived($language);

  // Keyboard layout for global KeyboardRender
  let layout = $state(`[]`);
  let keyboardLayout : kle.Key[] = $derived(kle.Serial.deserialize(JSON.parse(layout)).keys);
  let keyboardKeys: kle.Key[] = $derived.by(() => {
        console.log(`isActive('/performance')?`, isActive('/performance'));
    console.log(`isActive('/remap')?`, isActive('/remap'));
    let newKeys = keyboardLayout.map(key => {
    const newKey = JSON.parse(JSON.stringify(key));
      return newKey;
    });
    if (isActive('/performance')) {
      newKeys.forEach((key, index)=>{
        const advanced_key = $advancedKeys[index];
        let labels = newKeys[index].labels;
        labels = labels.map(() => "");
        switch (advanced_key.mode) {
          case ekc.KeyMode.KeyAnalogNormalMode: {
            labels[3] = `↓${Math.round(advanced_key.activation_value * 1000) / 10}\t↑${Math.round(advanced_key.deactivation_value * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogRapidMode: {
            labels[3] = `↓${Math.round(advanced_key.trigger_distance * 1000) / 10}\t↑${Math.round(advanced_key.release_distance * 1000) / 10}`;
            labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogSpeedMode: {
            labels[3] = `↓${Math.round(advanced_key.trigger_speed * 1000) / 10}\t↑${Math.round(advanced_key.release_speed * 1000) / 10}`;
            labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
            break;
          }
          default: {
            break;
          }
        }
        newKeys[index].labels = labels;
      });
    }
    if (isActive('/remap')) {
      newKeys.forEach((key, index)=>{
        newKeys[index].labels[0] = "2";
      });
    }
    return newKeys
  
  });

  // Controller variables


  // Check if current page should use the sidebar layout
  const usesSidebarLayout = $derived(() => {
    const path = $page.url.pathname;
    const sidebarPages = ['/performance', '/remap', '/lighting', '/advancedkey', '/debug', '/settings', '/about', '/update'];
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

  // Handle loading state for smooth connection transition
  $effect(() => {
    if (keyboardAPI.state.connectionStatus === 'connecting') {
      isLoadingConfigurator = true;
    } else if (keyboardAPI.state.connectionStatus === 'connected' && keyboardAPI.shouldShowConfigurator) {
      // Add a small delay to ensure everything is loaded before showing the configurator
      setTimeout(() => {
        isLoadingConfigurator = false;
      }, 400);
    } else if (keyboardAPI.state.connectionStatus === 'error' || keyboardAPI.state.connectionStatus === 'disconnected') {
      isLoadingConfigurator = false;
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
    class="sidebar flex flex-col w-52 dark:bg-black dark:border-gray-600 bg-white border-gray-200 {$glassmorphismMode
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
      <div class="flex items-center gap-2 mb-2">
        <Globe class="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-white">{t('ui.language', currentLanguage)}</span>
      </div>
      
      <!-- Language Switch Button with Animation -->
      <div class="relative inline-flex w-full rounded-lg p-1 {$glassmorphismMode ? 'glassmorphism-card' : 'bg-gray-100 dark:bg-gray-800'}">
        <!-- Animated sliding background with glassmorphism -->
        <div 
          class="language-switch-slider absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-out shadow-lg language-slider-bg {!$glassmorphismMode && !currentTheme ? 'bg-gray-900 dark:bg-white' : $glassmorphismMode && !currentTheme ? '' : $glassmorphismMode ? '' : 'bg-primary-500'}"
          style="left: {currentLanguage === 'en' ? '4px' : 'calc(50% + 0px)'}; transform: translateZ(0); {$glassmorphismMode && currentTheme ? `
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            background: linear-gradient(135deg, 
              ${themeColors[currentTheme]}CC, 
              ${themeColors[currentTheme]}99
            );
            box-shadow: 
              0 8px 16px -4px ${themeColors[currentTheme]}40,
              0 4px 8px -2px ${themeColors[currentTheme]}30,
              inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
              inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
            border: 1px solid ${themeColors[currentTheme]}33;
          ` : ''}"
        ></div>
        
        <!-- Language buttons -->
        <button
          class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative z-10 {currentLanguage === 'en'
            ? (!currentTheme && !$glassmorphismMode ? 'text-white dark:text-gray-900 font-semibold' : 'text-white font-semibold')
            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => setLanguage('en')}
        >
          EN
        </button>
        <button
          class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative z-10 {currentLanguage === 'zh'
            ? (!currentTheme && !$glassmorphismMode ? 'text-white dark:text-gray-900 font-semibold' : 'text-white font-semibold')
            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => setLanguage('zh')}
        >
          中文
        </button>
      </div>
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
    {#if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator}
      <div class="flex items-center justify-between -mb-3">
        <div class="layer-selector flex items-center gap-2 px-4 py-2 h-12">
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
    {#if keyboardAPI.shouldShowConfigurator && !$page.url.pathname.includes('/about') && !isLoadingConfigurator}
      <div class="relative">
        <KeyboardRender keys={keyboardKeys}/>
      </div>
    {/if}

    <!-- Loading overlay while configurator is loading -->
    {#if isLoadingConfigurator}
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="text-center p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} shadow-xl">
          <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse {$glassmorphismMode ? 'glassmorphism-button' : ''}">
            <svg class="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {keyboardAPI.state.isDemoMode ? t('demo.entering', currentLanguage) : t('welcome.connecting', currentLanguage)}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {t('welcome.loadingConfigurator', currentLanguage)}
          </p>
        </div>
      </div>
    <!-- Connection Interface when not connected and on root page -->
    {:else if !keyboardAPI.shouldShowConfigurator && $page.url.pathname === '/'}
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
                  layout = keyboardConnectionState.controller?.get_layout_json() as string;
                  advancedKeys.set(keyboardConnectionState.controller?.get_advanced_keys() as ekc.IAdvancedKey[]);
                  //api.send_advanced_key_packet([0], new ekc.AdvancedKey());
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
            <div class="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" >
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
          <div class="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
    {:else if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator}
      {@render children()}
    {:else}
      <!-- Fallback content for pages when not connected -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="text-center p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
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
            class="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
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

  .sidebar {
    user-select: none;
  }

  .layer-selector {
    user-select: none;
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

  /* Language switch slider - ensures smooth animation */
  .language-switch-slider {
    will-change: left;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Glassmorphism default styling for language slider (no theme) */
  .language-slider-bg:not(.bg-gray-900):not(.bg-white):not(.bg-primary-500) {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: linear-gradient(135deg, 
      rgba(17, 24, 39, 0.85), 
      rgba(17, 24, 39, 0.7)
    );
    box-shadow: 
      0 8px 16px -4px rgba(0, 0, 0, 0.25),
      0 4px 8px -2px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  /* Dark mode: use white glassmorphism when no theme is selected */
  :global(.dark) .language-slider-bg:not(.bg-gray-900):not(.bg-white):not(.bg-primary-500) {
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.85), 
      rgba(255, 255, 255, 0.7)
    );
    box-shadow: 
      0 8px 16px -4px rgba(255, 255, 255, 0.25),
      0 4px 8px -2px rgba(255, 255, 255, 0.2),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
</style>