<script lang="ts">
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import KeyTracking from '$lib/components/debug/KeyTracking.svelte';
  import KeyPressReportingToggle from '$lib/components/debug/KeyPressReportingToggle.svelte';

  let currentLanguage = $derived($language);

  let keyPressReporting = $state(false);
  let currentSelected = $state<[number, number] | null>(null);

  function scrollToKeyboard() {
    // TODO: Implement keyboard scrolling logic
    console.log('Scroll to keyboard');
  }

  function handleToggleReporting(value: boolean) {
    keyPressReporting = value;
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
    <KeyPressReportingToggle {keyPressReporting} onToggle={handleToggleReporting} />
    <!-- Key Tracking Component -->
    <KeyTracking {currentSelected} onSelectKey={scrollToKeyboard} />
  </div>
</div>
