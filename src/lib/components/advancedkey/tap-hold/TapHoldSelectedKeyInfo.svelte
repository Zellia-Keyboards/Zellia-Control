<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  interface Props {
    currentKeyName: string;
    currentSelectedIndex: number | null;
  }

  let { currentKeyName, currentSelectedIndex }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="mb-6 glassmorphism-card">
  <CardContent class="p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="size-12 rounded-lg flex items-center justify-center border-2 glassmorphism-button">
          <span class="font-mono font-bold">{currentKeyName}</span>
        </div>
        <div>
          <h3 class="font-medium">
            {t('advancedkey.selectedKey', currentLanguage)}
          </h3>
          <p class="text-sm text-muted-foreground">Key Index: {currentSelectedIndex}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">
          {t('advancedkey.mode', currentLanguage)}:
        </span>
        <Badge class="bg-primary-500 hover:bg-primary-500 text-white">
          {t('advancedkey.tapHold', currentLanguage)}
        </Badge>
      </div>
    </div>
  </CardContent>
</Card>
