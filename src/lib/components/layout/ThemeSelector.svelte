<script lang="ts">
  import { Palette } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import {
    selectedThemeColor,
    themeColors,
    type ThemeColorName,
    glassmorphismMode,
  } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let showThemeSelector = $state(false);
  let currentTheme = $state<ThemeColorName | null>(null);
  let currentLanguage = $derived($language);

  selectedThemeColor.subscribe(value => {
    currentTheme = value;
  });

  function setTheme(colorName: ThemeColorName) {
    if (currentTheme === colorName) {
      selectedThemeColor.set(null);
    } else {
      selectedThemeColor.set(colorName);
    }
  }
</script>

<div class="p-3">
  <button
    class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$glassmorphismMode
      ? 'glassmorphism-button'
      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'}"
    onclick={() => (showThemeSelector = !showThemeSelector)}
  >
    <div class="flex items-center gap-3">
      <Palette class="w-4 h-4" />
      <span>{t('ui.themeColors', currentLanguage)}</span>
    </div>
    <svg
      class="w-4 h-4 transition-transform duration-200"
      class:rotate-180={showThemeSelector}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showThemeSelector}
    <div class="grid grid-cols-4 gap-2 mt-2" transition:slide={{ duration: 300, axis: 'y' }}>
      {#each Object.entries(themeColors) as [name, color] (name)}
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          title={name.charAt(0).toUpperCase() +
            name.slice(1) +
            (currentTheme === name ? ' (Click to deselect)' : '')}
          class="w-full h-7 rounded border transition-all duration-150
                             {currentTheme === name
            ? 'border-white dark:border-white ring-2 ring-gray-400 dark:ring-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'}"
          style="background-color: {color};"
          onclick={() => setTheme(name as ThemeColorName)}
        ></button>
      {/each}
    </div>
  {/if}
</div>
