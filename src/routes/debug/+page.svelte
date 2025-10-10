<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import KeyTracking from './KeyTracking.svelte';

  let currentLanguage = $derived($language);

  let keyPressReporting = $state(false);
  let currentSelected = $state<[number, number] | null>(null);

  function scrollToKeyboard() {
    // TODO: Implement keyboard scrolling logic
    console.log('Scroll to keyboard');
  }
</script>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow glassmorphism-card text-black dark:text-white border-0 dark:border dark:border-gray-600 flex flex-col bg-primary-50 dark:bg-black"
>
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {t('debug.title', currentLanguage)}
    </h2>
  </div>

  <div
    class="rounded-xl shadow p-6 space-y-8 flex-1 border border-gray-200 dark:border-gray-600 glassmorphism-card bg-primary-50 dark:bg-black"
  >
    <!-- Key Press Reporting -->
    <div
      class="p-6 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {t('debug.keyPressReporting', currentLanguage)}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {t('debug.keyPressReportingDesc', currentLanguage)}
          </p>
        </div>
        <button
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Key Press Reporting Toggle"
          class:bg-blue-600={keyPressReporting}
          class:bg-gray-300={!keyPressReporting}
          onclick={() => (keyPressReporting = !keyPressReporting)}
        >
          <span
            class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={keyPressReporting}
            class:translate-x-1={!keyPressReporting}
          ></span>
        </button>
      </div>
    </div>
    <!-- Key Tracking Component -->
    <KeyTracking {currentSelected} onSelectKey={scrollToKeyboard} />
  </div>
</div>
