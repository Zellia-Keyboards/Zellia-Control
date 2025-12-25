<script lang="ts">
  import KeycodePicker from '../shared/KeycodePicker.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    selectedToggleAction: number;
    onActionSelect: (action: number) => void;
  }

  let { selectedToggleAction, onActionSelect }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<KeycodePicker
  title={t('advancedkey.toggleAction', currentLanguage)}
  selectedAction={selectedToggleAction}
  {onActionSelect}
  highlightColor="primary"
  defaultExpandedSection="Basic"
/>
