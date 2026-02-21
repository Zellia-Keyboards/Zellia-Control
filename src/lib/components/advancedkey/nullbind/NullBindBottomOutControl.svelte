<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Toggle } from '$lib/components/ui';

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
    <Toggle
      checked={bottomOutPoint > 0}
      onToggle={() => onBottomOutToggle(bottomOutPoint === 0)}
      size="sm"
    />
  </div>
</div>
