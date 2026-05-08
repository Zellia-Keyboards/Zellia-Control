<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { MoveVertical } from 'lucide-svelte';
  import { Card, CardContent } from '$lib/components/ui/card';
</script>

<div class="flex-1 flex items-center justify-center">
  <div class="text-center max-w-md mx-auto">
    <div class="size-24 rounded-full flex items-center justify-center mx-auto mb-4 glassmorphism-card border">
      <MoveVertical class="size-12 text-primary-600" />
    </div>
    <h3 class="text-lg font-medium mb-2">
      {t('advancedkey.noKeySelected', $language)}
    </h3>
    <p class="text-muted-foreground mb-4">
      {t('advancedkey.selectKeyToConfig', $language)}
    </p>
    <Card class="glassmorphism-card border-primary-500/20 bg-primary-500/5">
      <CardContent class="p-4 text-sm">
        <strong>{t('advancedkey.tip', $language)}:</strong>
        {t('advancedkey.toggleTip', $language)}
      </CardContent>
    </Card>
  </div>
</div>
