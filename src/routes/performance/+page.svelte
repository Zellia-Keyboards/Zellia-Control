<script lang="ts">
  import { glassmorphismMode } from '$lib/hooks/DarkModeStore.svelte';
  import NewZellia80He from '$lib/keyboard/NewZellia80HE.svelte';
  import NewZellia60HE from '$lib/keyboard/NewZellia60HE.svelte';
  import Zellia80HE from '$lib/keyboard/Zellia80HE.svelte';
  import { keyboardAPI } from '$lib/hooks/keyboardAPI.svelte';
  import { AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/hooks/LanguageStore.svelte';


  
  let currentLanguage = $derived($language);

  // Derived variable to determine which keyboard component to show
  let currentKeyboard = $derived(() => {
    const selectedModel = keyboardAPI.state.selectedModel;
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
  let actuationPoint = $state(2.0);
  let sensitivityValue = $state(0.5);
  let separateSensitivity = $state(false);
  let pressSensitivity = $state(0.5);
  let releaseSensitivity = $state(0.5);
  let upperDeadzone = $state(0.500); // Start of key (top)
  let lowerDeadzone = $state(3.500); // Bottom of key
  let keysSelected = $state(0);
</script>

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
    <!-- 1st Box: Actuation Point (with slide-out animation) -->
    <div class="actuation-point-container" class:slide-out={rapidTriggerEnabled}>
      <div class="flex-1 min-w-[260px] flex flex-col h-full">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {t('performance.actuationPoint', currentLanguage)}
          </h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('performance.actuationPointDesc', currentLanguage)}
        </p>
        <div class="mb-2 flex-1">
          <div class="relative">
            <div class="flex justify-between text-sm {'text-gray-500 dark:text-gray-400'} mb-1">
              <div>{t('performance.actuationPointLabel', currentLanguage)} (Precision: 0.005mm)</div>
              <div>{actuationPoint.toFixed(3)} {t('units.mm', currentLanguage)}</div>
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
              min="0.005"
              max="4"
              step="0.005"
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
                min="0.005"
                max="4"
                step="0.005"
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
    </div>

    <!-- Divider for desktop (with animation) -->
    <div class="divider-container" class:slide-out={rapidTriggerEnabled}>
      <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>
    </div>

    <!-- 2nd Box: Rapid Trigger Toggle -->
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
          <!-- Dual-handle slider for upper and lower deadzones -->
          <div class="border-t dark:border-white border-gray-200 pt-4 deadzone-container {$glassmorphismMode ? 'glassmorphism-card' : ''}">
            <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Key Travel Deadzones
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Adjust the start and bottom deadzone limits for rapid trigger activation.
            </p>
            
            <!-- Dual Range Slider for Deadzones -->
            <div class="mb-3">
              <div class="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
                <div>Start: {upperDeadzone.toFixed(3)}mm</div>
                <div>Bottom: {lowerDeadzone.toFixed(3)}mm</div>
              </div>
              
              <!-- Dual Range Slider Container -->
              <div class="relative mb-4">
                <!-- Background track -->
                <div class="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full relative overflow-hidden">
                  <!-- Dead zone before start (left side) -->
                  <div 
                    class="absolute h-full rounded-l-full deadzone-pattern"
                    style="left: 0%; width: {(upperDeadzone / 4) * 100}%;"
                  ></div>
                  
                  <!-- Active range highlight -->
                  <div 
                    class="absolute h-full"
                    style="background: linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%); left: {(upperDeadzone / 4) * 100}%; width: {((lowerDeadzone - upperDeadzone) / 4) * 100}%;"
                  ></div>
                  
                  <!-- Dead zone after bottom (right side) -->
                  <div 
                    class="absolute h-full rounded-r-full deadzone-pattern"
                    style="left: {(lowerDeadzone / 4) * 100}%; width: {((4 - lowerDeadzone) / 4) * 100}%;"
                  ></div>
                </div>
                
                <!-- Start deadzone slider (upper) -->
                <input
                  type="range"
                  min="0.005"
                  max="4.000"
                  step="0.005"
                  bind:value={upperDeadzone}
                  class="absolute top-0 w-full h-2 appearance-none bg-transparent dual-range-slider upper-handle"
                  style="pointer-events: none;"
                />
                
                <!-- Bottom deadzone slider (lower) -->
                <input
                  type="range"
                  min="0.005"
                  max="4.000"
                  step="0.005"
                  bind:value={lowerDeadzone}
                  class="absolute top-0 w-full h-2 appearance-none bg-transparent dual-range-slider lower-handle"
                  style="pointer-events: none;"
                />
              </div>
              
              <!-- Direct inputs -->
              <div class="flex justify-between items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Start:</span>
                  <input
                    type="number"
                    min="0.005"
                    max={lowerDeadzone - 0.005}
                    step="0.005"
                    bind:value={upperDeadzone}
                    class="w-16 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
                  />
                  <span class="text-xs text-gray-500 dark:text-gray-400">mm</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Bottom:</span>
                  <input
                    type="number"
                    min={upperDeadzone + 0.005}
                    max="4.000"
                    step="0.005"
                    bind:value={lowerDeadzone}
                    class="w-16 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
                  />
                  <span class="text-xs text-gray-500 dark:text-gray-400">mm</span>
                </div>
              </div>
            </div>

          </div>
        {/if}
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>

    <!-- 3rd Box: Sensitivity Slider & Toggle -->
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

  /* Animation for actuation point slide-out */
  .actuation-point-container {
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    opacity: 1;
    width: auto;
    flex: 1;
    min-width: 260px;
    overflow: hidden;
  }

  .actuation-point-container.slide-out {
    transform: translateX(100%);
    opacity: 0;
    width: 0;
    min-width: 0;
    flex: 0;
    margin: 0;
    padding: 0;
  }

  /* Divider animation */
  .divider-container {
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    opacity: 1;
    width: auto;
    overflow: hidden;
  }

  .divider-container.slide-out {
    transform: translateX(100%);
    opacity: 0;
    width: 0;
    margin: 0;
    padding: 0;
  }

  /* Dual range slider styling */
  .dual-range-slider {
    pointer-events: auto !important;
    z-index: 1;
  }
  
  .dual-range-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    position: relative;
    z-index: 2;
  }
  
  .dual-range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    position: relative;
    z-index: 2;
  }

  /* Upper handle (start deadzone) */
  .upper-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  }
  .upper-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  }

  /* Lower handle (bottom deadzone) */
  .lower-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #4ecdc4 0%, #44b3ac 100%);
  }
  .lower-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #4ecdc4 0%, #44b3ac 100%);
  }

  /* Make sure sliders don't interfere with each other */
  .lower-handle {
    z-index: 3;
  }
  .upper-handle {
    z-index: 2;
  }
  
  /* Improve handle interaction */
  .dual-range-slider:hover {
    z-index: 4 !important;
  }
  
  .dual-range-slider:active {
    z-index: 5 !important;
  }

  /* Deadzone pattern styling */
  .deadzone-pattern {
    background: repeating-linear-gradient(
      45deg,
      #ff4444 0px,
      #ff4444 2px,
      #000000 2px,
      #000000 4px,
      #ff4444 4px,
      #ff4444 6px,
      #000000 6px,
      #000000 8px
    );
    opacity: 0.9;
  }

  /* Dark mode deadzone pattern */
  :global(.dark) .deadzone-pattern {
    background: repeating-linear-gradient(
      45deg,
      #ff4444 0px,
      #ff4444 2px,
      #000000 2px,
      #000000 4px,
      #ff4444 4px,
      #ff4444 6px,
      #000000 6px,
      #000000 8px
    );
    opacity: 0.8;
  }

  /* Glassmorphism styling for deadzone container */
  .deadzone-container {
    border-radius: 12px;
    padding: 16px;
    margin-top: 8px;
  }

  .glassmorphism-inner {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Ensure consistent height without forcing scroll */
  .flex-1.min-w-\[260px\].flex.flex-col {
    height: 100%;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .actuation-point-container.slide-out {
      transform: translateY(-100%);
      height: 0;
      min-height: 0;
    }
    
    .divider-container.slide-out {
      transform: translateY(-100%);
      height: 0;
    }
  }
</style>
