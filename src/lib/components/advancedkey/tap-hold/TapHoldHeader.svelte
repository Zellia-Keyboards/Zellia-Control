<script lang="ts">
  import { goto } from '$app/navigation';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    currentSelectedIndex: number | null;
    onApply: () => void;
    onResetAll: () => void;
  }

  let { currentSelectedIndex, onApply, onResetAll }: Props = $props();
  let currentLanguage = $derived($language);

  function goBack(): void {
    goto('/advancedkey');
  }
</script>

<div
  class="border-b px-6 py-4 {$glassmorphismMode
    ? ''
    : 'bg-primary-25 dark:bg-primary-950 border-primary-200 dark:border-primary-800'}"
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <button
        class="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 transition-colors"
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
          {t('advancedkey.tapHoldTitle', currentLanguage)}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {t('advancedkey.tapHoldSubtitle', currentLanguage)}
        </p>
      </div>
    </div>
    <div class="flex gap-3">
      <button
        class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 {$glassmorphismMode
          ? 'glassmorphism-button'
          : currentSelectedIndex !== null
            ? 'bg-primary-500 hover:bg-primary-600'
            : 'bg-primary-500'}"
        onclick={onApply}
        disabled={currentSelectedIndex === null}
      >
        {t('advancedkey.applyConfiguration', currentLanguage)}
      </button>
      <button
        class="px-4 py-2 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''} bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium"
        onclick={onResetAll}
      >
        {t('advancedkey.resetAllTapHold', currentLanguage)}
      </button>
    </div>
  </div>
</div>
