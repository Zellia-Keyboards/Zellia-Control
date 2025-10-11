<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    brightness: number;
    onBrightnessChange: (value: number) => void;
  }

  let { brightness, onBrightnessChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    <span>{t('lighting.brightness', currentLanguage)}</span>
    <span class="font-semibold">{brightness}%</span>
  </div>
  <input
    type="range"
    min="0"
    max="100"
    value={brightness}
    oninput={e => onBrightnessChange(Number((e.target as HTMLInputElement).value))}
    class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
  />
</div>

<style>
  .slider-thumb {
    appearance: none;
  }
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .slider-thumb::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
</style>
