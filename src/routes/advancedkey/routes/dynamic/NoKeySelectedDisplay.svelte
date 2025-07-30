<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });
</script>

<div class="flex-1 flex items-center justify-center">
  <div class="text-center max-w-md mx-auto">
    <div
      class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-800 {glassmorphismMode
        ? 'glassmorphism-card'
        : ''}"
    >
      <svg class="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      class="border rounded-lg p-4 text-sm bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200 {glassmorphismMode
        ? 'glassmorphism-card'
        : ''}"
    >
      <strong>{t('advancedkey.tip', currentLanguage)}:</strong>
      {t('advancedkey.tipDynamic', currentLanguage)}
    </div>
  </div>
</div>
