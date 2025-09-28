<script lang="ts">
  import { glassmorphismMode } from '$lib/hooks/DarkModeStore.svelte';
  import { language, t } from '$lib/hooks/LanguageStore.svelte';

  let currentLanguage = $derived($language);

  type Props = {
    bottomOutPointValue: number;
  };
  let { bottomOutPointValue = $bindable() }: Props = $props(); // [cite: 278]
</script>

<div
  class="rounded-lg border p-6 {glassmorphismMode ? 'glassmorphism-card' : ''}"
  style={glassmorphismMode
    ? ''
    : `background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${'white dark:black'});
           border-color: ${'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb) dark:color-mix(in srgb, var(--theme-color-primary) 20%, #374151)'};`}
>
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
      class="w-full h-2 rounded-full appearance-none slider-thumb {glassmorphismMode
        ? 'glassmorphism-input'
        : ''}"
      style="background-color: {'#d1d5db dark:#374151'}; --thumb-color: var(--theme-color-primary);"
    />
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>2.0mm</span>
      <span>4.0mm</span>
    </div>
  </div>
</div>
