<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div class="flex items-center justify-center p-8 w-full h-full min-h-[50vh]">
  <div class="text-center">
    <div class="w-16 h-16 mx-auto mb-4 relative">
      <!-- Spinner -->
      <svg
        class="w-12 h-12 text-primary-600 dark:text-primary-400 animate-spin relative z-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </div>
    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 animate-pulse">
      {t('welcome.loadingConfigurator', currentLanguage)}
    </h3>
  </div>
</div>
