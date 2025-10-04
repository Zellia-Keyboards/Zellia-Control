<script lang="ts">
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import KeyTracking from './KeyTracking.svelte';

  let currentLanguage = $derived($language);

  let keyPressReporting = $state(false);
  let currentSelected = $state<[number, number] | null>(null);

  function handleReset() {
    // TODO: Implement reset configuration logic
    console.log('Reset configuration');
  }

  function handleRebootRecovery() {
    // TODO: Implement recovery mode logic
    console.log('Reboot to recovery mode');
  }

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

  <div class="rounded-xl shadow p-6 space-y-8 flex-1 border border-gray-200 dark:border-gray-600 glassmorphism-card bg-primary-50 dark:bg-black">
    <!-- System Control Panel - Combined Section -->
    <div
      class="p-6 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        System Control Panel
      </h3>
      
      <!-- Controls Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Key Press Reporting -->
        <div class="p-4 rounded-lg bg-white/20 dark:bg-gray-800/30 border border-gray-300/50 dark:border-gray-600/50 glassmorphism-card">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-medium text-gray-900 dark:text-white">
              {t('debug.keyPressReporting', currentLanguage)}
            </h4>
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
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {t('debug.keyPressReportingDesc', currentLanguage)}
          </p>
        </div>

        <!-- Reset Configuration -->
        <div class="p-4 rounded-lg bg-white/20 dark:bg-gray-800/30 border border-gray-300/50 dark:border-gray-600/50 glassmorphism-card">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-medium text-gray-900 dark:text-white">
              {t('debug.reset', currentLanguage)}
            </h4>
            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('debug.resetDesc', currentLanguage)}
          </p>
          <button
            type="button"
            class="w-full text-white border-none rounded-md px-4 py-2 font-semibold transition-colors duration-200 bg-red-700 hover:bg-red-600 hover:opacity-90 glassmorphism-button"
            onclick={handleReset}
          >
            {t('debug.resetButton', currentLanguage)}
          </button>
        </div>

        <!-- Recovery Mode -->
        <div class="p-4 rounded-lg bg-white/20 dark:bg-gray-800/30 border border-gray-300/50 dark:border-gray-600/50 glassmorphism-card">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-medium text-gray-900 dark:text-white">
              {t('debug.recoveryMode', currentLanguage)}
            </h4>
            <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('debug.recoveryModeDesc', currentLanguage)}
          </p>
          <button
            type="button"
            class="w-full text-white border-none rounded-md px-4 py-2 font-semibold transition-colors duration-200 bg-primary-600 hover:bg-primary-500 hover:opacity-90 glassmorphism-button"
            onclick={handleRebootRecovery}
          >
            {t('debug.recoveryModeButton', currentLanguage)}
          </button>
        </div>
      </div>
    </div>
    <!-- Key Tracking Component -->
    <KeyTracking 
      currentSelected={currentSelected} 
      onSelectKey={scrollToKeyboard} 
    />
  </div>
</div>
