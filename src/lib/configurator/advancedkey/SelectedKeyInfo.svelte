<script lang="ts">
  import { glassmorphismMode } from '$lib/hooks/DarkModeStore.svelte';
  import { language, t } from '$lib/hooks/LanguageStore.svelte';

  type Props = {
    currentKeyName: string;
    currentSelectedCoords: [number, number] | null;
  };
  let { currentKeyName, currentSelectedCoords }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="rounded-lg border p-6 mb-6 {glassmorphismMode ? 'glassmorphism-card' : ''}"
  style={glassmorphismMode
    ? ''
    : `background-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${'white dark:black'});
	       border-color: color-mix(in srgb, var(--theme-color-primary) 30%, ${'#e5e5e5 dark:white'});`}
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center border-2 {glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          style={glassmorphismMode
            ? 'border-color: var(--theme-color-primary);'
            : `background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${'white dark:black'});
					       border-color: var(--theme-color-primary);`}
        >
          <span class="font-mono font-bold text-gray-900 dark:text-white">{currentKeyName}</span>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">
            {t('advancedkey.selectedKey', currentLanguage)}
          </h3>
          {#if currentSelectedCoords}
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {t('advancedkey.position', currentLanguage)}: {currentSelectedCoords[0]}, {currentSelectedCoords[1]}
            </p>
          {/if}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-600 dark:text-gray-400"
        >{t('advancedkey.mode', currentLanguage)}:</span
      >
      <span
        class="px-3 py-1 rounded-full text-sm font-medium border bg-primary-200 dark:bg-black dark:text-white text-primary dark:border-white/40"
      >
        {t('advancedkey.dynamicKeystroke', currentLanguage)}
      </span>
    </div>
  </div>
</div>
