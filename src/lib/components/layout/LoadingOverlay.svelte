<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <div class="text-center p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} shadow-xl">
    <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse {$glassmorphismMode ? 'glassmorphism-button' : ''}">
      <svg class="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {keyboardAPI.state.isDemoMode ? t('demo.entering', currentLanguage) : t('welcome.connecting', currentLanguage)}
    </h3>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {t('welcome.loadingConfigurator', currentLanguage)}
    </p>
  </div>
</div>
