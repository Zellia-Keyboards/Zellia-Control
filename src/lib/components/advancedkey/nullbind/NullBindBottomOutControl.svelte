<script lang="ts">
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
      class="bottom-out-toggle relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none {bottomOutPoint >
      0
        ? 'bg-primary-500'
        : 'bg-gray-300 dark:bg-gray-600'}"
      onclick={() => onBottomOutToggle(bottomOutPoint === 0)}
    >
      <span
        class="toggle-thumb inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm {bottomOutPoint >
        0
          ? 'translate-x-5'
          : 'translate-x-1'}"
      ></span>
    </button>
  </div>
</div>

<style>
  .bottom-out-toggle:active .toggle-thumb {
    transform: scale(0.95);
  }

  .bottom-out-toggle:active:not([class*='translate-x-5']) .toggle-thumb,
  .bottom-out-toggle:active:not([class*='translate-x-1']) .toggle-thumb {
    transform: scale(0.95) translateX(0.2rem);
  }
</style>
