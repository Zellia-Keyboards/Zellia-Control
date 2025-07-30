<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  interface Props {
    currentKeyName: string;
  }

  let { currentKeyName }: Props = $props();

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });
</script>

<div
  class="rounded-lg border p-6 bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.keyTester', currentLanguage)}
  </h3>
  <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
    {t('advancedkey.testDynamicDesc', currentLanguage)}
  </p>
  <div
    class="border-2 border-dashed rounded-lg p-8 text-center border-primary-300 dark:border-primary-600 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <div
      class="w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-4 bg-primary-100 dark:bg-primary-800 {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''}"
    >
      <span class="font-mono font-bold text-primary-600 dark:text-primary-400"
        >{currentKeyName}</span
      >
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      {t('advancedkey.testKeyBehavior', currentLanguage)}
    </p>
  </div>
</div>
