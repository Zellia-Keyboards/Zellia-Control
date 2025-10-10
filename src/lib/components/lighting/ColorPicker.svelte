<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    color: string;
    onColorChange: (value: string) => void;
  }

  let { color, onColorChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <div class="text-xs text-gray-600 dark:text-gray-300 mb-1.5">
    {t('lighting.color', currentLanguage)}
  </div>
  <div class="flex gap-2">
    <input
      type="color"
      value={color}
      oninput={(e) => onColorChange((e.target as HTMLInputElement).value)}
      class="w-10 h-9 rounded border-0 p-0 cursor-pointer overflow-hidden"
    />
    <input
      type="text"
      value={color}
      oninput={(e) => onColorChange((e.target as HTMLInputElement).value)}
      class="flex-1 px-2 py-1.5 border border-gray-300 dark:border-white bg-white dark:bg-black text-black dark:text-white rounded-lg font-mono text-xs"
      placeholder="#ff0000"
    />
  </div>
</div>

<style>
  /* Color input styling to fill containers */
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
</style>
