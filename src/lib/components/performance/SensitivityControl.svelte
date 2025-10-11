<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    separateSensitivity: boolean;
    sensitivityValue: number;
    pressSensitivity: number;
    releaseSensitivity: number;
    onToggleSeparate: (value: boolean) => void;
    onSensitivityChange: (value: number) => void;
    onPressChange: (value: number) => void;
    onReleaseChange: (value: number) => void;
  }

  let {
    separateSensitivity,
    sensitivityValue,
    pressSensitivity,
    releaseSensitivity,
    onToggleSeparate,
    onSensitivityChange,
    onPressChange,
    onReleaseChange,
  }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="flex-1 min-w-[260px] flex flex-col">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {t('performance.rapidTriggerSensitivity', currentLanguage)}
    </h3>
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 dark:text-gray-400">Separate Press/Release</span>
      <button
        class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {separateSensitivity
          ? ''
          : 'bg-gray-300 dark:bg-gray-600'}"
        aria-label="Separate Sensitivity Toggle"
        style="background: {separateSensitivity
          ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)'
          : ''};"
        onclick={() => onToggleSeparate(!separateSensitivity)}
      >
        <span
          class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
          class:translate-x-6={separateSensitivity}
          class:translate-x-1={!separateSensitivity}
          style="background: {separateSensitivity
            ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)'
            : '#ffffff'};"
        ></span>
      </button>
    </div>
  </div>
  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
    {t('performance.adjustSensitivity', currentLanguage)}
  </p>
  <div class="flex-1">
    {#if separateSensitivity}
      <div class="mb-4">
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>{t('performance.pressSensitivityLabel', currentLanguage)}</div>
          <div>{pressSensitivity.toFixed(2)} mm</div>
        </div>
        <input
          type="range"
          min="0.01"
          max="2"
          step="0.01"
          value={pressSensitivity}
          oninput={e => onPressChange(Number((e.target as HTMLInputElement).value))}
          class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>{t('performance.releaseSensitivityLabel', currentLanguage)}</div>
          <div>{releaseSensitivity.toFixed(2)} mm</div>
        </div>
        <input
          type="range"
          min="0.01"
          max="2"
          step="0.01"
          value={releaseSensitivity}
          oninput={e => onReleaseChange(Number((e.target as HTMLInputElement).value))}
          class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
    {:else}
      <div>
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>{t('performance.sensitivityLabel', currentLanguage)}</div>
          <div>{sensitivityValue.toFixed(2)} mm</div>
        </div>
        <input
          type="range"
          min="0.01"
          max="2"
          step="0.01"
          value={sensitivityValue}
          oninput={e => onSensitivityChange(Number((e.target as HTMLInputElement).value))}
          class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
    {/if}
  </div>
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
