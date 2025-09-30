<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/keyboardAPI.svelte';
  import { AlertTriangle, AppleIcon, LetterText } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { selectedCount, toggleSelectAll, deselectAll } from '$lib/SelectedKeysStore';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys } from '$lib/ControllerStore.svelte';
  import { selectedKeys } from '$lib/SelectedKeysStore';

  //let advancedKey : ekc.AdvancedKey = $derived.by(()=>{
  //  var k = new ekc.AdvancedKey();
  //  k.mode = rapidTriggerEnabled ? ekc.KeyMode.KeyAnalogRapidMode : ekc.KeyMode.KeyAnalogNormalMode;
  //  k.activation_value = mmToPercent(actuationPoint);
  //  k.trigger_distance = mmToPercent(pressSensitivity);
  //  k.release_distance = mmToPercent(releaseSensitivity);
  //  k.upper_deadzone = mmToPercent(upperDeadzone);
  //  k.lower_deadzone = mmToPercent(4.0 - lowerDeadzone);
  //  return k;
  //});

  function mmToPercent(distance : number)
  {
    return distance / 4.0;
  }

  function percentToMm(distance : number)
  {
    return distance * 4.0;
  }

  let currentLanguage = $derived($language);

  let rapidTriggerEnabled = $state(false);
  let actuationPoint = $state(2.0);
  let sensitivityValue = $state(0.5);
  let separateSensitivity = $state(false);
  let pressSensitivity = $state(0.5);
  let releaseSensitivity = $state(0.5);
  let upperDeadzone = $state(0.500); // Start of key (top)
  let lowerDeadzone = $state(3.500); // Bottom of key
  let keysSelected = $state(0);

  let advancedKey : ekc.AdvancedKey = $derived.by(()=>{
    var k = new ekc.AdvancedKey();
    
    // 基础模式和点位计算
    k.mode = rapidTriggerEnabled ? ekc.KeyMode.KeyAnalogRapidMode : ekc.KeyMode.KeyAnalogNormalMode;
    k.activation_value = mmToPercent(actuationPoint); 

    // 灵敏度设置
    // 使用 separateSensitivity 来决定使用哪个值
    let finalPressSensitivity = separateSensitivity ? pressSensitivity : sensitivityValue;
    let finalReleaseSensitivity = separateSensitivity ? releaseSensitivity : sensitivityValue;
    
    k.trigger_distance = mmToPercent(finalPressSensitivity);
    k.release_distance = mmToPercent(finalReleaseSensitivity);
    
    // 死区设置 (仅在 Rapid Trigger 启用时有意义，但会设置)
    k.upper_deadzone = mmToPercent(upperDeadzone);
    k.lower_deadzone = mmToPercent(4.0 - lowerDeadzone); // 注意这里有一个 4.0 - lowerDeadzone 的转换 
    return k;
  });

  let hasSelection = $state(false);

  $effect(() => {
    const keysToUpdate = $selectedKeys;
    const isSelected = $selectedKeys.length > 0;
    if (isSelected && !hasSelection) {
      let k = $advancedKeys[$selectedKeys[0]];
      rapidTriggerEnabled = k.mode === ekc.KeyMode.KeyAnalogRapidMode;
      separateSensitivity = k.trigger_distance != k.release_distance;
      pressSensitivity = percentToMm(k.trigger_distance);
      sensitivityValue = percentToMm(k.trigger_distance);
      releaseSensitivity = percentToMm(k.release_distance);
      upperDeadzone = percentToMm(k.upper_deadzone);
      lowerDeadzone = percentToMm(k.lower_deadzone);
    }
    // 只有在有按键被选中的时候才更新
    if (keysToUpdate.length === 0) {
      return;
    }
    hasSelection = isSelected;
    
    // 更新 advancedKeys 存储
    advancedKeys.update(currentKeys => {
      // 创建一个新的数组副本进行修改
      const newKeys = [...currentKeys]; 
      const config = advancedKey;

      // 遍历所有选中的按键索引，将配置应用到对应位置
      for (const index of keysToUpdate) {
        // 确保索引在数组范围内，并应用新的配置
        if (index >= 0 && index < newKeys.length) {
          // 创建一个新对象以避免直接修改旧对象（保持不变性）
          newKeys[index] = { ...config }; 
        }
      }
      return newKeys;
    });
    keyboardConnectionState.controller?.send_advanced_key_packet($selectedKeys,advancedKey);
  });

  // Update local count from store (auto-subscribes)
  $derived: keysSelected = $selectedCount;

  // Keyboard shortcuts
  function onKeyDown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    // Ctrl+A behavior
    if (ctrl && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      toggleSelectAll();
      return;
    }

    // Ctrl+Escape => deselect all
    if (ctrl && e.key === 'Escape') {
      e.preventDefault();
      deselectAll();
      return;
    }
  }

  // Attach listener on mount
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
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
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
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
        onclick={() => toggleSelectAll()}
      >
        {t('performance.selectAllKeys', currentLanguage)}
      </button>
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border dark:border-white px-4 py-2 rounded transition-colors duration-200 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={() => deselectAll()}
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
