<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import type { KeyConfiguration } from '$lib/types/AdvancedKeyShared';
  import { keyActions } from '$lib/types/AdvancedKeyShared';

  interface Props {
    configuredKeys: [string, KeyConfiguration][];
    deletingKeys: Set<string>;
    newlyAddedKeys: Set<string>;
    onDeleteKey: (keyId: string) => void;
  }

  let { configuredKeys, deletingKeys, newlyAddedKeys, onDeleteKey }: Props = $props();

  let currentLanguage = $derived($language);

  function getKeyName(keyIndex: number): string {
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
  }
</script>

<div
  class="rounded-lg border border-gray-200 dark:border-gray-600 p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {t('advancedkey.configuredToggle', currentLanguage)}
    </h3>
    <span class="text-sm text-gray-500 dark:text-gray-400"
      >{configuredKeys.length}
      {configuredKeys.length !== 1
        ? t('advancedkey.keysCountPlural', currentLanguage)
        : t('advancedkey.keysCount', currentLanguage)}</span
    >
  </div>
  <div class="space-y-3 mb-6">
    {#each configuredKeys as [keyId, config] (keyId)}
      {@const keyIndex = parseInt(keyId)}
      {@const keyName = getKeyName(keyIndex)}
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
            onclick={() => onDeleteKey(keyId)}
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
              >{keyActions.find(k => k.keycode === config.toggleAction)?.name ||
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

<style>
  .animate-fade-in {
    animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .animate-fade-out {
    animation: fadeOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

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
</style>