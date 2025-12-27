<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import * as ekc from 'emi-keyboard-controller';
  import tinycolor from 'tinycolor2';
  import DirectionSelector from './DirectionSelector.svelte';

  export type RGBModeType =
    | typeof ekc.RGBMode.RgbModeFixed
    | typeof ekc.RGBMode.RgbModeStatic
    | typeof ekc.RGBMode.RgbModeCycle
    | typeof ekc.RGBMode.RgbModeLinear
    | typeof ekc.RGBMode.RgbModeTrigger
    | typeof ekc.RGBMode.RgbModeString
    | typeof ekc.RGBMode.RgbModeFadingString
    | typeof ekc.RGBMode.RgbModeDiamondRipple
    | typeof ekc.RGBMode.RgbModeFadingDiamondRipple
    | typeof ekc.RGBMode.RgbModeJelly
    | typeof ekc.RGBMode.RgbModeBubble;

  interface Props {
    config: ekc.RGBConfig;
    onConfigChange: (config: ekc.RGBConfig) => void;
    keyboardKeys?: Array<{ x: number; y: number; width: number; height: number }>;
    rgbConfigs?: ekc.RGBConfig[];
    title?: string;
  }

  let { config, onConfigChange, keyboardKeys = [], rgbConfigs = [], title }: Props = $props();
  let currentLanguage = $derived($language);

  // Local state for deferred apply
  let localMode = $state(config.mode);
  let localColor = $state('');
  let localSpeed = $state(0);

  // Local state for rainbow preset (not part of base config)
  let showRainbowPreset = $state(false);
  let rainbowDirection = $state(0);
  let rainbowDensity = $state(10);

  // Convert RGB to hex
  function rgbToHex(rgb: { red: number; green: number; blue: number }): string {
    const toHex = (c: number) => ('0' + Math.floor(c).toString(16)).slice(-2);
    return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
  }

  // Initialize local state when config changes
  $effect(() => {
    localMode = config.mode;
    localColor = rgbToHex(config.rgb);
    localSpeed = Math.round(config.speed * 1000);
  });

  // Mode options
  const modes = $derived([
    { value: ekc.RGBMode.RgbModeFixed, label: t('rgb_mode_fixed', currentLanguage) },
    { value: ekc.RGBMode.RgbModeStatic, label: t('rgb_mode_static', currentLanguage) },
    { value: ekc.RGBMode.RgbModeCycle, label: t('rgb_mode_cycle', currentLanguage) },
    { value: ekc.RGBMode.RgbModeLinear, label: t('rgb_mode_linear', currentLanguage) },
    { value: ekc.RGBMode.RgbModeTrigger, label: t('rgb_mode_trigger', currentLanguage) },
    { value: ekc.RGBMode.RgbModeString, label: t('rgb_mode_string', currentLanguage) },
    { value: ekc.RGBMode.RgbModeFadingString, label: t('rgb_mode_fading_string', currentLanguage) },
    {
      value: ekc.RGBMode.RgbModeDiamondRipple,
      label: t('rgb_mode_diamond_ripple', currentLanguage),
    },
    {
      value: ekc.RGBMode.RgbModeFadingDiamondRipple,
      label: t('rgb_mode_fading_diamond_ripple', currentLanguage),
    },
    { value: ekc.RGBMode.RgbModeJelly, label: t('rgb_mode_jelly', currentLanguage) },
    { value: ekc.RGBMode.RgbModeBubble, label: t('rgb_mode_bubble', currentLanguage) },
  ]);

  // Apply all changes at once
  function applyChanges() {
    const newConfig = new ekc.RGBConfig();
    newConfig.mode = localMode;
    newConfig.speed = isNaN(localSpeed) ? 0 : Math.round(localSpeed) / 1000;

    const c = tinycolor(localColor).toRgb();
    newConfig.rgb.red = c.r;
    newConfig.rgb.green = c.g;
    newConfig.rgb.blue = c.b;

    onConfigChange(newConfig);
  }

  // Apply rainbow effect to all keys
  function applyRainbowEffect() {
    if (!keyboardKeys.length || !rgbConfigs.length) return;

    const referenceColor = tinycolor(localColor).toHsv();
    const directionC = (rainbowDirection / 360) * 2 * Math.PI;

    const newConfigs = rgbConfigs.map((rgbConfig, index) => {
      const key = keyboardKeys[index];
      if (!key) return rgbConfig;

      const newConfig = new ekc.RGBConfig();
      newConfig.mode = localMode;
      newConfig.speed = isNaN(localSpeed) ? 0 : Math.round(localSpeed) / 1000;

      const verticalDistance =
        (key.x + key.width / 2) * Math.cos(directionC) +
        (key.y + key.height / 2) * Math.sin(directionC);
      let h = (referenceColor.h + verticalDistance * rainbowDensity) % 360;
      if (h < 0) {
        h += 360;
      }

      const realColor = tinycolor({ ...referenceColor, h }).toRgb();
      newConfig.rgb.red = realColor.r;
      newConfig.rgb.green = realColor.g;
      newConfig.rgb.blue = realColor.b;

      return newConfig;
    });

    // Trigger parent callback with first config
    onConfigChange(newConfigs[0]);
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
      {title || t('lighting.subConfigTitle', currentLanguage)}
    </h3>
    <button
      onclick={applyChanges}
      class="px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors glassmorphism-button"
    >
      {t('lighting.apply', currentLanguage)}
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4" style="padding: calc(1rem * var(--ui-scale, 1));">
    <!-- Mode Section -->
    <div class="mb-4">
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.mode', currentLanguage)}
      </h4>
      <!-- Mode buttons in 2 rows -->
      <div class="grid grid-cols-6 gap-2">
        {#each modes as mode}
          <button
            class="h-12 rounded-lg border-2 text-center transition-all duration-200 px-2 flex items-center justify-center {localMode ===
            mode.value
              ? 'border-primary bg-primary/20 dark:bg-primary/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} glassmorphism-button"
            onclick={() => (localMode = mode.value)}
          >
            <div
              class="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis {localMode ===
              mode.value
                ? 'text-primary-700 dark:text-primary-200'
                : 'text-black dark:text-white'}"
            >
              {mode.label}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Color Section -->
    <div class="mb-4">
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.color', currentLanguage)}
      </h4>
      <div class="flex items-center gap-3">
        <input
          type="color"
          value={localColor}
          oninput={(e) => (localColor = (e.target as HTMLInputElement).value)}
          class="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden transition-colors hover:border-primary/50"
        />
        <span class="text-sm font-mono text-gray-700 dark:text-gray-300 uppercase">
          {localColor}
        </span>
      </div>
    </div>

    <!-- Speed Section -->
    <div class="mb-4">
      <h4
        class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
      >
        {t('lighting.speed', currentLanguage)}
      </h4>
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
        class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
      />
    </div>

    <!-- Rainbow Preset Collapsible Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onclick={() => (showRainbowPreset = !showRainbowPreset)}
        class="w-full flex items-center justify-between text-left mb-3"
      >
        <h4
          class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
        >
          {t('lighting.rainbowPreset', currentLanguage)}
        </h4>
        <span
          class="text-gray-500 dark:text-gray-400 transition-transform duration-200 {showRainbowPreset
            ? 'rotate-180'
            : ''}"
        >
          ▼
        </span>
      </button>

      {#if showRainbowPreset}
        <div class="space-y-4">
          <!-- Direction -->
          <div>
            <label
              class="block text-xs text-gray-600 dark:text-gray-300 mb-2"
            >
              {t('lighting.rainbowDirection', currentLanguage)}
            </label>
            <DirectionSelector direction={rainbowDirection} onDirectionChange={(d) => (rainbowDirection = d)} />
          </div>

          <!-- Density -->
          <div>
            <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
              <span>{t('lighting.rainbowDensity', currentLanguage)}</span>
              <span class="font-semibold">{rainbowDensity}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={rainbowDensity}
              oninput={(e) => (rainbowDensity = Number((e.target as HTMLInputElement).value))}
              class="w-full h-2 rounded-full bg-gray-300 dark:bg-gray-700 appearance-none slider-thumb"
            />
          </div>

          <!-- Apply Rainbow Button -->
          <button
            onclick={applyRainbowEffect}
            class="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('lighting.applySettings', currentLanguage)}
          </button>
        </div>
      {/if}
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
