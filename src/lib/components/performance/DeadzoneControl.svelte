<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    upperDeadzone: number;
    lowerDeadzone: number;
    maxTravelDistance: number;
    onUpperChange: (value: number) => void;
    onLowerChange: (value: number) => void;
  }

  let { upperDeadzone, lowerDeadzone, maxTravelDistance, onUpperChange, onLowerChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div
  class="border-t dark:border-white border-gray-200 pt-4 deadzone-container glassmorphism-card">
  <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-3">
    {t('performance.keyTravelDeadzones', currentLanguage)}
  </h4>
  <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
    {t('performance.keyTravelDeadzonesDesc', currentLanguage)}
  </p>

  <!-- Single bar with dual handles -->
  <div>
    <div class="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
      <div>Start: {upperDeadzone.toFixed(3)}mm</div>
      <div>Bottom: {lowerDeadzone.toFixed(3)}mm</div>
    </div>

    <!-- Dual-handle slider with visual feedback -->
    <div class="relative mb-4" style="height: 24px;">
      <!-- Background track with deadzone visualization -->
      <div
        class="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <!-- Deadzone before start (left side) -->
        <div
          class="absolute h-full rounded-l-full deadzone-pattern"
          style="left: 0%; width: {(upperDeadzone / maxTravelDistance) * 100}%;"
        ></div>

        <!-- Active range highlight -->
        <div
          class="absolute h-full"
          style="background: linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%); left: {(upperDeadzone /
            maxTravelDistance) *
            100}%; width: {((lowerDeadzone - upperDeadzone) / maxTravelDistance) * 100}%;"
        ></div>

        <!-- Deadzone after bottom (right side) -->
        <div
          class="absolute h-full rounded-r-full deadzone-pattern"
          style="left: {(lowerDeadzone / maxTravelDistance) * 100}%; width: {((maxTravelDistance - lowerDeadzone) / maxTravelDistance) * 100}%;"
        ></div>
      </div>

      <!-- Start deadzone slider (upper handle) -->
      <input
        type="range"
        min="0.005"
        max={maxTravelDistance}
        step="0.005"
        value={upperDeadzone}
        oninput={e => {
          const input = e.target as HTMLInputElement;
          let value = Math.round(Number(input.value) * 1000) / 1000;
          if (value > lowerDeadzone - 0.1) {
            value = lowerDeadzone - 0.1;
            input.value = String(value);
          }
          onUpperChange(value);
        }}
        class="absolute top-0 w-full h-full appearance-none bg-transparent deadzone-slider start-handle"
      />

      <!-- Bottom deadzone slider (lower handle) -->
      <input
        type="range"
        min="0.005"
        max={maxTravelDistance}
        step="0.005"
        value={lowerDeadzone}
        oninput={e => {
          const input = e.target as HTMLInputElement;
          let value = Math.round(Number(input.value) * 1000) / 1000;
          if (value < upperDeadzone + 0.1) {
            value = upperDeadzone + 0.1;
            input.value = String(value);
          }
          if (value > maxTravelDistance) {
            value = maxTravelDistance;
            input.value = String(value);
          }
          onLowerChange(value);
        }}
        class="absolute top-0 w-full h-full appearance-none bg-transparent deadzone-slider bottom-handle"
      />
    </div>

    <!-- Direct inputs -->
    <div class="flex justify-between items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">Start:</span>
        <input
          type="number"
          min="0.005"
          max={lowerDeadzone - 0.1}
          step="0.005"
          value={upperDeadzone}
          oninput={e => {
            let value = Number((e.target as HTMLInputElement).value);
            if (value < 0.005) value = 0.005;
            if (value > lowerDeadzone - 0.1) value = lowerDeadzone - 0.1;
            onUpperChange(value);
          }}
          class="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
        />
        <span class="text-sm text-gray-500 dark:text-gray-400">mm</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">Bottom:</span>
        <input
          type="number"
          min={upperDeadzone + 0.1}
          max={maxTravelDistance}
          step="0.005"
          value={lowerDeadzone}
          oninput={e => {
            let value = Number((e.target as HTMLInputElement).value);
            if (value < upperDeadzone + 0.1) value = upperDeadzone + 0.1;
            if (value > maxTravelDistance) value = maxTravelDistance;
            onLowerChange(value);
          }}
          class="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
        />
        <span class="text-sm text-gray-500 dark:text-gray-400">mm</span>
      </div>
    </div>
  </div>
</div>

<style>
  .deadzone-container {
    border-radius: 12px;
    padding: 16px;
    margin-top: 8px;
  }

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

  :global(.dark) .deadzone-pattern {
    opacity: 0.8;
  }

  .deadzone-slider {
    appearance: none;
    pointer-events: none;
  }

  .deadzone-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    border: 2px solid white;
  }

  .deadzone-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .start-handle {
    z-index: 3;
  }

  .start-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  }

  .start-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  }

  .bottom-handle {
    z-index: 2;
  }

  .bottom-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #4ecdc4 0%, #44b3ac 100%);
  }

  .bottom-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #4ecdc4 0%, #44b3ac 100%);
  }

  .deadzone-slider:hover {
    z-index: 10 !important;
  }

  .deadzone-slider:active {
    z-index: 11 !important;
  }
</style>
