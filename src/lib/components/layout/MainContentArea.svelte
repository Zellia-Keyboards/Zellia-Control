<script lang="ts">
  import KeyboardRender from '$lib/components/KeyboardRender.svelte';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { page } from '$app/stores';
  import ToolbarSection from './ToolbarSection.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';
  import ConnectionInterface from './ConnectionInterface.svelte';
  import NotConnectedFallback from './NotConnectedFallback.svelte';
  import type * as kle from '@ijprest/kle-serial';

  let {
    children,
    keyboardKeys = [] as kle.Key[],
    isLoadingConfigurator = false,
    shouldShowLayerSelector = false,
  } = $props();

  // Helper to check if we should hide keyboard and toolbar
  let shouldHideKeyboardAndToolbar = $derived(
    $page.url.pathname.includes('/about') ||
    $page.url.pathname.includes('/profiles') ||
    $page.url.pathname.includes('/debug') ||
    $page.url.pathname.includes('/settings') ||
    $page.url.pathname.includes('/update')
  );

  // Helper to check if we're on performance page (for smaller key labels)
  let isPerformancePage = $derived(
    $page.url.pathname.includes('/performance')
  );

  // Helper to check if we're on lighting page (for even smaller key labels)
  let isLightingPage = $derived(
    $page.url.pathname.includes('/lighting')
  );
</script>

<!-- Layer selector and Layout toggle (only show when connected and not on /about or /profiles) -->
{#if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator && !shouldHideKeyboardAndToolbar}
  <ToolbarSection {shouldShowLayerSelector} />
{/if}

<!-- Global KeyboardRender - only show when connected and not on /about or /profiles -->
{#if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator && !shouldHideKeyboardAndToolbar}
  <div class="relative" class:performance-page-keys={isPerformancePage} class:lighting-page-keys={isLightingPage}>
    <KeyboardRender keys={keyboardKeys} />
  </div>
{/if}

<!-- Loading overlay while configurator is loading -->
{#if isLoadingConfigurator}
  <LoadingOverlay />
  <!-- Connection Interface when not connected and on root page -->
{:else if !keyboardAPI.shouldShowConfigurator && $page.url.pathname === '/'}
  <ConnectionInterface />
{:else if keyboardAPI.shouldShowConfigurator && !isLoadingConfigurator}
  {@render children()}
{:else}
  <!-- Fallback content for pages when not connected -->
  <NotConnectedFallback />
{/if}
