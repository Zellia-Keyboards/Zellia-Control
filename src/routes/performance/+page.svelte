<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import NewZellia60HE from '$lib/NewZellia60HE.svelte';
  import Zellia80HE from '$lib/Zellia80HE.svelte';
  import { keyboardConnection } from '$lib/KeyboardConnectionStore.svelte';
  import { AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Derived variable to determine which keyboard component to show
  let currentKeyboard = $derived(() => {
    const selectedModel = keyboardConnection.state.selectedModel;
    if (selectedModel === 'zellia60he') {
      return { component: NewZellia60HE, isLegacy: false };
    } else if (selectedModel === 'zellia80he') {
      return { component: NewZellia80He, isLegacy: false };
    }
    // Default fallback
    return { component: Zellia80HE, isLegacy: true };
  });

  let ACTUATION_POINT = $state([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1.5, 1, 1.5, 2, 1.6, 1, 1.5, 1, 1, 1],
  ]);
  let rapidTriggerEnabled = $state(false);
  let continuousRapidTriggerEnabled = $state(false);
  let actuationPoint = $state(2.0);
  let sensitivityValue = $state(0.5);
  let separateSensitivity = $state(false);
  let pressSensitivity = $state(0.5);
  let releaseSensitivity = $state(0.5);
  let keysSelected = $state(0);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });
</script>

