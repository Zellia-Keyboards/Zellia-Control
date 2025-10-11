<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    localSelectedKeys: number[];
    getKeyLabel: (keyIndex: number) => string;
  }

  let { localSelectedKeys, getKeyLabel }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary-200 to-primary-100 border-primary-400 dark:from-primary-800 dark:to-primary-900 dark:border-primary-600 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="p-4">
    <div class="text-sm font-medium text-gray-900 dark:text-white mb-3">
      {t('advancedkey.selectedKeys', currentLanguage)}
    </div>
    <div class="flex items-center justify-center gap-3">
      <div
        class="px-3 py-2 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
      >
        {getKeyLabel(localSelectedKeys[0])}
      </div>
      <div class="flex items-center gap-1 text-primary-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>
      <div
        class="px-3 py-2 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
      >
        {getKeyLabel(localSelectedKeys[1])}
      </div>
    </div>
  </div>
</div>
