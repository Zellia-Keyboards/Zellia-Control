<script lang="ts">
  import { goto } from '$app/navigation';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t, tPlaceholder } from '$lib/LanguageStore.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
    keyActions,
    type KeyConfiguration,
  } from '$lib/AdvancedKeyShared';
  import { selectedKeys } from '$lib/SelectedKeysStore';
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';

  let currentLanguage = $derived($language);

  let selectedToggleAction = $state('caps');
  let toggleMode = $state('press');
  let toggleState = $state(false);
  
  // Get the first selected key index (or null if none selected)
  let currentSelectedIndex = $derived($selectedKeys.length > 0 ? $selectedKeys[0] : null);

  // Animation state variables
  let deletingKeys = $state(new Set<string>());
  let newlyAddedKeys = $state(new Set<string>());
  let showConfiguredSection = $state(false);
  let sectionAnimationPlayed = $state(false);
  let previousKeyCount = $state(0);
  let lastAnimationTrigger = $state(0);

  function goBack(): void {
    goto('/advancedkey');
  }

  function getCurrentKeyConfiguration(): KeyConfiguration | null {
    if (currentSelectedIndex === null) return null;
    const keyId = `${currentSelectedIndex}`;
    return (
      $globalConfigurations[keyId] || {
        type: 'toggle',
        toggleAction: selectedToggleAction,
        toggleMode: toggleMode,
        toggleState: toggleState,
      }
    );
  }

  function updateConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;
    updateGlobalConfiguration(keyId, {
      type: 'toggle',
      toggleAction: selectedToggleAction,
      toggleMode: toggleMode,
      toggleState: toggleState,
    });
  }

  function deleteKey(keyId: string): void {
    // Add fade-out animation
    deletingKeys.add(keyId);
    deletingKeys = new Set(deletingKeys);

    setTimeout(() => {
      resetGlobalConfiguration(keyId);
      deletingKeys.delete(keyId);
      deletingKeys = new Set(deletingKeys);
    }, 500); // Match the animation duration
  }

  function applyConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;

    // Check if this is a new key being configured
    const isNewKey =
      !$globalConfigurations[keyId] || $globalConfigurations[keyId].type !== 'toggle';

    updateConfiguration();

    // Trigger animation for newly added key
    if (isNewKey) {
      newlyAddedKeys.add(keyId);
      newlyAddedKeys = new Set(newlyAddedKeys);
      setTimeout(() => {
        newlyAddedKeys.delete(keyId);
        newlyAddedKeys = new Set(newlyAddedKeys);
      }, 600); // Match the fade-in animation duration
    }

    console.log('Applying toggle configurations:', $globalConfigurations);
  }

  function resetAllToggleKeys(): void {
    const keysToDelete = [...configuredToggleKeys.map(([keyId]) => keyId)];

    // Add fade-out animation for all keys
    keysToDelete.forEach(keyId => {
      deletingKeys.add(keyId);
    });
    deletingKeys = new Set(deletingKeys);

    setTimeout(() => {
      keysToDelete.forEach(keyId => {
        resetGlobalConfiguration(keyId);
      });
      deletingKeys.clear();
      deletingKeys = new Set(deletingKeys);
    }, 500); // Match the animation duration
  }

  // Get key label from keyboard layout
  const currentKeyName = $derived.by(() => {
    if (currentSelectedIndex === null) return 'No key selected';
    const controller = keyboardAPI.state.controller;
    if (!controller) return 'Unknown';
    
    try {
      const layoutJson = controller.get_layout_json();
      const layout = JSON.parse(layoutJson);
      const keys = layout;
      
      if (keys && keys[currentSelectedIndex]) {
        const key = keys[currentSelectedIndex];
        // Return the first non-empty label
        if (key.labels && key.labels.length > 0) {
          const label = key.labels.find((l: string) => l && l.trim());
          if (label) return label;
        }
      }
    } catch (e) {
      console.error('Error getting key label:', e);
    }
    
    return `Key ${currentSelectedIndex}`;
  });

  // Load existing configuration when key selection changes
  $effect(() => {
    if (currentSelectedIndex !== null) {
      const keyId = `${currentSelectedIndex}`;
      const config = $globalConfigurations[keyId];
      if (config && config.type === 'toggle') {
        selectedToggleAction = config.toggleAction || 'caps';
        toggleMode = config.toggleMode || 'press';
        toggleState = config.toggleState || false;
      } else {
        // Reset to defaults when no configuration exists or switching to a new key
        selectedToggleAction = 'caps';
        toggleMode = 'press';
        toggleState = false;
      }
    }
  });

  // Toggle action categories
  const toggleCategories = [
    {
      name: 'System',
      actions: keyActions.filter(action => ['caps', 'num', 'scroll'].includes(action.id)),
    },
    {
      name: 'Modifiers',
      actions: keyActions.filter(action => ['ctrl', 'shift', 'alt', 'win'].includes(action.id)),
    },
    {
      name: 'Function',
      actions: keyActions.filter(action => action.category === 'Function').slice(0, 12),
    },
    {
      name: 'Letters',
      actions: keyActions.filter(action => action.category === 'Letter').slice(0, 20),
    },
  ];

  // Get configured toggle keys count
  const configuredToggleKeys = $derived(
    Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'toggle')
  );

  // Watch for changes in configured keys to trigger animations
  $effect(() => {
    const currentCount = configuredToggleKeys.length;
    const currentTime = Date.now();

    if (currentCount > 0) {
      if (!showConfiguredSection) {
        showConfiguredSection = true;
        // Only play section animation once per appearance
        if (!sectionAnimationPlayed || currentTime - lastAnimationTrigger > 1000) {
          sectionAnimationPlayed = true;
          lastAnimationTrigger = currentTime;
        }
      }
    } else {
      // Reset states when no keys are configured
      showConfiguredSection = false;
      sectionAnimationPlayed = false;
      deletingKeys.clear();
      newlyAddedKeys.clear();
    }

    previousKeyCount = currentCount;
  });
