<script lang="ts">
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  type Props = {
    bottomOutPointValue: number;
  };
  let { bottomOutPointValue = $bindable() }: Props = $props(); // [cite: 278]
</script>

<div
  class="rounded-lg border p-6 {glassmorphismMode ? 'glassmorphism-card' : ''}"
  style={glassmorphismMode
    ? ''
    : `background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'});
           border-color: ${$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};`}
>
  <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">
    {t('advancedkey.bottomOutPoint', currentLanguage)}
  </h3>
  <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
    {t('advancedkey.bottomOutPointDesc', currentLanguage)}
  </p>

  <div>
    <div class="flex justify-between items-center mb-2">
      <label
        for="bottom-out-slider"
        class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'}"
        >{t('advancedkey.distance', currentLanguage)}</label
      >
      <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}"
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
      style="background-color: {$darkMode
        ? '#374151'
        : '#d1d5db'}; --thumb-color: var(--theme-color-primary);"
    />
    <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
      <span>2.0mm</span>
      <span>4.0mm</span>
    </div>
  </div>
</div>
