<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    actuationPoint: number;
    deactivationPoint: number;
    keysSelected: number;
    onActuationChange: (value: number) => void;
    onDeactivationChange: (value: number) => void;
  }

  let {
    actuationPoint,
    deactivationPoint,
    keysSelected,
    onActuationChange,
    onDeactivationChange,
  }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="flex-1 min-w-[240px] flex flex-col h-full">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {t('performance.actuationPoint', currentLanguage)}
    </h3>
  </div>
  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
    {t('performance.actuationPointDesc', currentLanguage)}
  </p>
  <div class="mb-2 flex-1">
    <!-- Warning box for values below 0.3 -->
    {#if actuationPoint < 0.3}
      <div
        class="mb-3 p-2 bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200 border rounded-md text-sm flex items-center gap-2"
      >
        <AlertTriangle size={14} />
        {t('performance.sensitivityWarning', currentLanguage)}
      </div>
    {/if}

    <!-- Single bar with dual handles for actuation and deactivation -->
    <div>
      <div class="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
        <div>Deactivation: {deactivationPoint.toFixed(3)}mm</div>
        <div>Actuation: {actuationPoint.toFixed(3)}mm</div>
      </div>

      <!-- Dual-handle slider with visual feedback -->
      <div class="relative mb-4" style="height: 24px;">
        <!-- Background track with deadzone visualization -->
        <div
          class="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden"
        >
          <!-- Deadzone region before deactivation (left side) - RED -->
          <div
            class="absolute h-full rounded-l-full deadzone-pattern"
            style="left: 0%; width: {(deactivationPoint / 4) * 100}%;"
          ></div>

          <!-- Hysteresis zone (between deactivation and actuation) -->
          <div
            class="absolute h-full"
            style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); left: {(deactivationPoint /
              4) *
              100}%; width: {((actuationPoint - deactivationPoint) / 4) * 100}%;"
          ></div>

          <!-- Active region after actuation (right side) - GREEN -->
          <div
            class="absolute h-full rounded-r-full"
            style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); left: {(actuationPoint /
              4) *
              100}%; width: {((4 - actuationPoint) / 4) * 100}%;"
          ></div>
        </div>

        <!-- Deactivation point slider (lower handle) -->
        <input
          type="range"
          min="0.005"
          max="4.000"
          step="0.005"
          value={deactivationPoint}
          oninput={e => {
            const input = e.target as HTMLInputElement;
            let value = Number(input.value);
            if (value > actuationPoint - 0.1) {
              value = actuationPoint - 0.1;
              input.value = String(value);
            }
            onDeactivationChange(value);
          }}
          class="absolute top-0 w-full h-full appearance-none bg-transparent actuation-slider deactivation-handle"
        />

        <!-- Actuation point slider (upper handle) -->
        <input
          type="range"
          min="0.005"
          max="4.000"
          step="0.005"
          value={actuationPoint}
          oninput={e => {
            const input = e.target as HTMLInputElement;
            let value = Number(input.value);
            if (value < deactivationPoint + 0.1) {
              value = deactivationPoint + 0.1;
              input.value = String(value);
            }
            onActuationChange(value);
          }}
          class="absolute top-0 w-full h-full appearance-none bg-transparent actuation-slider actuation-handle"
        />
      </div>

      <!-- Direct inputs -->
      <div class="flex justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">Deactivation:</span>
          <input
            type="number"
            min="0.005"
            max={actuationPoint - 0.1}
            step="0.005"
            value={deactivationPoint}
            oninput={e => onDeactivationChange(Number((e.target as HTMLInputElement).value))}
            class="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
          />
          <span class="text-sm text-gray-500 dark:text-gray-400">mm</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">Actuation:</span>
          <input
            type="number"
            min={deactivationPoint + 0.1}
            max="4.000"
            step="0.005"
            value={actuationPoint}
            oninput={e => onActuationChange(Number((e.target as HTMLInputElement).value))}
            class="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
          />
          <span class="text-sm text-gray-500 dark:text-gray-400">mm</span>
        </div>
      </div>
    </div>
    <!-- Keys selected indicator -->
    <div class="mt-3 text-base text-gray-900 dark:text-white font-medium">
      {keysSelected}
      {t('performance.keysSelected', currentLanguage)}
    </div>
  </div>
</div>

<style>
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

  .actuation-slider {
    appearance: none;
    pointer-events: none;
  }

  .actuation-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    border: 2px solid white;
  }

  .actuation-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .deactivation-handle {
    z-index: 2;
  }

  .deactivation-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  }

  .deactivation-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  }

  .actuation-handle {
    z-index: 3;
  }

  .actuation-handle::-webkit-slider-thumb {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  .actuation-handle::-moz-range-thumb {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  .actuation-slider:hover {
    z-index: 10 !important;
  }

  .actuation-slider:active {
    z-index: 11 !important;
  }
</style>
