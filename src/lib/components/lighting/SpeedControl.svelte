<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ThemedSlider } from '$lib/components/ui';

  interface Props {
    speed: number;
    onSpeedChange: (value: number) => void;
  }

  let { speed, onSpeedChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    <span>{t('lighting.speed', currentLanguage)}</span>
    <span class="font-semibold">{speed}%</span>
  </div>
    <ThemedSlider
    min={1}
    max={100}
    value={speed}
    oninput={e => onSpeedChange(Number((e.target as HTMLInputElement).value))}
  />
</div>

