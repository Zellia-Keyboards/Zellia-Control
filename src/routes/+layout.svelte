<script lang="ts">
  import '../app.css';
  import KeyboardRender from '$lib/components/KeyboardRender.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import * as kle from '@ijprest/kle-serial';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys, rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import { keyboardLayout as keyboardLayoutStore } from '$lib/stores/LayoutStore.svelte';
  import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
  import SmallScreenWarning from '$lib/components/layout/SmallScreenWarning.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import LayerSelector from '$lib/components/layout/LayerSelector.svelte';
  import LayoutConfigDropdown from '$lib/components/layout/LayoutConfigDropdown.svelte';
  import ConnectionInterface from '$lib/components/layout/ConnectionInterface.svelte';
  import { SIDEBAR_PAGES, LAYER_SELECTOR_PAGES } from '$lib/config/navigation';
  
  let { children } = $props();
  let showFirefoxWarning = $state(false);
  let firefoxWarningDismissed = $state(false);
  let isLoadingConfigurator = $state(false);
  let currentLanguage = $derived($language);

  // Keyboard layout for global KeyboardRender
  let layout = $derived($keyboardLayoutStore);
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
    if (isActive('/lighting')) {
      newKeys.forEach((key, index)=>{
        const rgb_config = $rgbConfigs[index];
        let labels = newKeys[index].labels;
        labels = labels.map(() => "");
        switch (rgb_config.mode) {
          case ekc.RGBMode.RgbModeStatic: {
            labels[3] = `Static`;
            break;
          }
          case ekc.RGBMode.RgbModeLinear: {
            labels[3] = `reactive`;
            break;
          }
          case ekc.RGBMode.RgbModeFadingDiamondRipple: {
            labels[3] = `ripple`;
            break;
          }
          default: {
            break;
          }
        }
        newKeys[index].labels = labels;
      });
    }
    return newKeys
  
  });

  // Check if current page should use the sidebar layout
  const usesSidebarLayout = $derived(() => {
    const path = $page.url.pathname;
    return SIDEBAR_PAGES.some(sidebarPage => path === sidebarPage || path.startsWith(sidebarPage + '/'));
  });

  // Always show the sidebar layout for configurator pages and root page
  const shouldShowConfiguratorLayout = $derived(() => {
    return usesSidebarLayout() || $page.url.pathname === '/';
  });

  // Derived variable to determine when to show layer selector
  let shouldShowLayerSelector = $derived(() => {
    const path = $page.url.pathname;
    return LAYER_SELECTOR_PAGES.some(page => path === page || path.startsWith(page + '/'));
  });

  function isActive(href: string): boolean {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
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
  <!-- Small Screen Warning -->
  <SmallScreenWarning />

  <!-- Main Application (hidden on small screens) -->
  <div class="hidden xl:flex h-screen bg-gray-50 dark:bg-black">
  <!-- Sidebar -->
  <Sidebar />
  <!-- Main Content -->
  <div
    class="flex-1 flex flex-col gap-4 px-4 overflow-y-scroll {$glassmorphismMode
      ? 'glassmorphism-main'
      : 'bg-primary-50/20 dark:bg-black/20'}"
  >
    <!-- Layer selector and Layout toggle (only show when connected and not on /about or /profiles) -->
    {#if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator && !$page.url.pathname.includes('/about') && !$page.url.pathname.includes('/profiles')}
      <div class="flex items-center justify-between -mb-3">
        <LayerSelector shouldShow={shouldShowLayerSelector()} />

        <div class="flex items-center gap-3 px-4 py-2">
          <!-- Profile Dropdown -->
          <ProfileDropdown />

          <!-- Layout Configuration Dropdown -->
          <LayoutConfigDropdown />
        </div>
      </div>
    {/if}
    <!-- Component for adjust part -->

    <!-- Global KeyboardRender - only show when connected and not on /about or /profiles -->
    {#if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator && !$page.url.pathname.includes('/about') && !$page.url.pathname.includes('/profiles')}
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
      <ConnectionInterface />
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
</style>
