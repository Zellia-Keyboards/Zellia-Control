<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t, tPlaceholder } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';

  interface Props {
    selectedToggleAction: string;
    toggleMode: string;
  }

  let { selectedToggleAction, toggleMode }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-primary-50 dark:bg-primary-900 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
    {t('advancedkey.howItWorks', currentLanguage)}
  </h3>
  <p class="text-sm text-gray-600 dark:text-gray-400">
    {@html tPlaceholder(
      'advancedkey.toggleDescription',
      currentLanguage,
      `<strong class="text-primary-600">${keyActions.find(k => k.keycode === selectedToggleAction)?.name || selectedToggleAction}</strong>`,
      toggleMode === 'press'
        ? t('advancedkey.whenPressed', currentLanguage)
        : t('advancedkey.whenReleased', currentLanguage)
    )}
  </p>
</div>