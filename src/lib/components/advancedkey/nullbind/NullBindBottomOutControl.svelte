<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    bottomOutPoint: number;
    onBottomOutToggle: (enabled: boolean) => void;
  }

  let { bottomOutPoint, onBottomOutToggle }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div class="flex flex-col">
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <div class="text-sm font-medium text-gray-900 dark:text-white">
        {t('advancedkey.alternativeBottomOutBehavior', currentLanguage)}
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        {t('advancedkey.alternativeBottomOutBehaviorDesc', currentLanguage)}
      </div>
    </div>
    <button
      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {bottomOutPoint >
      0
        ? 'bg-primary-500'
        : 'bg-gray-300 dark:bg-gray-600'} {$glassmorphismMode ? 'glassmorphism-button' : ''}"
      onclick={() => onBottomOutToggle(bottomOutPoint === 0)}
    >
      <span
        class="inline-block h-3 w-3 transform rounded-full {bottomOutPoint > 0
          ? 'bg-white dark:bg-black'
          : 'bg-white'} transition-transform shadow-sm {bottomOutPoint > 0
          ? 'translate-x-5'
          : 'translate-x-1'}"
      ></span>
    </button>
  </div>
</div>
