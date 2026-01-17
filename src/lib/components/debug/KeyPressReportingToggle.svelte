<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Radio } from 'lucide-svelte';

  interface Props {
    keyPressReporting: boolean;
    onToggle: (value: boolean) => void;
  }

  let { keyPressReporting, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="glassmorphism-card rounded-xl p-6 transition-all duration-300">
  <div class="flex items-center justify-between gap-6">
    <!-- Left side - Icon and text -->
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
        <Radio class="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          {t('debug.keyPressReporting', currentLanguage)}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {t('debug.keyPressReportingDesc', currentLanguage)}
        </p>
      </div>
    </div>
    
    <!-- Right side - Toggle -->
    <button
      class="relative inline-flex items-center h-7 rounded-full w-14 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-900 shadow-inner {keyPressReporting ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-300 dark:bg-gray-600'}"
      aria-label="Key Press Reporting Toggle"
      onclick={() => onToggle(!keyPressReporting)}
    >
      <span
        class="inline-block w-5 h-5 transform rounded-full bg-white transition-all duration-300 shadow-md {keyPressReporting ? 'translate-x-8' : 'translate-x-1'}"
      ></span>
    </button>
  </div>
  
  <!-- Status indicator -->
  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5">
        {#if keyPressReporting}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        {/if}
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 {keyPressReporting ? 'bg-green-500' : 'bg-gray-400'}"></span>
      </span>
      <span class="text-sm font-medium {keyPressReporting ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
        {keyPressReporting ? 'Reporting enabled' : 'Reporting disabled'}
      </span>
    </div>
  </div>
</div>
