<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    speed: number;
    onSpeedChange: (value: number) => void;
  }

  let { speed, onSpeedChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    <span>{t('lighting.speed', currentLanguage)}</span>
    <span class="font-semibold">{speed}%</span>
  </div>
  <input
    type="range"
    min="1"
    max="100"
    value={speed}
    oninput={e => onSpeedChange(Number((e.target as HTMLInputElement).value))}
    class="speed-slider"
  />
</div>

<style>
  .speed-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .speed-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .speed-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .speed-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .speed-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
