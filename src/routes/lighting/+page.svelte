<script lang="ts">
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { selectedKeys } from '$lib/SelectedKeysStore';
  import { selectedCount, toggleSelectAll, deselectAll } from '$lib/SelectedKeysStore';

  // Helper function for string formatting
  const formatString = (template: string, ...args: (string | number)[]): string => {
    return template.replace(/{(\d+)}/g, (match, index) => {
      return args[index] !== undefined ? String(args[index]) : match;
    });
  };

  let currentLanguage = $derived($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  let selectedEffect = $state('static');
  let brightness = $state(100); // Frontend display value (0-100)
  let speed = $state(50);
  let direction = $state('left-to-right');
  let staticColor = $state('#ff0000');
  let selectedLayer = $state(1);
  let keyColor = $state('#ffffff');
  let effectMode = $state<'global' | 'per-key'>('per-key'); // Track effect scope

  let CurrentSelected = $state<[number, number] | null>(null);

  // Convert frontend brightness (0-100) to hardware brightness (0-70)
  function getHardwareBrightness(frontendBrightness: number): number {
    return Math.round((frontendBrightness / 100) * 70);
  } // Convert hardware brightness (0-70) to frontend brightness (0-100)
  function getFrontendBrightness(hardwareBrightness: number): number {
    return Math.round((hardwareBrightness / 70) * 100);
  }

  // Global effects - apply to entire keyboard (全键盘效果)
  const globalEffects = $derived([
    {
      id: 'rainbow',
      name: t('lighting.rainbow', currentLanguage), // 彩虹
      description: t('lighting.rainbowDesc', currentLanguage),
      mode: 'global' as const,
    },
    {
      id: 'wave',
      name: t('lighting.wave', currentLanguage), // 波浪
      description: t('lighting.waveDesc', currentLanguage),
      mode: 'global' as const,
    },
    {
      id: 'breathing',
      name: t('lighting.breathing', currentLanguage), // 呼吸
      description: t('lighting.breathingDesc', currentLanguage),
      mode: 'global' as const,
    },
  ]);

  // Per-key effects - can be customized per key (单键效果)
  const perKeyEffects = $derived([
    {
      id: 'static',
      name: t('lighting.static', currentLanguage),
      description: t('lighting.staticDesc', currentLanguage),
      mode: 'per-key' as const,
    },
    {
      id: 'reactive',
      name: t('lighting.reactive', currentLanguage),
      description: t('lighting.reactiveDesc', currentLanguage),
      mode: 'per-key' as const,
    },
    {
      id: 'ripple',
      name: t('lighting.ripple', currentLanguage),
      description: t('lighting.rippleDesc', currentLanguage),
      mode: 'per-key' as const,
    },
  ]);

  const directions = $derived([
    { id: 'left-to-right', name: t('lighting.leftToRight', currentLanguage) },
    { id: 'right-to-left', name: t('lighting.rightToLeft', currentLanguage) },
    { id: 'top-to-bottom', name: t('lighting.topToBottom', currentLanguage) },
    { id: 'bottom-to-top', name: t('lighting.bottomToTop', currentLanguage) },
    { id: 'center-out', name: t('lighting.centerOut', currentLanguage) },
    { id: 'outside-in', name: t('lighting.outsideIn', currentLanguage) },
  ]);

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  function toggleKeySelection() {


  }

  function applyToSelectedKeys() {
    // Apply current color to selected keys
    console.log('Applying color to selected keys:', selectedKeys);

    
  }

  function clearKeySelection() {
    //selectedKeys.clear();
    //selectedKeys = new Set(selectedKeys);
  }

  function applySettings() {
    const hardwareBrightness = getHardwareBrightness(brightness);

    console.log('Applying lighting settings:', {
      effect: selectedEffect,
      effectMode,
      brightness: hardwareBrightness, // Send hardware value (0-70)
      frontendBrightness: brightness, // For reference (0-100)
      speed,
      direction,
      staticColor,
      layer: selectedLayer,
      selectedKeys: effectMode === 'per-key' ? Array.from(selectedKeys) : 'all',
    });
  }

  // Update effect mode when selecting an effect
  function selectEffect(effectId: string, mode: 'global' | 'per-key') {
    selectedEffect = effectId;
    effectMode = mode;
  }
</script>


<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-black dark:text-white">
      {t('lighting.title', currentLanguage)}
    </h2>
    <div class="flex gap-2 mb-2">
      <button
        class="px-4 py-2 rounded transition-colors text-white {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        style="background-color: var(--theme-color-primary);"
        onclick={applySettings}
      >
        {t('lighting.applySettings', currentLanguage)}
      </button>
    </div>
  </div>

  <div
    class="rounded-xl shadow p-4 flex flex-col lg:flex-row gap-4 flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <!-- Left: Effects Panel -->
    <div class="flex-1">
      <!-- Global Effects (全键盘效果) -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="text-sm font-semibold text-black dark:text-white">{t('lighting.globalEffects', currentLanguage)}</h3>
          <span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {t('lighting.allKeys', currentLanguage)}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          {#each globalEffects as effect}
            <button
              class="px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 relative overflow-hidden {selectedEffect === effect.id
                ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''}"
              onclick={() => selectEffect(effect.id, effect.mode)}
            >
              {#if selectedEffect === effect.id}
                <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"></div>
              {/if}
              <div class="relative z-10 text-xs font-medium {selectedEffect === effect.id ? 'text-primary-700 dark:text-primary-200' : 'text-black dark:text-white'}">
                {effect.name}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Per-Key Effects (单键效果) -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="text-sm font-semibold text-black dark:text-white">{t('lighting.perKeyEffects', currentLanguage)}</h3>
          <span class="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            {t('lighting.customizable', currentLanguage)}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          {#each perKeyEffects as effect}
            <button
              class="px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 relative overflow-hidden {selectedEffect === effect.id
                ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''}"
              onclick={() => selectEffect(effect.id, effect.mode)}
            >
              {#if selectedEffect === effect.id}
                <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"></div>
              {/if}
              <div class="relative z-10 text-xs font-medium {selectedEffect === effect.id ? 'text-primary-700 dark:text-primary-200' : 'text-black dark:text-white'}">
                {effect.name}
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Right: Settings Panel -->
    <div class="flex-1 space-y-3">
      <!-- Brightness -->
      <div>
        <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
          <span>{t('lighting.brightness', currentLanguage)}</span>
          <span class="font-semibold">{brightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          bind:value={brightness}
          class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
        />
      </div>

      <!-- Speed (for animated effects) -->
      {#if ['breathing', 'wave', 'rainbow'].includes(selectedEffect)}
        <div>
          <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.speed', currentLanguage)}</span>
            <span class="font-semibold">{speed}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            bind:value={speed}
            class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
          />
        </div>
      {/if}

      <!-- Color (for applicable effects) -->
      {#if selectedEffect === 'static' || selectedEffect === 'breathing' || selectedEffect === 'reactive'}
        <div>
          <div class="text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            {t('lighting.color', currentLanguage)}
          </div>
          <div class="flex gap-2">
            <input
              type="color"
              bind:value={staticColor}
              class="w-10 h-9 rounded border-0 p-0 cursor-pointer overflow-hidden"
            />
            <input
              type="text"
              bind:value={staticColor}
              class="flex-1 px-2 py-1.5 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg font-mono text-xs"
              placeholder="#ff0000"
            />
          </div>
        </div>
      {/if}

      <!-- Direction (for directional effects) -->
      {#if ['rainbow'].includes(selectedEffect)}
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1.5"
            >{t('lighting.direction', currentLanguage)}</label
          >
          <select
            bind:value={direction}
            class="w-full px-2 py-1.5 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg text-xs"
          >
            {#each directions as dir}
              <option value={dir.id}>{dir.name}</option>
            {/each}
          </select>
        </div>
      {/if}
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

  /* Color input styling to fill containers */
  input[type="color"] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
  }
  
  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
    border: none;
    border-radius: inherit;
  }
  
  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: inherit;
    padding: 0;
  }
  
  input[type="color"]::-moz-color-swatch {
    border: none;
    border-radius: inherit;
  }
</style>
