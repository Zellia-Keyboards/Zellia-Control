<script lang="ts">
  import '../app.css';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import * as kle from '@ijprest/kle-serial';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language } from '$lib/stores/LanguageStore.svelte';
  import { advancedKeys, rgbConfigs, keymap } from '$lib/stores/ControllerStore.svelte';
  import { keyboardLayout as keyboardLayoutStore } from '$lib/stores/LayoutStore.svelte';
  import SmallScreenWarning from '$lib/components/layout/SmallScreenWarning.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MainContentArea from '$lib/components/layout/MainContentArea.svelte';
  import { shouldShowConfiguratorLayout, shouldShowLayerSelector } from '$lib/utils/layoutHelpers';
  import { transformKeyboardKeys } from '$lib/utils/keyboardKeyTransformer.svelte';

  let { children } = $props();
  let showFirefoxWarning = $state(false);
  let firefoxWarningDismissed = $state(false);
  let isLoadingConfigurator = $state(false);
  let currentLanguage = $derived($language);

  // Keyboard layout for global KeyboardRender
  let layout = $derived($keyboardLayoutStore);
  let keyboardLayout: kle.Key[] = $derived(kle.Serial.deserialize(JSON.parse(layout)).keys);

  // Transform keyboard keys based on the active page
  let keyboardKeys: kle.Key[] = $derived.by(() => {
    console.log(`Active page: ${$page.url.pathname}`);
    return transformKeyboardKeys(keyboardLayout, $advancedKeys, $rgbConfigs, $page.url.pathname);
  });

  // Derived variables for layout state
  let shouldShowLayout = $derived(shouldShowConfiguratorLayout($page.url.pathname));
  let showLayerSelector = $derived(shouldShowLayerSelector($page.url.pathname));

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
      setTimeout(() => (navigationInProgress = false), 100);
      return;
    }
  });

  // Handle loading state for smooth connection transition
  $effect(() => {
    if (keyboardAPI.state.connectionStatus === 'connecting') {
      isLoadingConfigurator = true;
    } else if (
      keyboardAPI.state.connectionStatus === 'connected' &&
      keyboardAPI.shouldShowConfigurator
    ) {
      // Add a small delay to ensure everything is loaded before showing the configurator
      setTimeout(() => {
        isLoadingConfigurator = false;
      }, 400);
    } else if (
      keyboardAPI.state.connectionStatus === 'error' ||
      keyboardAPI.state.connectionStatus === 'disconnected'
    ) {
      isLoadingConfigurator = false;
    }
  });
</script>

<!-- Main Application -->
{#if shouldShowLayout}
  <!-- Small Screen Warning -->
  <SmallScreenWarning />

  <!-- Main Application (hidden on small screens) -->
  <div class="hidden xl:flex h-screen bg-gray-50 dark:bg-black">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div
      class="flex-1 flex flex-col overflow-y-scroll {$glassmorphismMode
        ? 'glassmorphism-main'
        : 'bg-primary-50/20 dark:bg-black/20'}"
      style="gap: calc(1rem * var(--ui-scale, 1)); padding: calc(1rem * var(--ui-scale, 1));"
    >
      <MainContentArea
        {children}
        {keyboardKeys}
        {isLoadingConfigurator}
        shouldShowLayerSelector={showLayerSelector}
      />
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
