<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';

  interface Props {
    currentKeyName: string;
    selectedToggleAction: string;
    toggleMode: string;
    toggleState: boolean;
  }

  let { currentKeyName, selectedToggleAction, toggleMode, toggleState }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>

  <div class="space-y-3">
    <div
      class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Key</span>
      <span class="font-mono font-medium text-gray-900 dark:text-white"
        >{currentKeyName}</span
      >
    </div>
    <div
      class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Action</span>
      <span class="font-medium text-primary-600"
        >{keyActions.find(k => k.keycode === selectedToggleAction)?.name ||
          selectedToggleAction}</span
      >
    </div>
    <div
      class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600"
    >
      <span class="text-sm text-gray-600 dark:text-gray-400">Trigger</span>
      <span class="font-medium text-gray-900 dark:text-white"
        >{toggleMode === 'press'
          ? t('advancedkey.onPress', currentLanguage)
          : t('advancedkey.onRelease', currentLanguage)}</span
      >
    </div>
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-gray-600 dark:text-gray-400"
        >{t('advancedkey.toggleState', currentLanguage)}</span
      >
      <span
        class="font-medium {toggleState
          ? 'text-green-600'
          : 'text-gray-600 dark:text-gray-400'}"
      >
        {toggleState
          ? t('advancedkey.enabled', currentLanguage)
          : t('advancedkey.disabled', currentLanguage)}
      </span>
    </div>
  </div>
</div>