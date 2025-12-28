<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import {
    LayoutTemplateIcon,
    ToggleLeftIcon,
    LayersIcon,
    MoveHorizontalIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    ArrowLeftIcon,
  } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys, deselectAll } from '$lib/stores/SelectedKeysStore';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
  } from '$lib/types/AdvancedKeyShared';
  import * as ekc from 'emi-keyboard-controller';

  // Import mode components
  import ModeSelectionView from '$lib/components/advancedkey/ModeSelectionView.svelte';
  import TapHoldMode from '$lib/components/advancedkey/TapHoldMode.svelte';
  import ToggleMode from '$lib/components/advancedkey/ToggleMode.svelte';
  import NullBindMode from '$lib/components/advancedkey/NullBindMode.svelte';
  import DynamicMode from '$lib/components/advancedkey/DynamicMode.svelte';

  let currentLanguage = $state($language);
  let selectedMode = $state<string | null>(null);
  let editingKeyIndex = $state<number | null>(null);

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
    editingKeyIndex = null;
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
      if (key && key.labels) {
        const label =
          key.labels[4] ||
          key.labels[0] ||
          key.labels.find((l: string) => l && l.trim() !== '');
        return label || 'Unknown';
      }
      return 'Unknown';
    } catch (e) {
      console.error('Error getting key label:', e);
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

  // Data table functionality for configured keys
  interface ConfiguredKeyRow {
    id: string;
    type: string;
    keyName: string;
    keyId: string;
    config: any;
  }

  let configuredKeys = $state<ConfiguredKeyRow[]>([]);

  function updateConfiguredKeys() {
    const keys: ConfiguredKeyRow[] = [];

    Object.entries($globalConfigurations).forEach(([keyId, config]) => {
      const controller = keyboardAPI.state.controller;
      if (controller) {
        try {
          const layoutJson = controller.get_layout_json();
          const layout = JSON.parse(layoutJson);
          const [layer, keyIndex] = keyId.split(',').map(Number);
          const key = layout[keyIndex];
          const keyName = key?.labels?.find((l: string) => l && l.trim()) || 'Unknown';

          let typeLabel = '';
          switch (config.type) {
            case 'dynamic':
              typeLabel = 'Dynamic Key';
              break;
            case 'tap-hold':
              typeLabel = 'Tap Hold';
              break;
            case 'toggle':
              typeLabel = 'Toggle';
              break;
            case 'null-bind':
              typeLabel = 'Null Bind';
              break;
          }

          keys.push({
            id: keyId,
            type: typeLabel,
            keyName,
            keyId,
            config,
          });
        } catch (e) {
          console.error('Error parsing key layout:', e);
        }
      }
    });

    configuredKeys = keys.sort((a, b) => a.keyName.localeCompare(b.keyName));
  }

  $effect(() => {
    updateConfiguredKeys();
  });

  function editConfiguredKey(keyId: string) {
    // Find the type of configuration and select the appropriate mode
    const config = $globalConfigurations[keyId];
    if (config) {
      // Set the selected key for editing
      const [layer, keyIndex] = keyId.split(',').map(Number);
      selectedKeys.set([keyIndex]);
      editingKeyIndex = keyIndex;

      // Switch to the appropriate mode
      switch (config.type) {
        case 'dynamic':
          selectedMode = 'dynamic';
          break;
        case 'tap-hold':
          selectedMode = 'tap-hold';
          break;
        case 'toggle':
          selectedMode = 'toggle';
          break;
        case 'null-bind':
          selectedMode = 'null-bind';
          break;
      }
    }
  }

  function deleteConfiguredKey(keyId: string) {
    resetGlobalConfiguration(keyId);
  }

  function createNewKey(modeId: string) {
    selectedMode = modeId;
    editingKeyIndex = null;
    // Clear selected keys to start fresh
    selectedKeys.set([]);
  }
</script>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow glassmorphism-card text-black bg-primary-100 dark:bg-black dark:text-white border-0 dark:border dark:border-gray-600 {selectedMode
    ? ''
    : 'h-full'} flex flex-col"
>
  {#if selectedMode === null}
    <!-- Main dashboard view with mode selection and configured keys table -->
    <div class="flex flex-col gap-6 h-full">
      <!-- Title section -->
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('advancedkey.title', currentLanguage)}
      </h1>
      <!-- Main content area -->
      <div class="flex gap-6 flex-1">
        <!-- Left panel: Mode selection -->
        <div class="w-96 flex-shrink-0">
          <div
            class="rounded-lg border p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card"
          >
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('advancedkey.step1Title', currentLanguage)}
            </h2>
            <div class="space-y-3">
              {#each keyModes as mode}
                <button
                  class="w-full text-left p-4 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02] glassmorphism-button border-gray-200 dark:border-gray-600"
                  onclick={() => createNewKey(mode.id)}
                >
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                      <mode.icon class="w-8 h-8 text-primary-500" />
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900 dark:text-white">
                        {mode.name}
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Right panel: Configured keys table -->
        <div class="flex-1 flex flex-col">
          <div
            class="rounded-lg border flex-1 flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card"
          >
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                {t('advancedkey.configuredDynamicKeys', currentLanguage)} (configuredKeys.length)
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('advancedkey.infoDesc', currentLanguage)}
              </p>
            </div>

            <div class="flex-1 overflow-y-auto p-6">
              {#if configuredKeys.length === 0}
                <div class="flex items-center justify-center h-full">
                  <div class="text-center">
                    <div
                      class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center glassmorphism-card"
                    >
                      <LayersIcon class="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {t('ui.noProfilesAvailable', currentLanguage)}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                      {t('advancedkey.step1Desc', currentLanguage)}
                      {t('advancedkey.step2Desc', currentLanguage)}
                    </p>
                  </div>
                </div>
              {:else}
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-700">
                        <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                          >{t('common.key', currentLanguage)}</th
                        >
                        <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                          >{t('advancedkey.mode', currentLanguage)}</th
                        >
                        <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                          >{t('advancedkey.configuration', currentLanguage)}</th
                        >
                        <th class="text-center py-3 px-4 font-medium text-gray-900 dark:text-white"
                          >{t('common.actions', currentLanguage)}</th
                        >
                      </tr>
                    </thead>
                    <tbody>
                      {#each configuredKeys as key (key.id)}
                        <tr
                          class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td class="py-3 px-4">
                            <div class="flex items-center gap-2">
                              <div
                                class="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400"
                              >
                                {key.keyName.slice(0, 2).toUpperCase()}
                              </div>
                              <span class="font-medium text-gray-900 dark:text-white">
                                {key.keyName}
                              </span>
                            </div>
                          </td>
                          <td class="py-3 px-4">
                            <span
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                            >
                              {key.type}
                            </span>
                          </td>
                          <td class="py-3 px-4">
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                              {#if key.config.type === 'dynamic'}
                                {key.config.keycodes.filter((k: any) => k).length} bindings
                              {:else if key.config.type === 'tap-hold'}
                                Tap: {key.config.tapAction || 'None'} / Hold: {key.config
                                  .holdAction || 'None'}
                              {:else if key.config.type === 'toggle'}
                                {key.config.states?.length || 0} states
                              {:else if key.config.type === 'null-bind'}
                                Bottom out: {key.config.bottomOutPoint || 0}mm
                              {/if}
                            </div>
                          </td>
                          <td class="py-3 px-4">
                            <div class="flex items-center justify-center gap-2">
                              <button
                                class="p-1.5 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                                onclick={() => editConfiguredKey(key.id)}
                                title="Edit configuration"
                              >
                                <EditIcon class="w-4 h-4" />
                              </button>
                              <button
                                class="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                onclick={() => deleteConfiguredKey(key.id)}
                                title="Delete configuration"
                              >
                                <TrashIcon class="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
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
