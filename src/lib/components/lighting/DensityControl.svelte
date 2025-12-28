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
    class="density-slider"
  />
</div>

<style>
  .density-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .density-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .density-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .density-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .density-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
