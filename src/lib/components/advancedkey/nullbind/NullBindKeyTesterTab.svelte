<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    localSelectedKeys: number[];
    getKeyLabel: (keyIndex: number) => string;
    behavior: number;
    bottomOutPoint: number;
    rtDown: number;
    getBehaviorName: (behaviorValue: number) => string;
  }

  let { localSelectedKeys, getKeyLabel, behavior, bottomOutPoint, rtDown, getBehaviorName }: Props =
    $props();

  let currentLanguage = $derived($language);
</script>

<div
  class="flex flex-col gap-4 rounded-md border glassmorphism-card p-4 shadow-sm"
>
  <div class="text-center">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {t('advancedkey.keyTesterTitle', currentLanguage)}
    </h3>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {t('advancedkey.keyTesterDesc', currentLanguage)}
    </p>

    <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <div
        class="p-6 border-2 border-primary-300 bg-primary-100 rounded-lg glassmorphism-card"
      >
        <div class="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-2">
          {getKeyLabel(localSelectedKeys[0])}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('advancedkey.key1', currentLanguage)}
        </div>
        {#if behavior === 1}
          <div class="text-xs mt-1 font-medium text-primary-500">
            {t('advancedkey.priorityKey', currentLanguage)}
          </div>
        {/if}
      </div>
      <div
        class="p-6 border-2 border-primary-300 bg-primary-100 rounded-lg glassmorphism-card"
      >
        <div class="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-2">
          {getKeyLabel(localSelectedKeys[1])}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('advancedkey.key2', currentLanguage)}
        </div>
        {#if behavior === 2}
          <div class="text-xs mt-1 font-medium text-primary-500">
            {t('advancedkey.priorityKey', currentLanguage)}
          </div>
        {/if}
      </div>
    </div>

    <div class="mt-6 p-4 glassmorphism-card rounded-lg">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        {t('advancedkey.currentBehavior', currentLanguage)}
        <span class="font-medium text-gray-900 dark:text-white">{getBehaviorName(behavior)}</span>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {t('advancedkey.bottomOut', currentLanguage)}
        <span class="font-medium text-gray-900 dark:text-white"
          >{bottomOutPoint > 0
            ? t('advancedkey.enabled', currentLanguage)
            : t('advancedkey.disabled', currentLanguage)}</span
        >
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {t('advancedkey.rapidTrigger', currentLanguage)}:
        <span class="font-medium text-gray-900 dark:text-white"
          >{rtDown > 0
            ? t('advancedkey.enabled', currentLanguage)
            : t('advancedkey.disabled', currentLanguage)}</span
        >
      </div>
    </div>
  </div>
</div>
