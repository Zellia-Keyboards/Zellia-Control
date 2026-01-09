<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    holdDelay: number;
    tapTimeout: number;
  }

  let { holdDelay = $bindable(), tapTimeout = $bindable() }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="rounded-lg border p-4 sm:p-6 glassmorphism-card">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.tapAction', currentLanguage)} & {t('advancedkey.holdAction', currentLanguage)}
    {t('advancedkey.actionCategories', currentLanguage)}
  </h3>

  <div class="space-y-6">
    <!-- Hold Delay -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="hold-delay-slider" class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Hold Delay</label
        >
        <span class="text-sm text-gray-500 dark:text-gray-400">{holdDelay}ms</span>
      </div>
      <input
        id="hold-delay-slider"
        type="range"
        min="100"
        max="1000"
        step="50"
        bind:value={holdDelay}
        class="timing-slider"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Time before hold action triggers</p>
    </div>

    <!-- Tap Timeout -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="tap-timeout-slider" class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Tap Timeout</label
        >
        <span class="text-sm text-gray-500 dark:text-gray-400">{tapTimeout}ms</span>
      </div>
      <input
        id="tap-timeout-slider"
        type="range"
        min="50"
        max="500"
        step="25"
        bind:value={tapTimeout}
        class="timing-slider"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Maximum time for a tap to register
      </p>
    </div>
  </div>
</div>

<style>
  .timing-slider {
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    appearance: none;
    background: color-mix(in srgb, var(--theme-color-primary) 20%, transparent);
  }

  .timing-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .timing-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .timing-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--theme-color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .timing-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }
</style>
