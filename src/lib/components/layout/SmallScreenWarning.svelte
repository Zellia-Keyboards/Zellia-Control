<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
</script>

<div
  class="xl:hidden fixed inset-0 flex items-center justify-center z-50 bg-primary-50 dark:bg-black"
>
  <div class="max-w-2xl mx-4">
    <div
      class="rounded-xl shadow-lg border p-8 text-center bg-white dark:bg-black border-primary-200 dark:border-primary-700 text-gray-800 dark:text-white {$glassmorphismMode
        ? 'glassmorphism-card'
        : ''}"
    >
      <div class="flex items-center justify-center mb-6">
        <div
          class="w-16 h-16 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800"
        >
          <svg
            class="w-8 h-8 text-primary-600 dark:text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Display Too Small</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        Zellia Control requires a larger display for the optimal keyboard configuration experience.
        Please use a desktop or laptop computer, or expand your browser window.
      </p>

      <div
        class="border rounded-lg p-4 mb-6 bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <div class="flex items-center gap-3 text-primary-600 dark:text-primary-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="text-sm font-medium">Minimum recommended width: 1280px</div>
        </div>
      </div>

      <div class="text-left space-y-3 mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
          {t('ui.featuresRequiringLargerDisplay', currentLanguage)}
        </h3>
        <div class="grid grid-cols-1 gap-3">
          <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
            <span>{t('ui.keyboardLayoutVisualization', currentLanguage)}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
            <span>{t('ui.advancedKeyConfigPanels', currentLanguage)}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
            <span>Performance tuning controls</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
            <span>Lighting configuration interface</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
