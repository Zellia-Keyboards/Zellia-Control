<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    density: number;
    onDensityChange: (value: number) => void;
    min?: number;
    max?: number;
    label?: string;
  }

  let { density, onDensityChange, min = 0, max = 255, label }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    <span>{label || t('lighting.density', currentLanguage)}</span>
    <span class="font-semibold">{density}</span>
  </div>
  <input
    type="range"
    min={min}
    max={max}
    value={density}
    oninput={e => onDensityChange(Number((e.target as HTMLInputElement).value))}
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
