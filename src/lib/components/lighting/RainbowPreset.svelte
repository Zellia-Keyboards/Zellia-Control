<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import DirectionNumberControl from './DirectionNumberControl.svelte';
  import DensityControl from './DensityControl.svelte';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';

  interface Props {
    direction: number;
    density: number;
    onDirectionChange: (value: number) => void;
    onDensityChange: (value: number) => void;
    onApply: () => void;
  }

  let { direction, density, onDirectionChange, onDensityChange, onApply }: Props = $props();
  let currentLanguage = $derived($language);
  let isOpen = $state(false);

  function toggleOpen() {
    isOpen = !isOpen;
  }
</script>

<div class="rounded-lg border border-gray-300 dark:border-gray-600 glassmorphism-card">
  <button
    onclick={toggleOpen}
    class="w-full px-3 py-2 flex items-center justify-between text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
  >
    <span class="font-medium">{t('lighting.rainbowPreset', currentLanguage)}</span>
    <div class="flex items-center gap-2">
      {#if isOpen}
        <ChevronUp class="w-4 h-4" />
      {:else}
        <ChevronDown class="w-4 h-4" />
      {/if}
    </div>
  </button>

  {#if isOpen}
    <div class="px-3 pb-3 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <DirectionNumberControl
          {direction}
          onDirectionChange={onDirectionChange}
          label={t('lighting.rainbowDirection', currentLanguage)}
        />
        <DensityControl
          {density}
          onDensityChange={onDensityChange}
          label={t('lighting.rainbowDensity', currentLanguage)}
        />
      </div>
      <button
        onclick={onApply}
        class="w-full px-4 py-2 rounded-lg text-white font-medium transition-colors glassmorphism-button"
        style="background-color: var(--theme-color-primary);"
      >
        {t('lighting.apply', currentLanguage)}
      </button>
    </div>
  {/if}
</div>
