<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    keyPressReporting: boolean;
    onToggle: (value: boolean) => void;
  }

  let { keyPressReporting, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

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
      onclick={() => onToggle(!keyPressReporting)}
    >
      <span
        class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
        class:translate-x-6={keyPressReporting}
        class:translate-x-1={!keyPressReporting}
      ></span>
    </button>
  </div>
</div>
