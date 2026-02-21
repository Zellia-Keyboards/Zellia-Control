<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ThemedSlider } from '$lib/components/ui';

  interface Props {
    bottomOutPoint: number;
    actuationPoint: number;
    uiBottomOutPoint: number;
    switchDistance: number;
    onBottomOutPointChange: (value: number) => void;
    onCommitBottomOutPoint: () => void;
  }

  let {
    bottomOutPoint,
    actuationPoint,
    uiBottomOutPoint,
    switchDistance,
    onBottomOutPointChange,
    onCommitBottomOutPoint,
  }: Props = $props();

  let currentLanguage = $derived($language);
</script>

{#if bottomOutPoint > 0}
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-2">
      <div>
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {t('advancedkey.bottomOutPoint', currentLanguage)}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('advancedkey.bottomOutPointDesc', currentLanguage)}
        </div>
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{uiBottomOutPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span
      >
    </div>
    <ThemedSlider
      min={actuationPoint + 0.1}
      max={switchDistance}
      step={0.1}
      bind:value={uiBottomOutPoint}
      onchange={onCommitBottomOutPoint}
    />
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>{(actuationPoint + 0.1).toFixed(1)}{t('units.mm', currentLanguage)}</span>
      <span>{switchDistance.toFixed(1)}{t('units.mm', currentLanguage)}</span>
    </div>
  </div>
{/if}

