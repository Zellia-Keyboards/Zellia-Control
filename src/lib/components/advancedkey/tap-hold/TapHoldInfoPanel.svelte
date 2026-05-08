<script lang="ts">
  import { language, t, tPlaceholder } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  interface Props {
    tapAction: string;
    holdAction: string;
    tapTimeout: number;
    holdDelay: number;
  }

  let { tapAction, holdAction, tapTimeout, holdDelay }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card">
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.howItWorks', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent class="text-sm space-y-2">
    <p>
      • {tPlaceholder('advancedkey.quickTap', currentLanguage, tapTimeout.toString())}:
      <strong>{keyActions.find(k => k.keycode === tapAction)?.name || tapAction}</strong>
    </p>
    <p>
      • {tPlaceholder('advancedkey.holdOver', currentLanguage, holdDelay.toString())}:
      <strong>{keyActions.find(k => k.keycode === holdAction)?.name || holdAction}</strong>
    </p>
    <p class="mt-3 text-xs text-muted-foreground">
      {t('advancedkey.tapHoldDescription', currentLanguage)}
    </p>
  </CardContent>
</Card>
