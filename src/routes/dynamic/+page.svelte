<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import {
    LayoutTemplateIcon,
    ToggleLeftIcon,
    LayersIcon,
    MoveHorizontalIcon,
  } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';

  // Import mode components
  import ModeSelectionView from '$lib/components/advancedkey/ModeSelectionView.svelte';
  import TapHoldMode from '$lib/components/advancedkey/TapHoldMode.svelte';
  import ToggleMode from '$lib/components/advancedkey/ToggleMode.svelte';
  import NullBindMode from '$lib/components/advancedkey/NullBindMode.svelte';
  import DynamicMode from '$lib/components/advancedkey/DynamicMode.svelte';

  let currentLanguage = $state($language);
  let selectedMode = $state<string | null>(null);

  // Available advanced key modes
  const keyModes = $derived([
    {
      id: 'tap-hold',
      name: t('advancedkey.tapHold', currentLanguage),
      description: t('advancedkey.tapHoldDesc', currentLanguage),
      icon: LayoutTemplateIcon,
      features: [
        t('advancedkey.tapHoldFeature1', currentLanguage),
        t('advancedkey.tapHoldFeature2', currentLanguage),
        t('advancedkey.tapHoldFeature3', currentLanguage),
        t('advancedkey.tapHoldFeature4', currentLanguage),
      ],
    },
    {
      id: 'toggle',
      name: t('advancedkey.toggle', currentLanguage),
      description: t('advancedkey.toggleDesc', currentLanguage),
      icon: ToggleLeftIcon,
      features: [
        t('advancedkey.toggleFeature1', currentLanguage),
        t('advancedkey.toggleFeature2', currentLanguage),
        t('advancedkey.toggleFeature3', currentLanguage),
        t('advancedkey.toggleFeature4', currentLanguage),
      ],
    },
    {
      id: 'dynamic',
      name: t('advancedkey.dynamic', currentLanguage),
      description: t('advancedkey.dynamicDesc', currentLanguage),
      icon: LayersIcon,
      features: [
        t('advancedkey.dynamicFeature1', currentLanguage),
        t('advancedkey.dynamicFeature2', currentLanguage),
        t('advancedkey.dynamicFeature3', currentLanguage),
        t('advancedkey.dynamicFeature4', currentLanguage),
      ],
    },
    {
      id: 'null-bind',
      name: t('advancedkey.nullBind', currentLanguage),
      description: t('advancedkey.nullBindDesc', currentLanguage),
      icon: MoveHorizontalIcon,
      features: [
        t('advancedkey.nullBindFeature1', currentLanguage),
        t('advancedkey.nullBindFeature2', currentLanguage),
        t('advancedkey.nullBindFeature3', currentLanguage),
        t('advancedkey.nullBindFeature4', currentLanguage),
      ],
    },
  ]);

  function selectMode(modeId: string): void {
    selectedMode = modeId;
  }

  function goBackToModeSelection(): void {
    selectedMode = null;
  }

  // For Dynamic mode - track selected key coordinates
  let dksCurrentSelected = $state<[number, number] | null>(null);

  const dksCurrentKeyName = $derived.by(() => {
    if (!dksCurrentSelected) return 'No key selected';
    const controller = keyboardAPI.state.controller;
    if (!controller) return 'Unknown';

    try {
      const layoutJson = controller.get_layout_json();
      const layout = JSON.parse(layoutJson);
      const key = layout[dksCurrentSelected[1]];
      return key?.labels?.find((l: string) => l && l.trim()) || 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  });

  // Update DKS selection when selectedKeys changes (for dynamic mode)
  $effect(() => {
    if (selectedMode === 'dynamic' && $selectedKeys.length > 0) {
      // For DKS, we need both layer and key index
      // Assuming layer 0 for now - you may need to get the actual layer
      dksCurrentSelected = [0, $selectedKeys[0]];
    } else if (selectedMode === 'dynamic') {
      dksCurrentSelected = null;
    }
  });
</script>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''} text-black bg-primary-100 dark:bg-black dark:text-white border-0 dark:border dark:border-gray-600 {selectedMode
    ? ''
    : 'h-full'} flex flex-col"
>
  {#if selectedMode === null}
    <ModeSelectionView {keyModes} onSelectMode={selectMode} />
  {:else if selectedMode === 'tap-hold'}
    <TapHoldMode onBack={goBackToModeSelection} />
  {:else if selectedMode === 'toggle'}
    <ToggleMode onBack={goBackToModeSelection} />
  {:else if selectedMode === 'null-bind'}
    <NullBindMode onBack={goBackToModeSelection} />
  {:else if selectedMode === 'dynamic'}
    <DynamicMode
      onBack={goBackToModeSelection}
      bind:currentSelected={dksCurrentSelected}
      currentKeyName={dksCurrentKeyName}
    />
  {:else}
    <!-- Fallback for unknown modes -->
    <div class="flex items-center justify-center h-full">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {keyModes.find(m => m.id === selectedMode)?.name} Mode
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">Coming soon...</p>
        <button
          class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
          onclick={goBackToModeSelection}
        >
          Back to Mode Selection
        </button>
      </div>
    </div>
  {/if}
</div>
