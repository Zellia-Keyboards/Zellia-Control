<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    bottomOutPoint: number;
    actuationPoint: number;
    uiBottomOutPoint: number;
    switchDistance: number;
    onBottomOutPointChange: (value: number) => void;
    onCommitBottomOutPoint: () => void;
  }

  let {
    bottomOutPoint,
    actuationPoint,
    uiBottomOutPoint,
    switchDistance,
    onBottomOutPointChange,
    onCommitBottomOutPoint,
  }: Props = $props();

  let currentLanguage = $derived($language);
</script>

{#if bottomOutPoint > 0}
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-2">
      <div>
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {t('advancedkey.bottomOutPoint', currentLanguage)}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('advancedkey.bottomOutPointDesc', currentLanguage)}
        </div>
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{uiBottomOutPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span
      >
    </div>
    <input
      type="range"
      min={actuationPoint + 0.1}
      max={switchDistance}
      step="0.1"
      bind:value={uiBottomOutPoint}
      onchange={onCommitBottomOutPoint}
      class="bottom-out-slider"
    />
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>{(actuationPoint + 0.1).toFixed(1)}{t('units.mm', currentLanguage)}</span>
      <span>{switchDistance.toFixed(1)}{t('units.mm', currentLanguage)}</span>
    </div>
  </div>
{/if}

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