{#if currentKeyboard().isLegacy}
  <svelte:component this={currentKeyboard().component}
    values={ACTUATION_POINT}
    onClick={(x, y, event) => {
      console.log(`Key clicked at (${x}, ${y})`, event);
    }}
  />
{:else}
  <svelte:component this={currentKeyboard().component}
    currentSelectedKey={null}
    onClick={(x, y, event) => {
      console.log(`Key clicked at (${x}, ${y})`, event);
    }}
  >
    {#snippet body(x, y)}
      <p
        class="hover:scale-90 transition-all duration-300 h-14 bg-gray-50 dark:bg-black border border-gray-400 dark:border-gray-700 data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
      >
        {ACTUATION_POINT[y][x]}
      </p>
    {/snippet}
  </svelte:component>
{/if}

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-primary-100 dark:bg-black border border-transparent dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {t('performance.title', currentLanguage)}
    </h2>
    <div class="flex gap-2 mb-2">
      <button
        class="px-4 py-2 rounded mr-1 transition-colors duration-200 text-white {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        style="background-color: var(--theme-color-primary);"
        onmouseover={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor =
            'color-mix(in srgb, var(--theme-color-primary) 85%, black)')}
        onmouseout={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-color-primary)')}
      >
        {t('performance.selectAllKeys', currentLanguage)}
      </button>
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border dark:border-white px-4 py-2 rounded transition-colors duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
      >
        {t('performance.discardSelection', currentLanguage)}
      </button>
    </div>
  </div>
  <div
    class="rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <!-- 1st Box: Actuation Point -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        {t('performance.actuationPoint', currentLanguage)}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t('performance.actuationPointDesc', currentLanguage)}
      </p>
      <div class="mb-2 flex-1">
        <div class="relative">
          <div class="flex justify-between text-sm {'text-gray-500 dark:text-gray-400'} mb-1">
            <div>{t('performance.actuationPointLabel', currentLanguage)}</div>
            <div>{actuationPoint.toFixed(2)} {t('units.mm', currentLanguage)}</div>
          </div>

          <!-- Warning box for values below 0.3 -->
          {#if actuationPoint < 0.3}
            <div
              class="mb-2 p-2 {'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900 border-yellow-600 text-yellow-200'} border rounded-md text-xs flex items-center gap-2"
            >
              <AlertTriangle size={14} />
              {t('performance.sensitivityWarning', currentLanguage)}
            </div>
          {/if}

          <!-- Dual input: Slider -->
          <input
            type="range"
            min="0.01"
            max="4"
            step="0.01"
            bind:value={actuationPoint}
            class="w-full h-2 rounded-full {'bg-gray-300 dark:bg-gray-700'} appearance-none slider-thumb mb-2"
          />

          <!-- Dual input: Text input -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400"
              >{t('performance.directInput', currentLanguage)}:</span
            >
            <input
              type="number"
              min="0.01"
              max="4"
              step="0.01"
              bind:value={actuationPoint}
              class="w-20 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
            />
            <span class="text-xs text-gray-500 dark:text-gray-400">mm</span>
          </div>
          <div class="flex justify-between text-sm {'text-gray-500 dark:text-gray-400'} mb-1">
            <div>{t('performance.high', currentLanguage)}</div>
            <div>{t('performance.low', currentLanguage)}</div>
          </div>
        </div>
        <!-- Keys selected indicator -->
        <div class="mt-4 text-gray-900 dark:text-white font-medium">
          {keysSelected}
          {t('performance.keysSelected', currentLanguage)}
        </div>
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>

    <!-- 2nd Box: Rapid Trigger Toggles (moved from 3rd position) -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.enableRapidTrigger', currentLanguage)}
        </h3>
        <button
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Rapid Trigger Toggle"
          style="background-color: {rapidTriggerEnabled
            ? 'var(--theme-color-primary)'
            : '#d1d5db dark:#4b5563'};"
          onclick={() => (rapidTriggerEnabled = !rapidTriggerEnabled)}
        >
          <span
            class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={rapidTriggerEnabled}
            class:translate-x-1={!rapidTriggerEnabled}
          ></span>
        </button>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t('performance.rapidTriggerDesc', currentLanguage)}
      </p>
      <div class="flex-1">
        {#if rapidTriggerEnabled}
          <div
            class="flex items-center justify-between mb-4 border-t dark:border-white border-gray-200 pt-4"
          >
            <h4 class="text-lg font-medium text-gray-900 dark:text-white">
              {t('performance.enableContinuousRapidTrigger', currentLanguage)}
            </h4>
            <button
              class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
              aria-label="Continuous Rapid Trigger Toggle"
              style="background-color: {continuousRapidTriggerEnabled
                ? 'var(--theme-color-primary)'
                : '#d1d5db dark:#4b5563'};"
              onclick={() => (continuousRapidTriggerEnabled = !continuousRapidTriggerEnabled)}
            >
              <span
                class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
                class:translate-x-6={continuousRapidTriggerEnabled}
                class:translate-x-1={!continuousRapidTriggerEnabled}
              ></span>
            </button>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {t('performance.continuousRapidTriggerFullDesc', currentLanguage)}
          </p>
        {/if}
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>

    <!-- 3rd Box: Sensitivity Slider & Toggle (moved from 2nd position) -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.rapidTriggerSensitivity', currentLanguage)}
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Separate Press/Release</span>
          <button
            class="relative inline-flex items-center h-5 rounded-full w-10 transition-colors focus:outline-none"
            aria-label="Separate Sensitivity Toggle"
            style="background-color: {separateSensitivity
              ? 'var(--theme-color-primary)'
              : '#d1d5db dark:#4b5563'};"
            onclick={() => (separateSensitivity = !separateSensitivity)}
          >
            <span
              class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
              class:translate-x-5={separateSensitivity}
              class:translate-x-1={!separateSensitivity}
            ></span>
          </button>
        </div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
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
              bind:value={pressSensitivity}
              class="w-full h-2 rounded-full {'bg-gray-300 dark:bg-gray-700'} appearance-none slider-thumb"
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
              bind:value={releaseSensitivity}
              class="w-full h-2 rounded-full {'bg-gray-300 dark:bg-gray-700'} appearance-none slider-thumb"
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
              bind:value={sensitivityValue}
              class="w-full h-2 rounded-full {'bg-gray-300 dark:bg-gray-700'} appearance-none slider-thumb"
            />
            <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
              <div>{t('performance.high', currentLanguage)}</div>
              <div>{t('performance.low', currentLanguage)}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
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
