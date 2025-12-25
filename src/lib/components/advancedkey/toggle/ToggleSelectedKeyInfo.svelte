<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    currentKeyName: string;
    currentSelectedIndex: number;
    toggleState: boolean;
  }

  let { currentKeyName, currentSelectedIndex, toggleState }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 mb-6 bg-white dark:bg-gray-900 glassmorphism-card">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-primary-500 bg-primary-50 dark:bg-primary-900 glassmorphism-button">
          <span class="font-mono font-bold text-gray-900 dark:text-white">{currentKeyName}</span>
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
        <div class="w-2 h-2 rounded-full {toggleState ? 'bg-green-500' : 'bg-gray-400'}"></div>
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
