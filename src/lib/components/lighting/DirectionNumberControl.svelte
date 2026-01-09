<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    direction: number;
    onDirectionChange: (value: number) => void;
    min?: number;
    max?: number;
  }

  let { direction, onDirectionChange, min = 0, max = 360 }: Props = $props();
  let currentLanguage = $derived($language);

  function handleInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    onDirectionChange(isNaN(value) ? min : Math.min(max, Math.max(min, value)));
  }
</script>

<div>
  <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1.5"
    >{t('lighting.direction', currentLanguage)}</label
  >
  <input
    type="number"
    min={min}
    max={max}
    value={direction}
    oninput={handleInput}
    class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all glassmorphism-button"
  />
</div>
