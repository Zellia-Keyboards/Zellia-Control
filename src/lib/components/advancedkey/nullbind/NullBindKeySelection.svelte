<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    localSelectedKeys: number[];
    getKeyLabel: (keyIndex: number) => string;
    onRemoveKey: (index: number) => void;
  }

  let { localSelectedKeys, getKeyLabel, onRemoveKey }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="p-6"
>
  <div class="max-w-4xl mx-auto">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">
      {t('advancedkey.selectTwoKeys', currentLanguage)}
    </h3>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {t('advancedkey.selectTwoKeysInstructions', currentLanguage)}
    </p>
    <!-- Selected Keys Display -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div
        class="p-4 border-2 border-dashed rounded-lg glassmorphism-card 
        {localSelectedKeys.length >= 1
          ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
          : 'border-primary-400 bg-primary-200 dark:bg-primary-800'}"
      >
        <div class="text-center">
          {#if localSelectedKeys.length >= 1}
            <div
              class="w-12 h-12 text-white bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button"
            >
              <span class="font-mono font-bold">{getKeyLabel(localSelectedKeys[0])}</span>
            </div>
            <div class="text-sm font-medium text-primary-500">
              {t('advancedkey.firstKey', currentLanguage)}
            </div>
            <button
              class="mt-2 text-xs text-red-600 hover:text-red-700 glassmorphism-button"
              onclick={() => onRemoveKey(0)}
            >
              {t('advancedkey.remove', currentLanguage)}
            </button>
          {:else}
            <div
              class="w-12 h-12 bg-primary-300 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse glassmorphism-button"
            >
              <span class="text-primary-500">?</span>
            </div>
            <div class="text-sm text-primary-500">
              {t('advancedkey.clickKeyToSelect', currentLanguage)}
            </div>
          {/if}
        </div>
      </div>

      <div
        class="p-4 border-2 border-dashed rounded-lg glassmorphism-card {localSelectedKeys.length >= 2
          ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
          : localSelectedKeys.length === 1
            ? 'border-primary-500 bg-primary-100 dark:bg-primary-800'
            : 'border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800'}"
      >
        <div class="text-center">
          {#if localSelectedKeys.length >= 2}
            <div
              class="w-12 h-12 text-white bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button"
            >
              <span class="font-mono font-bold">{getKeyLabel(localSelectedKeys[1])}</span>
            </div>
            <div class="text-sm font-medium text-primary-500">
              {t('advancedkey.secondKey', currentLanguage)}
            </div>
            <button
              class="mt-2 text-xs text-red-600 hover:text-red-700 glassmorphism-button"
              onclick={() => onRemoveKey(1)}
            >
              {t('advancedkey.remove', currentLanguage)}
            </button>
          {:else if localSelectedKeys.length === 1}
            <div
              class="w-12 h-12 bg-primary-300 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse glassmorphism-button"
            >
              <span class="text-primary-500">?</span>
            </div>
            <div class="text-sm text-primary-500">
              {t('advancedkey.clickOpposingKey', currentLanguage)}
            </div>
          {:else}
            <div
              class="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center mx-auto mb-2 glassmorphism-button"
            >
              <span class="text-gray-500 dark:text-gray-400">?</span>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {t('advancedkey.secondKey', currentLanguage)}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
