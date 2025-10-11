<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    toggleState: boolean;
    onStateToggle: () => void;
  }

  let { toggleState, onStateToggle }: Props = $props();

  let currentLanguage = $derived($language);
</script>

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
          : 'bg-gray-300 dark:bg-gray-600'} {$glassmorphismMode ? 'glassmorphism-button' : ''}"
        onclick={onStateToggle}
        aria-label={toggleState ? 'Set toggle state to inactive' : 'Set toggle state to active'}
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
