<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import * as ekc from 'emi-keyboard-controller';
  import tinycolor from 'tinycolor2';
  import DirectionSelector from './DirectionSelector.svelte';

  export type RGBBaseModeType =
    | typeof ekc.RGBBaseMode.RgbBaseModeOff
    | typeof ekc.RGBBaseMode.RgbBaseModeBlank
    | typeof ekc.RGBBaseMode.RgbBaseModeRainbow
    | typeof ekc.RGBBaseMode.RgbBaseModeWave;

  interface Props {
    baseConfig: ekc.RGBBaseConfig;
    onConfigChange: (config: ekc.RGBBaseConfig) => void;
    title?: string;
  }

  let { baseConfig, onConfigChange, title }: Props = $props();
  let currentLanguage = $derived($language);

  // Local state for mode - initialize from prop but don't sync back
  // This allows the UI to show immediate feedback when clicking
  let selectedMode = $state(baseConfig.mode);

  // Local state for deferred apply
  let localColor = $state('');
  let localSubColor = $state('');
  let localSpeed = $state(0);
  let localDirection = $state(0);
  let localDensity = $state(10);
  let localBrightness = $state(128); // 0-255

  // Convert RGB to hex
  function rgbToHex(rgb: { red: number; green: number; blue: number }): string {
    const toHex = (c: number) => ('0' + Math.floor(c).toString(16)).slice(-2);
    return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
  }

  // Initialize local state when baseConfig changes
  $effect(() => {
    selectedMode = baseConfig.mode;
    localColor = rgbToHex(baseConfig.rgb);
    localSubColor = rgbToHex(baseConfig.secondary_rgb);
    localSpeed = Math.round(baseConfig.speed * 1000);
    localDirection = baseConfig.direction ?? 0;
    localDensity = baseConfig.density ?? 10;
    localBrightness = baseConfig.brightness ?? 128;
  });

  // Base mode options
  const baseModes = $derived([
    { value: ekc.RGBBaseMode.RgbBaseModeOff, label: t('rgb_base_mode_off', currentLanguage) },
    { value: ekc.RGBBaseMode.RgbBaseModeBlank, label: t('rgb_base_mode_blank', currentLanguage) },
    { value: ekc.RGBBaseMode.RgbBaseModeRainbow, label: t('rgb_base_mode_rainbow', currentLanguage) },
    { value: ekc.RGBBaseMode.RgbBaseModeWave, label: t('rgb_base_mode_wave', currentLanguage) },
  ]);

  // Apply all changes at once
  function applyChanges() {
    const newConfig = new ekc.RGBBaseConfig();
    newConfig.mode = selectedMode;
    newConfig.speed = isNaN(localSpeed) ? 0 : Math.round(localSpeed) / 1000;
    newConfig.direction = localDirection;
    newConfig.density = localDensity;
    newConfig.brightness = localBrightness;

    const c = tinycolor(localColor).toRgb();
    newConfig.rgb.red = c.r;
    newConfig.rgb.green = c.g;
    newConfig.rgb.blue = c.b;

    const sc = tinycolor(localSubColor).toRgb();
    newConfig.secondary_rgb.red = sc.r;
    newConfig.secondary_rgb.green = sc.g;
    newConfig.secondary_rgb.blue = sc.b;

    onConfigChange(newConfig);
  }
</script>

<div
  class="rounded-2xl shadow bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col glassmorphism-card overflow-hidden"
