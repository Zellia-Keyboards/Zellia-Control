<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    currentKeyName: string;
    currentSelectedIndex: number | null;
  }

  let { currentKeyName, currentSelectedIndex }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="rounded-lg border p-4 sm:p-6 mb-6 glassmorphism-card">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center border-2 glassmorphism-button"
        >
          <span class="font-mono font-bold text-gray-900 dark:text-white">{currentKeyName}</span>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">
            {t('advancedkey.selectedKey', currentLanguage)}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Key Index: {currentSelectedIndex}
          </p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-600 dark:text-gray-400"
        >{t('advancedkey.mode', currentLanguage)}:</span
      >
      <span class="px-3 py-1 rounded-full text-sm font-medium text-white glassmorphism-button">
        {t('advancedkey.tapHold', currentLanguage)}
      </span>
    </div>
  </div>
</div>
