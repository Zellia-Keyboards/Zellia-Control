<script lang="ts">
  import KeycodePicker from '../shared/KeycodePicker.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);

  interface Props {
    selectedKeycodes: string[];
    selectedBindingIndex: number | null;
    selectedActions: number[];
  }

  let {
    selectedKeycodes = $bindable(),
    selectedBindingIndex = $bindable(),
    selectedActions = $bindable(),
  }: Props = $props();

  let selectedAction = $state(0);

  function onActionSelect(actionId: number): void {
    console.log(actionId)
    if (selectedBindingIndex !== null) {
      selectedKeycodes[selectedBindingIndex] = String(actionId);
      selectedActions[selectedBindingIndex] = actionId;
      selectedAction = actionId;
      // Keep the binding selected so user can see and modify their selection
    }
  }

  $effect(() => {
    if (selectedBindingIndex !== null) {
      const keycode = selectedKeycodes[selectedBindingIndex];
      if (keycode) {
        selectedAction = Number(keycode);
      }
    }
  });

  let description = $derived(
    selectedBindingIndex !== null
      ? t('advancedkey.selectKeycodeForBinding', currentLanguage).replace(
          '{0}',
          String(selectedBindingIndex + 1)
        )
      : t('advancedkey.clickOnBinding', currentLanguage)
  );
</script>

<div
  class="rounded-lg border p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 glassmorphism-card"
>
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {t('advancedkey.keycodeSelectionTitle', currentLanguage)}
    </h3>
    {#if selectedBindingIndex !== null}
      <button
        class="text-sm px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        onclick={() => (selectedBindingIndex = null)}
      >
        {t('advancedkey.done', currentLanguage) || 'Done'}
      </button>
    {/if}
  </div>

  <KeycodePicker
    {description}
    {selectedAction}
    {onActionSelect}
    defaultExpandedSection="Basic"
  />
</div>
