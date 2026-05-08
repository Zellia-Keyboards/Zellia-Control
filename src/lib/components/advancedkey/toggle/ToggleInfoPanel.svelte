<script lang="ts">
  import { language, t, tPlaceholder } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  interface Props {
    selectedToggleAction: string;
    toggleMode: string;
  }

  let { selectedToggleAction, toggleMode }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card border-primary-500/20 bg-primary-500/5">
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.howItWorks', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent class="text-sm text-muted-foreground">
    {@html tPlaceholder(
      'advancedkey.toggleDescription',
      currentLanguage,
      `<strong class="text-primary-600">${keyActions.find(k => k.keycode === selectedToggleAction)?.name || selectedToggleAction}</strong>`,
      toggleMode === 'press'
        ? t('advancedkey.whenPressed', currentLanguage)
        : t('advancedkey.whenReleased', currentLanguage)
    )}
  </CardContent>
</Card>
