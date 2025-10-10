<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

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
  <button
    class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none {rapidTriggerEnabled
      ? ''
      : 'bg-gray-300 dark:bg-gray-600'}"
    aria-label="Rapid Trigger Toggle"
    style="background: {rapidTriggerEnabled
      ? 'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)'
      : ''};"
    onclick={() => onToggle(!rapidTriggerEnabled)}
  >
    <span
      class="inline-block w-4 h-4 transform rounded-full transition-all shadow"
      class:translate-x-6={rapidTriggerEnabled}
      class:translate-x-1={!rapidTriggerEnabled}
      style="background: {rapidTriggerEnabled
        ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)'
        : '#ffffff'};"
    ></span>
  </button>
</div>
<p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
  {t('performance.rapidTriggerDesc', currentLanguage)}
</p>