</script>


<div
  class="rounded-2xl shadow p-4 mt-2 mb-4 grow bg-white dark:bg-black text-black dark:text-white border-0 dark:border dark:border-gray-600 flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <!-- Header -->
  <div
    class="border-b px-6 py-4 {$glassmorphismMode
      ? ''
      : 'bg-primary-25 dark:bg-primary-950 border-primary-200 dark:border-primary-800'}"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          class="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          onclick={goBack}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('advancedkey.backToAdvanced', currentLanguage)}
        </button>
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            {t('advancedkey.toggleTitle', currentLanguage)}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {t('advancedkey.toggleSubtitle', currentLanguage)}
          </p>
        </div>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 bg-primary-600 hover:bg-primary-700 disabled:hover:bg-primary-600 {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          onclick={applyConfiguration}
          disabled={currentSelectedIndex === null}
        >
          {t('advancedkey.applyConfiguration', currentLanguage)}
        </button>
        <button
          class="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          onclick={resetAllToggleKeys}
        >
          {t('advancedkey.resetAllToggle', currentLanguage)}
        </button>
      </div>
    </div>
  </div>
  <!-- Main Content -->
  <div class="flex-1 p-4 sm:p-6">
    {#if currentSelectedIndex !== null}
      <div class="max-w-7xl mx-auto">
        <!-- Selected Key Info -->
        <div
          class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 mb-6 bg-white dark:bg-gray-900 {$glassmorphismMode
            ? 'glassmorphism-card'
            : ''}"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-primary-500 bg-primary-50 dark:bg-primary-900 {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                >
                  <span class="font-mono font-bold text-gray-900 dark:text-white"
                    >{currentKeyName}</span
                  >
                </div>
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">Selected Key</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Key Index: {currentSelectedIndex}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >{t('advancedkey.toggleState', currentLanguage)}:</span
              >
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full {toggleState ? 'bg-green-500' : 'bg-gray-400'}"
                ></div>
                <span
                  class="text-sm font-medium {toggleState
                    ? 'text-green-700'
                    : 'text-gray-600 dark:text-gray-400'}"
                >
                  {toggleState
                    ? t('advancedkey.enabled', currentLanguage)
                    : t('advancedkey.disabled', currentLanguage)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <!-- Configuration Panel -->
          <div class="xl:col-span-2 space-y-6">
            <!-- Toggle Action Selection -->
            <div
              class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
                ? 'glassmorphism-card'
                : ''}"
            >
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('advancedkey.toggleAction', currentLanguage)}
              </h3>

              <div class="space-y-4">
                {#each toggleCategories as category}
                  <div>
                    <h4 class="text-sm font-medium text-gray-700 dark:text-white mb-2">
                      {category.name}
                    </h4>
                    <div
                      class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2"
                    >
                      {#each category.actions as action}
                        <button
                          class="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1 {selectedToggleAction ===
                          action.id
                            ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                            : 'bg-white dark:bg-black text-gray-700 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'} {$glassmorphismMode
                            ? 'glassmorphism-button'
                            : ''}"
                          onclick={() => (selectedToggleAction = action.id)}
                          title={action.name}
                        >
                          {action.name}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            <!-- Toggle Mode -->
            <div
              class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
                ? 'glassmorphism-card'
                : ''}"
            >
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('advancedkey.toggleMode', currentLanguage)}
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  class="p-4 rounded-lg border-2 text-left transition-all {toggleMode === 'press'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                    : 'border-gray-300 dark:border-gray-600 bg-transparent hover:border-gray-400 dark:hover:border-gray-500'} {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                  onclick={() => (toggleMode = 'press')}
                >
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      class="w-4 h-4 rounded-full border-2 {toggleMode === 'press'
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-400 dark:border-gray-500 bg-transparent'}"
                    >
                      {#if toggleMode === 'press'}
                        <div class="w-2 h-2 bg-white dark:bg-black rounded-full m-0.5"></div>
                      {/if}
                    </div>
                    <span class="font-medium text-gray-900 dark:text-white"
                      >{t('advancedkey.onPress', currentLanguage)}</span
                    >
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {t('advancedkey.toggleModeDesc', currentLanguage)}
                  </p>
                </button>

                <button
                  class="p-4 rounded-lg border-2 text-left transition-all {toggleMode === 'release'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                    : 'border-gray-300 dark:border-gray-600 bg-transparent hover:border-gray-400 dark:hover:border-gray-500'} {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                  onclick={() => (toggleMode = 'release')}
                >
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      class="w-4 h-4 rounded-full border-2 {toggleMode === 'release'
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-400 dark:border-gray-500 bg-transparent'}"
                    >
                      {#if toggleMode === 'release'}
                        <div class="w-2 h-2 bg-white dark:bg-black rounded-full m-0.5"></div>
                      {/if}
                    </div>
                    <span class="font-medium text-gray-900 dark:text-white"
                      >{t('advancedkey.onRelease', currentLanguage)}</span
                    >
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {t('advancedkey.toggleModeDesc', currentLanguage)}
                  </p>
                </button>
              </div>
            </div>
            <!-- State Control -->
            <div
              class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
                ? 'glassmorphism-card'
                : ''}"
            >
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('advancedkey.toggleState', currentLanguage)}
              </h3>

              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 {$glassmorphismMode
                  ? 'glassmorphism-button'
                  : ''}"
              >
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {t('advancedkey.toggleState', currentLanguage)}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    {t('advancedkey.toggleStateDesc', currentLanguage)}
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <button
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {toggleState
                      ? 'bg-primary-600'
                      : 'bg-gray-300 dark:bg-gray-600'} {$glassmorphismMode
                      ? 'glassmorphism-button'
                      : ''}"
                    onclick={() => (toggleState = !toggleState)}
                    aria-label={toggleState
                      ? 'Set toggle state to inactive'
                      : 'Set toggle state to active'}
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform {toggleState
                        ? 'translate-x-6'
                        : 'translate-x-1'}"
                    ></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Panel -->
          <div class="space-y-6">
            <!-- Live Preview -->
            <div
              class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
                ? 'glassmorphism-card'
                : ''}"
            >
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>

              <div class="space-y-3">
                <div
                  class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
                >
                  <span class="text-sm text-gray-600 dark:text-gray-400">Key</span>
                  <span class="font-mono font-medium text-gray-900 dark:text-white"
                    >{currentKeyName}</span
                  >
                </div>
                <div
                  class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
                >
                  <span class="text-sm text-gray-600 dark:text-gray-400">Action</span>
                  <span class="font-medium text-primary-600"
                    >{keyActions.find(k => k.id === selectedToggleAction)?.name ||
                      selectedToggleAction}</span
                  >
                </div>
                <div
                  class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
                >
                  <span class="text-sm text-gray-600 dark:text-gray-400">Trigger</span>
                  <span class="font-medium text-gray-900 dark:text-white"
                    >{toggleMode === 'press'
                      ? t('advancedkey.onPress', currentLanguage)
                      : t('advancedkey.onRelease', currentLanguage)}</span
                  >
                </div>
                <div class="flex justify-between items-center py-2">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >{t('advancedkey.toggleState', currentLanguage)}</span
                  >
                  <span
                    class="font-medium {toggleState
                      ? 'text-green-600'
                      : 'text-gray-600 dark:text-gray-400'}"
                  >
                    {toggleState
                      ? t('advancedkey.enabled', currentLanguage)
                      : t('advancedkey.disabled', currentLanguage)}
                  </span>
                </div>
              </div>
            </div>
            <!-- Info Panel -->
            <div
              class="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-primary-50 dark:bg-primary-900 {$glassmorphismMode
                ? 'glassmorphism-card'
                : ''}"
            >
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('advancedkey.howItWorks', currentLanguage)}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {@html tPlaceholder(
                  'advancedkey.toggleDescription',
                  currentLanguage,
                  `<strong class="text-primary-600">${keyActions.find(k => k.id === selectedToggleAction)?.name || selectedToggleAction}</strong>`,
                  toggleMode === 'press'
                    ? t('advancedkey.whenPressed', currentLanguage)
                    : t('advancedkey.whenReleased', currentLanguage)
                )}
              </p>
            </div>

            <!-- Configured Keys Summary -->
            {#if showConfiguredSection}
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-600 p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
                  ? 'glassmorphism-card'
                  : ''} {sectionAnimationPlayed ? 'animate-section-fade-in' : ''}"
              >
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    {t('advancedkey.configuredToggle', currentLanguage)}
                  </h3>
                  <span class="text-sm text-gray-500 dark:text-gray-400"
                    >{configuredToggleKeys.length}
                    {configuredToggleKeys.length !== 1
                      ? t('advancedkey.keysCountPlural', currentLanguage)
                      : t('advancedkey.keysCount', currentLanguage)}</span
                  >
                </div>
                <div class="space-y-3 mb-6">
                  {#each configuredToggleKeys as [keyId, config] (keyId)}
                    {@const keyIndex = parseInt(keyId)}
                    {@const keyName = (() => {
                      const controller = keyboardAPI.state.controller;
                      if (!controller) return t('common.unknown', currentLanguage);
                      
                      try {
                        const layoutJson = controller.get_layout_json();
                        const layout = JSON.parse(layoutJson);
                        const keys = layout;
                        
                        if (keys && keys[keyIndex]) {
                          const key = keys[keyIndex];
                          if (key.labels && key.labels.length > 0) {
                            const label = key.labels.find((l: string) => l && l.trim());
                            if (label) return label;
                          }
                        }
                      } catch (e) {
                        console.error('Error getting key label:', e);
                      }
                      
                      return `Key ${keyIndex}`;
                    })()}
                    {@const isDeleting = deletingKeys.has(keyId)}
                    {@const isNewlyAdded = newlyAddedKeys.has(keyId)}
                    <div
                      class="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 transform transition-all duration-500 ease-out {$glassmorphismMode
                        ? 'glassmorphism-card'
                        : ''} {isDeleting ? 'animate-fade-out' : ''} {isNewlyAdded
                        ? 'animate-fade-in'
                        : ''}"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-mono font-bold text-gray-900 dark:text-white text-sm"
                          >{keyName}</span
                        >
                        <button
                          class="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors {$glassmorphismMode
                            ? 'glassmorphism-button'
                            : ''}"
                          onclick={() => deleteKey(keyId)}
                          title={t('common.delete', currentLanguage)}
                          aria-label={t('common.delete', currentLanguage)}
                        >
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fill-rule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                      <div class="text-xs space-y-1">
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400"
                            >{t('advancedkey.actions', currentLanguage)}:</span
                          >
                          <span class="font-medium text-primary-600"
                            >{keyActions.find(k => k.id === config.toggleAction)?.name ||
                              config.toggleAction}</span
                          >
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400"
                            >{t('advancedkey.trigger', currentLanguage)}:</span
                          >
                          <span class="font-medium text-gray-700 dark:text-gray-300"
                            >{config.toggleMode === 'press'
                              ? t('advancedkey.onPress', currentLanguage)
                              : t('advancedkey.onRelease', currentLanguage)}</span
                          >
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-gray-600 dark:text-gray-400"
                            >{t('advancedkey.state', currentLanguage)}:</span
                          >
                          <div class="flex items-center gap-1">
                            <div
                              class="w-2 h-2 rounded-full {config.toggleState
                                ? 'bg-green-500'
                                : 'bg-gray-400'}"
                            ></div>
                            <span
                              class="font-medium {config.toggleState
                                ? 'text-green-600'
                                : 'text-gray-600 dark:text-gray-400'}"
                              >{config.toggleState
                                ? t('advancedkey.enabled', currentLanguage)
                                : t('advancedkey.disabled', currentLanguage)}</span
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- No Key Selected State -->
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center max-w-md mx-auto">
          <div
            class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-800 {glassmorphismMode
              ? 'glassmorphism-card'
              : ''}"
          >
            <svg
              class="w-12 h-12 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('advancedkey.noKeySelected', currentLanguage)}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {t('advancedkey.selectKeyToConfig', currentLanguage)}
          </p>
          <div
            class="bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 border rounded-lg p-4 text-sm {$glassmorphismMode
              ? 'glassmorphism-card'
              : ''}"
          >
            <strong>{t('advancedkey.tip', currentLanguage)}:</strong>
            {t('advancedkey.toggleTip', currentLanguage)}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Animation styles */
  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    50% {
      opacity: 0.3;
      transform: translateY(-10px) scale(0.98);
    }
    100% {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
  }

  @keyframes sectionFadeIn {
    0% {
      opacity: 0;
      transform: translateY(-15px);
      max-height: 0;
    }
    100% {
      opacity: 1;
      transform: translateY(0);
      max-height: 1000px;
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .animate-fade-out {
    animation: fadeOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  .animate-section-fade-in {
    animation: sectionFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
</style>
