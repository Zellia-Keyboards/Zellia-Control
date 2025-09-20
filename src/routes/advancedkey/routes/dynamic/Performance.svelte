<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { AlertTriangle } from 'lucide-svelte';

  let currentLanguage = $derived($language);

  // Add actuation point state
  let actuationPoint = $state(1.5);
</script>

<div
  class="rounded-lg border p-6 bg-white dark:bg-black border-gray-200 dark:border-gray-700 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.performanceSettings', currentLanguage)}
  </h3>
  <div class="mb-6">
    <div class="flex justify-between items-center mb-2">
      <label
        for="actuation-point-slider"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >{t('advancedkey.actuationPoint', currentLanguage)}</label
      >
      <span class="text-sm text-gray-500 dark:text-gray-400">{actuationPoint.toFixed(2)}mm</span>
    </div>
    <!-- Warning box for values below 0.3 -->
    {#if actuationPoint < 0.3}
      <div
        class="mb-2 p-2 border rounded-md text-xs flex items-center gap-2 {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
        style="background-color: {'color-mix(in srgb, #f59e0b 10%, #fefce8) dark:color-mix(in srgb, #f59e0b 15%, #451a03)'};
                        border-color: {'color-mix(in srgb, #f59e0b 25%, #e7e5e4) dark:color-mix(in srgb, #f59e0b 30%, #78716c)'};
                        color: {'#a16207 dark:#fbbf24'};"
      >
        <AlertTriangle class="w-4 h-4 flex-shrink-0" />
        <span>{t('advancedkey.sensitivityWarning', currentLanguage)}</span>
      </div>
    {/if}
    <!-- Dual input: Slider -->
    <input
      id="actuation-point-slider"
      type="range"
      min="0.01"
      max="3.5"
      step="0.01"
      bind:value={actuationPoint}
      class="w-full h-2 rounded-full appearance-none slider-thumb mb-2"
      style="background-color: {'#d1d5db dark:#374151'};
                   --thumb-color: var(--theme-color-primary);"
    />

    <!-- Dual input: Text input -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-500 dark:text-gray-400"
        >{t('performance.directInput', currentLanguage)}:</span
      >
      <input
        type="number"
        min="0.01"
        max="3.5"
        step="0.01"
        bind:value={actuationPoint}
        class="w-20 px-2 py-1 text-xs border rounded {$glassmorphismMode
          ? 'glassmorphism-input'
          : ''}"
        style="background-color: {'white dark:#1f2937'};
                       border-color: {'color-mix(in srgb, var(--theme-color-primary) 15%, #d1d5db) dark:color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)'};
                       color: {'#111827 dark:white'};"
      />
      <span class="text-xs text-gray-500 dark:text-gray-400">mm</span>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {t('advancedkey.actuationPointDesc', currentLanguage)}
    </p>
  </div>
  <div
    class="flex items-start gap-3 p-4 border rounded-lg {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
    style="background-color: {'color-mix(in srgb, var(--theme-color-primary) 5%, #f0f9ff) dark:color-mix(in srgb, var(--theme-color-primary) 8%, #111827)'};
               border-color: {'color-mix(in srgb, var(--theme-color-primary) 15%, #bfdbfe) dark:color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)'};"
  >
    <svg
      class="w-5 h-5 mt-0.5"
      style="color: var(--theme-color-primary);"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <div>
      <p
        class="text-sm font-medium"
        style="color: {'color-mix(in srgb, var(--theme-color-primary) 85%, black) dark:white'};"
      >
        {t('advancedkey.rapidTriggerDisabled', currentLanguage)}
      </p>
      <p
        class="text-sm"
        style="color: {'color-mix(in srgb, var(--theme-color-primary) 75%, black) dark:#d1d5db'};"
      >
        {t('advancedkey.rapidTriggerDisabledDesc', currentLanguage)}
      </p>
    </div>
  </div>
</div>
