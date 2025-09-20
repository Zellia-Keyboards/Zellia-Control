<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import NewZellia60HE from '$lib/NewZellia60HE.svelte';
  import Zellia80HE from '$lib/Zellia80HE.svelte';
  import KeyboardRender from '$lib/KeyboardRender.svelte';
  import { keyboardConnection } from '$lib/KeyboardConnectionStore.svelte';
  import { AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import * as kle from '@ijprest/kle-serial';

  const layout = `[["Esc","!\\n1","@\\n2","#\\n3","$\\n4","%\\n5","^\\n6","&\\n7","*\\n8","(\\n9",")\\n0","_\\n-","+\\n=",{"w":2},"Backspace"],[{"w":1.5},"Tab","Q","W","E","R","T","Y","U","I","O","P","{\\n[","}\\n]",{"w":1.5},"|\\n\\\\"],[{"w":1.75},"Caps Lock","A","S","D","F","G","H","J","K","L",":\\n;","\\"\\n'",{"w":2.25},"Enter"],[{"w":2},"Shift","Z","X","C","V","B","N","M","<\\n,",">\\n.","?\\n/","Shift","↑","Del"],[{"w":1.25},"Ctrl",{"w":1.25},"Win",{"w":1.25},"Alt",{"a":7,"w":6.25},"",{"a":4},"Alt","Fn","←","↓","→"]]`;
  
  let currentLanguage = $derived($language);

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

  let keyboard_keys : kle.Key[] = kle.Serial.deserialize(JSON.parse(layout)).keys;

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
  let precisionMode = $state(false);

  
  $effect(() => {
    if (!precisionMode) {
      
      actuationPoint = Math.round(actuationPoint * 100) / 100;
    }
  });
</script>

<div>
  <KeyboardRender
  keys={keyboard_keys}/>
</div>

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
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.actuationPoint', currentLanguage)}
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Enable Precision</span>
          <button
            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {precisionMode ? '' : 'bg-gray-300 dark:bg-gray-600'}"
            aria-label="Precision Mode Toggle"
            style="background: {precisionMode ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)' : ''};"
            onclick={() => (precisionMode = !precisionMode)}
          >
            <span
              class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
              class:translate-x-6={precisionMode}
              class:translate-x-1={!precisionMode}
              style="background: {precisionMode ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)' : '#ffffff'};"
            ></span>
          </button>
        </div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t('performance.actuationPointDesc', currentLanguage)}
      </p>
      <div class="mb-2 flex-1">
        <div class="relative">
          <div class="flex justify-between text-sm {'text-gray-500 dark:text-gray-400'} mb-1">
            <div>{t('performance.actuationPointLabel', currentLanguage)} {precisionMode ? '(Precision: 0.005mm)' : '(Standard: 0.01mm)'}</div>
            <div>{precisionMode ? actuationPoint.toFixed(3) : actuationPoint.toFixed(2)} {t('units.mm', currentLanguage)}</div>
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
            step={precisionMode ? "0.005" : "0.01"}
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
              step={precisionMode ? "0.005" : "0.01"}
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
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {rapidTriggerEnabled ? '' : 'bg-gray-300 dark:bg-gray-600'}"
          aria-label="Rapid Trigger Toggle"
          style="background: {rapidTriggerEnabled ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)' : ''};"
          onclick={() => (rapidTriggerEnabled = !rapidTriggerEnabled)}
        >
          <span
            class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
            class:translate-x-6={rapidTriggerEnabled}
            class:translate-x-1={!rapidTriggerEnabled}
            style="background: {rapidTriggerEnabled ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)' : '#ffffff'};"
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
              class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {continuousRapidTriggerEnabled ? '' : 'bg-gray-300 dark:bg-gray-600'}"
              aria-label="Continuous Rapid Trigger Toggle"
              style="background: {continuousRapidTriggerEnabled ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)' : ''};"
              onclick={() => (continuousRapidTriggerEnabled = !continuousRapidTriggerEnabled)}
            >
              <span
                class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
                class:translate-x-6={continuousRapidTriggerEnabled}
                class:translate-x-1={!continuousRapidTriggerEnabled}
                style="background: {continuousRapidTriggerEnabled ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)' : '#ffffff'};"
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
            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {separateSensitivity ? '' : 'bg-gray-300 dark:bg-gray-600'}"
            aria-label="Separate Sensitivity Toggle"
            style="background: {separateSensitivity ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)' : ''};"
            onclick={() => (separateSensitivity = !separateSensitivity)}
          >
            <span
              class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
              class:translate-x-6={separateSensitivity}
              class:translate-x-1={!separateSensitivity}
              style="background: {separateSensitivity ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)' : '#ffffff'};"
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
