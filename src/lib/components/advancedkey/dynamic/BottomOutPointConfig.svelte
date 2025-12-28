<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);

  type Props = {
    bottomOutPointValue: number;
  };
  let { bottomOutPointValue = $bindable() }: Props = $props(); // [cite: 278]
</script>

<div class="rounded-lg border p-6 glassmorphism-card">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.bottomOutPoint', currentLanguage)}
  </h3>
  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    {t('advancedkey.bottomOutPointDesc', currentLanguage)}
  </p>

  <div>
    <div class="flex justify-between items-center mb-2">
      <label for="bottom-out-slider" class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >{t('advancedkey.distance', currentLanguage)}</label
      >
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{bottomOutPointValue.toFixed(1)}mm</span
      >
    </div>
    <input
      id="bottom-out-slider"
      type="range"
      min="2.0"
      max="4.0"
      step="0.1"
      bind:value={bottomOutPointValue}
      class="bottom-out-slider"
    />
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>2.0mm</span>
      <span>4.0mm</span>
    </div>
  </div>
</div>

<style>
  .bottom-out-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .bottom-out-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .bottom-out-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .bottom-out-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .bottom-out-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
