<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    rapidTriggerEnabled: boolean;
    onToggle: (value: boolean) => void;
  }

  let { rapidTriggerEnabled, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="flex items-center justify-between mb-3">
  <Label for="rapid-trigger" class="text-lg font-medium cursor-pointer">
    {t('performance.enableRapidTrigger', currentLanguage)}
  </Label>
  <Switch
    id="rapid-trigger"
    checked={rapidTriggerEnabled}
    onCheckedChange={onToggle}
    class="data-[state=checked]:bg-primary-500"
  />
</div>
<p class="text-sm text-muted-foreground mb-3">
  {t('performance.rapidTriggerDesc', currentLanguage)}
</p>
