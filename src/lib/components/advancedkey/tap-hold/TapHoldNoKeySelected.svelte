<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { MoveVertical } from 'lucide-svelte';
  import { Card, CardContent } from '$lib/components/ui/card';

  let currentLanguage = $derived($language);
</script>

<div class="flex-1 flex items-center justify-center">
  <div class="text-center max-w-md mx-auto">
    <div class="size-24 rounded-full flex items-center justify-center mx-auto mb-4 glassmorphism-card border">
      <MoveVertical class="size-12 text-primary-500" />
    </div>
    <h3 class="text-lg font-medium mb-2">
      {t('advancedkey.noKeySelected', currentLanguage)}
    </h3>
    <p class="text-muted-foreground mb-4">
      {t('advancedkey.selectKeyToConfig', currentLanguage)}
    </p>
    <Card class="glassmorphism-card">
      <CardContent class="p-4 text-sm">
        <strong>{t('advancedkey.tip', currentLanguage)}:</strong>
        {t('advancedkey.tapHoldTip', currentLanguage)}
      </CardContent>
    </Card>
  </div>
</div>
