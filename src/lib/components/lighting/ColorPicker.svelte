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
  <input
    type="color"
    value={color}
    oninput={e => onColorChange((e.target as HTMLInputElement).value)}
    class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0 cursor-pointer overflow-hidden"
  />
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
