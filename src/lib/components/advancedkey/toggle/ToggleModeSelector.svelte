<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    toggleMode: string;
    onModeSelect: (mode: string) => void;
  }

  let { toggleMode, onModeSelect }: Props = $props();

  let currentLanguage = $derived($language);
</script>

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
      onclick={() => onModeSelect('press')}
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
      onclick={() => onModeSelect('release')}
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