>
  <!-- Header with Apply button -->
  <div
    class="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
    style="padding: calc(1.25rem * var(--ui-scale, 1));"
  >
    <h3
      class="font-bold text-black dark:text-white"
      style="font-size: calc(1.1rem * var(--ui-scale, 1));"
    >
      {title || t('lighting.baseConfigTitle', currentLanguage)}
    </h3>
    <button
      onclick={applyChanges}
      class="px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors glassmorphism-button"
    >
      {t('lighting.apply', currentLanguage)}
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    <!-- Mode & Color Section -->
    <div
      class="border-b border-gray-200 dark:border-gray-700"
      style="padding: calc(1rem * var(--ui-scale, 1));"
    >
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.mode', currentLanguage)} &amp; {t('lighting.color', currentLanguage)}
      </h4>

      <!-- Mode buttons -->
      <div class="grid grid-cols-4 gap-2 mb-4">
        {#each baseModes as mode}
          {@const isSelected = selectedMode === mode.value}
          <button
            class="px-3 py-2 min-h-[38px] rounded-lg border text-center transition-all duration-200 relative overflow-hidden {isSelected
              ? 'border-primary bg-primary/20 dark:bg-primary/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary/50 glassmorphism-button'}"
            onclick={() => (selectedMode = mode.value)}
          >
            <div
              class="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis {isSelected
                ? 'text-primary-700 dark:text-primary-200'
                : 'text-black dark:text-white'}"
            >
              {mode.label}
            </div>
          </button>
        {/each}
      </div>

      <!-- Color pickers -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            class="block text-xs text-gray-600 dark:text-gray-300 mb-2"
            style="margin-bottom: calc(0.5rem * var(--ui-scale, 1));"
          >
            {t('lighting.color', currentLanguage)}
          </label>
          <div class="flex items-center gap-3">
            <input
              type="color"
              value={localColor}
              oninput={(e) => (localColor = (e.target as HTMLInputElement).value)}
              class="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50"
            />
            <span
              class="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase"
            >
              {localColor}
            </span>
          </div>
        </div>
        <div>
          <label
            class="block text-xs text-gray-600 dark:text-gray-300 mb-2"
            style="margin-bottom: calc(0.5rem * var(--ui-scale, 1));"
          >
            {t('lighting.secondaryColor', currentLanguage)}
          </label>
          <div class="flex items-center gap-3">
            <input
              type="color"
              value={localSubColor}
              oninput={(e) => (localSubColor = (e.target as HTMLInputElement).value)}
              class="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50"
            />
            <span
              class="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase"
            >
              {localSubColor}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Animation Section -->
    <div
      class="border-b border-gray-200 dark:border-gray-700"
      style="padding: calc(1rem * var(--ui-scale, 1));"
    >
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.animation', currentLanguage) || 'Animation'}
      </h4>

      <!-- Speed slider -->
      <div class="mb-4">
        <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
          <span>{t('lighting.speed', currentLanguage)}</span>
          <span class="font-semibold">{localSpeed}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={localSpeed}
          oninput={(e) => (localSpeed = Number((e.target as HTMLInputElement).value))}
          class="rgb-panel-slider"
        />
      </div>

      <!-- Direction and Density -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Direction -->
        <div>
          <label
            class="block text-xs text-gray-600 dark:text-gray-300 mb-1.5"
          >
            {t('lighting.direction', currentLanguage)}
          </label>
          <DirectionSelector direction={localDirection} onDirectionChange={(d) => (localDirection = d)} />
        </div>

        <!-- Density -->
        <div>
          <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
            <span>{t('lighting.density', currentLanguage)}</span>
            <span class="font-semibold">{localDensity}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={localDensity}
            oninput={(e) => (localDensity = Number((e.target as HTMLInputElement).value))}
            class="rgb-panel-slider"
          />
        </div>
      </div>
    </div>

    <!-- Brightness Section -->
    <div style="padding: calc(1rem * var(--ui-scale, 1));">
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.brightness', currentLanguage)}
      </h4>

      <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
        <span>{t('lighting.level', currentLanguage) || 'Level'}</span>
        <span class="font-semibold">{localBrightness}</span>
      </div>
      <input
        type="range"
        min="0"
        max="255"
        value={localBrightness}
        oninput={(e) => (localBrightness = Number((e.target as HTMLInputElement).value))}
        class="rgb-panel-slider"
      />
    </div>
  </div>
</div>

<style>
  /* Color input styling */
  input[type='color'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
  }

  input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
    border: none;
    border-radius: inherit;
  }

  input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: inherit;
    padding: 0;
  }

  input[type='color']::-moz-color-swatch {
    border: none;
    border-radius: inherit;
  }

  /* Slider styling */
  .rgb-panel-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .rgb-panel-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .rgb-panel-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .rgb-panel-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .rgb-panel-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
