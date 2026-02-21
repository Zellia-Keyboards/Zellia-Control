<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ThemedSlider } from '$lib/components/ui';

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
      <ThemedSlider
        min={100}
        max={1000}
        step={50}
        bind:value={holdDelay}
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
      <ThemedSlider
        min={50}
        max={500}
        step={25}
        bind:value={tapTimeout}
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Maximum time for a tap to register
      </p>
    </div>
  </div>
</div>

