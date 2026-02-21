<script lang="ts">
  import '../app.css';
  import { keyboardAPI} from '$lib/api/keyboardAPI.svelte';
  import * as kle from '@ijprest/kle-serial';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { language } from '$lib/stores/LanguageStore.svelte';
  import { advancedKeys, rgbConfigs, keymap, dynamicKeys } from '$lib/stores/ControllerStore.svelte';
  import { keyboardLayout as keyboardLayoutStore } from '$lib/stores/LayoutStore.svelte';
  import SmallScreenWarning from '$lib/components/layout/SmallScreenWarning.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import MainContentArea from '$lib/components/layout/MainContentArea.svelte';
  import { shouldShowConfiguratorLayout, shouldShowLayerSelector } from '$lib/utils/layoutHelpers';
  import { transformKeyboardKeys, mapToExtendedKeys, type ExtendedKey } from '$lib/utils/keyboardKeyTransformer.svelte';
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';

  let { children } = $props();
  let isLoadingConfigurator = $state(false);
  let currentLanguage = $derived($language);


  // Keyboard layout for global KeyboardRender
  let layout = $derived($keyboardLayoutStore);
  let rawKeyboardLayout: kle.Key[] = $derived(kle.Serial.deserialize(JSON.parse(layout)).keys);

  // Map raw KLE keys to ExtendedKeys with parsed id and layoutGroup
  let extendedKeys: ExtendedKey[] = $derived(mapToExtendedKeys(rawKeyboardLayout));

  // Transform keyboard keys based on the active page
  let keyboardKeys: ExtendedKey[] = $derived.by(() => {
    return transformKeyboardKeys(extendedKeys, $advancedKeys, $rgbConfigs, page.url.pathname, $keymap, $selectedLayer, $dynamicKeys);
  });

  // Derived variables for layout state
  let shouldShowLayout = $derived(shouldShowConfiguratorLayout(page.url.pathname));
  let showLayerSelector = $derived(shouldShowLayerSelector(page.url.pathname));

  // Set page language for accessibility
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;
    }
  });

  // Centralized navigation logic - single source of truth
  let navigationInProgress = $state(false);

  $effect(() => {
    if (navigationInProgress) return; // Prevent navigation loops

    const path = page.url.pathname;
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
      // Small delay to let loading animation complete
      setTimeout(() => {
        isLoadingConfigurator = false;
      }, 10);
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
  <div class="hidden xl:flex h-screen bg-gray-50 dark:bg-black overflow-hidden">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div
      class="flex-1 flex flex-col overflow-y-scroll overflow-x-hidden isolate glassmorphism-main"
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
