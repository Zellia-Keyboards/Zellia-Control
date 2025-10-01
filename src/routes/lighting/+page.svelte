<script lang="ts">
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

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
  let perKeyMode = $state(false);
  let selectedKeys = $state(new Set());
  let keyColor = $state('#ffffff');

  let CurrentSelected = $state<[number, number] | null>(null);

  // Convert frontend brightness (0-100) to hardware brightness (0-70)
  function getHardwareBrightness(frontendBrightness: number): number {
    return Math.round((frontendBrightness / 100) * 70);
  } // Convert hardware brightness (0-70) to frontend brightness (0-100)
  function getFrontendBrightness(hardwareBrightness: number): number {
    return Math.round((hardwareBrightness / 70) * 100);
  }

  const effects = $derived([
    {
      id: 'static',
      name: t('lighting.static', currentLanguage),
      description: t('lighting.staticDesc', currentLanguage),
    },
    {
      id: 'breathing',
      name: t('lighting.breathing', currentLanguage),
      description: t('lighting.breathingDesc', currentLanguage),
    },
    {
      id: 'wave',
      name: t('lighting.wave', currentLanguage),
      description: t('lighting.waveDesc', currentLanguage),
    },
    {
      id: 'ripple',
      name: t('lighting.ripple', currentLanguage),
      description: t('lighting.rippleDesc', currentLanguage),
    },
    {
      id: 'rainbow',
      name: t('lighting.rainbow', currentLanguage),
      description: t('lighting.rainbowDesc', currentLanguage),
    },
    {
      id: 'reactive',
      name: t('lighting.reactive', currentLanguage),
      description: t('lighting.reactiveDesc', currentLanguage),
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
    if (CurrentSelected) {
      const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
      if (selectedKeys.has(keyId)) {
        selectedKeys.delete(keyId);
      } else {
        selectedKeys.add(keyId);
      }
      selectedKeys = new Set(selectedKeys);
    }
  }

  function applyToSelectedKeys() {
    // Apply current color to selected keys
    console.log('Applying color to selected keys:', selectedKeys);
  }

  function clearKeySelection() {
    selectedKeys.clear();
    selectedKeys = new Set(selectedKeys);
  }

  function applySettings() {
    const hardwareBrightness = getHardwareBrightness(brightness);

    console.log('Applying lighting settings:', {
      effect: selectedEffect,
      brightness: hardwareBrightness, // Send hardware value (0-70)
      frontendBrightness: brightness, // For reference (0-100)
      speed,
      direction,
      staticColor,
      layer: selectedLayer,
    });
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
      <button
        class="bg-gray-800 dark:bg-gray-800 hover:bg-gray-700 dark:hover:bg-gray-700 text-white border border-white dark:border-white px-4 py-2 rounded transition-colors {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={() => (perKeyMode = !perKeyMode)}
      >
        {perKeyMode
          ? t('lighting.exitPerKeyMode', currentLanguage)
          : t('lighting.perKeyMode', currentLanguage)}
      </button>
    </div>
  </div>

  <div
    class="rounded-xl shadow p-6 flex flex-col lg:flex-row gap-6 flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <!-- Effects Panel -->
    <div class="flex-1 min-w-[300px]">
      <div class="grid grid-cols-2 gap-3 mb-6">
        {#each effects as effect}
          <button
            class="p-3 rounded-lg border-2 text-left transition-all duration-200 relative overflow-hidden {selectedEffect === effect.id
              ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg shadow-primary/25'
              : 'border-[#e5e5e5] bg-transparent dark:border-[#4b5563] hover:border-primary/50 hover:bg-primary/5'} {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''}"
            data-activate={selectedEffect === effect.id}
            onclick={() => (selectedEffect = effect.id)}
          >
            {#if selectedEffect === effect.id}
              <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"></div>
            {/if}
            <div class="relative z-10 font-medium {selectedEffect === effect.id ? 'text-primary-700 dark:text-primary-200' : 'text-black dark:text-white'}">
              {effect.name}
            </div>
            <div class="relative z-10 text-sm {selectedEffect === effect.id ? 'text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300'}">
              {effect.description}
            </div>
          </button>
        {/each}
      </div>

      <!-- Global Controls -->
      <div class="space-y-4">
        <!-- Brightness -->
        <div>
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>{t('lighting.brightness', currentLanguage)}</span>
            <span>{brightness}%</span>
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
            <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>{t('lighting.speed', currentLanguage)}</span>
              <span>{speed}%</span>
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

        <!-- Direction (for directional effects) -->
        {#if ['rainbow'].includes(selectedEffect)}
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-2"
              >{t('lighting.direction', currentLanguage)}</label
            >
            <select
              bind:value={direction}
              class="w-full p-2 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg"
            >
              {#each directions as dir}
                <option value={dir.id}>{dir.name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>

    <!-- Divider -->
    <div class="hidden lg:block w-px bg-gray-200 dark:bg-white"></div>

    <!-- Color Controls Panel -->
    <div class="flex-1 min-w-[300px]">
      <h3 class="text-lg font-medium mb-4 text-black dark:text-white">
        {t('lighting.colorSettings', currentLanguage)}
      </h3>
      {#if perKeyMode}
        <!-- Per-Key Color Mode -->
        <div class="space-y-4">
          <div
            class="p-3 rounded-lg border dark:bg-black bg-white dark:border-white border-[#e5e5e5] {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''}"
          >
            <div class="font-medium text-black dark:text-white">
              {t('lighting.perKeyModeActive', currentLanguage)}
            </div>
            <div class="text-sm" style="color: var(--theme-color-primary);">
              {t('lighting.clickKeysToSelect', currentLanguage)}
            </div>
          </div>

          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-2"
              >{t('lighting.keyColor', currentLanguage)}</label
            >
            <div class="flex gap-2">
              <input
                type="color"
                bind:value={keyColor}
                class="w-12 h-10 rounded border-0 p-0 cursor-pointer overflow-hidden"
              />
              <input
                type="text"
                bind:value={keyColor}
                class="flex-1 p-2 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg font-mono"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 px-3 py-2 rounded transition-colors text-white bg-primary {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''}"
              style="background-color: var(--theme-color-primary);"
              onclick={toggleKeySelection}
              disabled={!CurrentSelected}
            >
              {CurrentSelected && selectedKeys.has(`${CurrentSelected[0]},${CurrentSelected[1]}`)
                ? t('lighting.deselectKey', currentLanguage)
                : t('lighting.selectKey', currentLanguage)}
            </button>
            <button
              class="{$glassmorphismMode
                ? 'glassmorphism-button'
                : ''} bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-800 border border-white px-3 py-2 rounded transition-colors"
              onclick={clearKeySelection}
            >
              {t('lighting.clear', currentLanguage)} ({selectedKeys.size})
            </button>
          </div>
          <button
            class="w-full px-3 py-2 rounded transition-colors text-white {$glassmorphismMode
              ? 'glassmorphism-button'
              : ''}"
            style="background-color: var(--theme-color-primary);"
            onclick={applyToSelectedKeys}
            disabled={selectedKeys.size === 0}
          >
            {t('lighting.applyToSelectedKeys', currentLanguage)}
          </button>
        </div>
      {:else}
        <!-- Effect-based Color Controls -->
        {#if selectedEffect === 'static' || selectedEffect === 'breathing' || selectedEffect === 'reactive'}
          <div>
            <spam class="block text-sm text-gray-600 dark:text-gray-300 mb-2"
              >{t('lighting.color', currentLanguage)}</spam
            >
            <div class="flex gap-2">
              <input
                type="color"
                bind:value={staticColor}
                class="w-12 h-10 rounded border-0 p-0 cursor-pointer overflow-hidden"
              />
              <input
                type="text"
                bind:value={staticColor}
                class="flex-1 p-2 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg font-mono"
                placeholder="#ff0000"
              />
            </div>
            {#if hexToRgb(staticColor)}
              {@const rgb = hexToRgb(staticColor)}
              {#if rgb}
                <div class="text-xs text-gray-600 dark:text-gray-400">
                  {formatString(t('lighting.rgbValues', currentLanguage), rgb.r, rgb.g, rgb.b)}
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div class="text-gray-600 dark:text-gray-300">
              {selectedEffect === 'rainbow'
                ? t('lighting.automaticColors', currentLanguage)
                : t('lighting.noColorSettings', currentLanguage)}
            </div>
          </div>
        {/if}
      {/if}
      <!-- Preview -->
      <div class="mt-6">
        <label class="block text-sm text-gray-600 dark:text-gray-300 mb-2"
          >{t('lighting.preview', currentLanguage)}</label
        >
        <div
          class="h-16 rounded-lg border {'border-gray-300 dark:border-white'} flex items-center justify-center"
          style:background={selectedEffect === 'static'
            ? staticColor
            : '#f3f4f6 dark:#374151'}
        >
          {#if selectedEffect === 'rainbow'}
            <div class="text-sm text-gray-600 dark:text-gray-300">
              {t('lighting.animatedEffect', currentLanguage)}
            </div>
          {:else if selectedEffect === 'reactive' || selectedEffect === 'ripple'}
            <div class="text-sm text-gray-600 dark:text-gray-300">
              {t('lighting.reactiveEffect', currentLanguage)}
            </div>
          {/if}
        </div>
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
