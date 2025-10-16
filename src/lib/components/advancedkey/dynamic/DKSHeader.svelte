<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    onBack: () => void;
    onApply: () => void;
    onReset: () => void;
    canApply: boolean;
  }

  let { onBack, onApply, onReset, canApply }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="border-b px-6 py-4 -mx-8 -mt-8 mb-4 {$glassmorphismMode
    ? ''
    : 'bg-primary-25 dark:bg-primary-950 border-primary-200 dark:border-primary-800'}"
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <button
        class="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        onclick={onBack}
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
          {t('advancedkey.dynamicTitle', currentLanguage)}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {t('advancedkey.dynamicSubtitle', currentLanguage)}
        </p>
      </div>
    </div>
    <div class="flex gap-3">
      <button
        class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
        onclick={onReset}
        disabled={!canApply}
      >
        {t('advancedkey.resetConfiguration', currentLanguage)}
      </button>
      <button
        class="px-4 py-2 rounded-md transition-colors text-sm font-medium text-white disabled:opacity-50 {$glassmorphismMode
          ? 'glassmorphism-button'
          : 'bg-primary-500 hover:bg-primary-600'}"
        onclick={onApply}
        disabled={!canApply}
      >
        {t('advancedkey.applyConfiguration', currentLanguage)}
      </button>
    </div>
  </div>
</div>
