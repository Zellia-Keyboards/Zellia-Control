<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ThemedSlider } from '$lib/components/ui';

  interface Props {
    density: number;
    onDensityChange: (value: number) => void;
    min?: number;
    max?: number;
    label?: string;
  }

  let { density, onDensityChange, min = 0, max = 255, label }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    <span>{label || t('lighting.density', currentLanguage)}</span>
    <span class="font-semibold">{density}</span>
  </div>
  <ThemedSlider
    min={min}
    max={max}
    value={density}
    oninput={e => onDensityChange(Number((e.target as HTMLInputElement).value))}
  />
</div>

