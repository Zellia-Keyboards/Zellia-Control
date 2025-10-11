<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { AlertTriangle } from 'lucide-svelte';

  interface Props {
    rtDown: number;
    actuationPoint: number;
    uiActuationPoint: number;
    bottomOutPoint: number;
    switchDistance: number;
    onRapidTriggerToggle: (enabled: boolean) => void;
    onActuationPointChange: (value: number) => void;
    onCommitActuationPoint: () => void;
  }

  let { rtDown, actuationPoint, uiActuationPoint, bottomOutPoint, switchDistance, onRapidTriggerToggle, onActuationPointChange, onCommitActuationPoint }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="flex flex-col gap-4 rounded-md border {$glassmorphismMode
    ? 'glassmorphism-card'
    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-black'} p-4 shadow-sm"
>
  <!-- Rapid Trigger Toggle -->
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <div class="text-sm font-medium text-gray-900 dark:text-white">
        {t('advancedkey.rapidTrigger', currentLanguage)}
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        {t('advancedkey.rapidTriggerDesc', currentLanguage)}
      </div>
    </div>
    <button
      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {rtDown >
      0
        ? 'bg-primary-500'
        : 'bg-gray-300 dark:bg-gray-600'} {$glassmorphismMode
        ? 'glassmorphism-button'
        : ''}"
      onclick={() => onRapidTriggerToggle(rtDown === 0)}
    >
      <span
        class="inline-block h-3 w-3 transform rounded-full {rtDown > 0
          ? 'bg-white dark:bg-black'
          : 'bg-white'} transition-transform shadow-sm {rtDown > 0
          ? 'translate-x-5'
          : 'translate-x-1'}"
      ></span>
    </button>
  </div>
  <!-- Actuation Point Slider -->
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-2">
      <div>
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {t('advancedkey.actuationPoint', currentLanguage)}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('advancedkey.actuationPointDesc', currentLanguage)}
        </div>
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{uiActuationPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span
      >
    </div>
    <!-- Warning box for values below 0.3 -->
    {#if uiActuationPoint < 0.3}
      <div
        class="mb-2 p-2 border rounded-md text-xs flex items-center gap-2 {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''} bg-yellow-50 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200"
      >
        <AlertTriangle class="w-4 h-4 flex-shrink-0" />
        <span>{t('advancedkey.keySensitivityWarning', currentLanguage)}</span>
      </div>
    {/if}

    <!-- Dual input: Slider -->
    <input
      type="range"
      min="0.01"
      max={bottomOutPoint > 0 ? bottomOutPoint - 0.1 : switchDistance}
      step="0.01"
      bind:value={uiActuationPoint}
      onchange={onCommitActuationPoint}
      class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-600 appearance-none slider-thumb mb-2"
    />

    <!-- Dual input: Text input -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-500 dark:text-gray-400"
        >{t('advancedkey.directInput', currentLanguage)}</span
      >
      <input
        type="number"
        min="0.01"
        max={bottomOutPoint > 0 ? bottomOutPoint - 0.1 : switchDistance}
        step="0.01"
        bind:value={uiActuationPoint}
        onchange={onCommitActuationPoint}
        class="w-20 px-2 py-1 text-xs border rounded {$glassmorphismMode
          ? 'glassmorphism-input'
          : ''} bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
      />
      <span class="text-xs text-gray-500 dark:text-gray-400"
        >{t('advancedkey.millimeters', currentLanguage)}</span
      >
    </div>

    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>0.01{t('units.mm', currentLanguage)}</span>
      <span
        >{(bottomOutPoint > 0 ? bottomOutPoint - 0.1 : switchDistance).toFixed(
          1
        )}{t('units.mm', currentLanguage)}</span
      >
    </div>
  </div>

  <!-- Rapid Trigger Down Sensitivity (only show when enabled) -->
  {#if rtDown > 0}
    <div class="flex flex-col">
      <div class="flex justify-between items-center mb-2">
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {t('advancedkey.rapidTriggerDownSensitivity', currentLanguage)}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {t('advancedkey.rapidTriggerDownSensitivityDesc', currentLanguage)}
          </div>
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400"
          >{rtDown.toFixed(2)}{t('units.mm', currentLanguage)}</span
        >
      </div>
      <input
        type="range"
        min="0.01"
        max="1.0"
        step="0.01"
        bind:value={rtDown}
        class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-600 appearance-none slider-thumb"
      />
      <div
        class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1"
      >
        <span>0.01{t('units.mm', currentLanguage)}</span>
        <span>1.00{t('units.mm', currentLanguage)}</span>
      </div>
    </div>
  {/if}
</div>