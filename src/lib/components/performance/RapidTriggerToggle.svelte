<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Toggle } from '$lib/components/ui';

  interface Props {
    rapidTriggerEnabled: boolean;
    onToggle: (value: boolean) => void;
  }

  let { rapidTriggerEnabled, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="flex items-center justify-between mb-3">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
    {t('performance.enableRapidTrigger', currentLanguage)}
  </h3>
  <Toggle
    checked={rapidTriggerEnabled}
    onToggle={val => onToggle(val)}
    ariaLabel="Rapid Trigger Toggle"
  />
</div>
<p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
  {t('performance.rapidTriggerDesc', currentLanguage)}
</p>
