<script lang="ts">
  import { language, t, tPlaceholder } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';

  interface Props {
    tapAction: string;
    holdAction: string;
    tapTimeout: number;
    holdDelay: number;
  }

  let { tapAction, holdAction, tapTimeout, holdDelay }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div
  class="border rounded-lg p-4 sm:p-6 glassmorphism-card">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
    {t('advancedkey.howItWorks', currentLanguage)}
  </h3>
  <div class="text-sm text-gray-800 dark:text-gray-300 space-y-2">
    <p>
      • {tPlaceholder('advancedkey.quickTap', currentLanguage, tapTimeout.toString())}:
      <strong>{keyActions.find(k => k.keycode === tapAction)?.name || tapAction}</strong>
    </p>
    <p>
      • {tPlaceholder('advancedkey.holdOver', currentLanguage, holdDelay.toString())}:
      <strong>{keyActions.find(k => k.keycode === holdAction)?.name || holdAction}</strong>
    </p>
    <p class="mt-3 text-xs">{t('advancedkey.tapHoldDescription', currentLanguage)}</p>
  </div>
</div>
