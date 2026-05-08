<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Switch } from '$lib/components/ui/switch';

  interface Props {
    toggleState: boolean;
    onStateToggle: () => void;
  }

  let { toggleState, onStateToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card">
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.toggleState', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 glassmorphism-button">
      <div class="flex-1">
        <div class="font-medium">
          {t('advancedkey.toggleState', currentLanguage)}
        </div>
        <div class="text-sm text-muted-foreground">
          {t('advancedkey.toggleStateDesc', currentLanguage)}
        </div>
      </div>
      <Switch
        checked={toggleState}
        onCheckedChange={onStateToggle}
        class="data-[state=checked]:bg-primary-600"
      />
    </div>
  </CardContent>
</Card>
