<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { cn } from '$lib/utils.js';

  interface Props {
    currentKeyName: string;
    currentSelectedIndex: number;
    toggleState: boolean;
  }

  let { currentKeyName, currentSelectedIndex, toggleState }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="mb-6 glassmorphism-card">
  <CardContent class="p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="size-12 rounded-lg flex items-center justify-center border-2 border-primary-500 bg-primary-500/10 glassmorphism-button">
          <span class="font-mono font-bold">{currentKeyName}</span>
        </div>
        <div>
          <h3 class="font-medium">Selected Key</h3>
          <p class="text-sm text-muted-foreground">Key Index: {currentSelectedIndex}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">
          {t('advancedkey.toggleState', currentLanguage)}:
        </span>
        <div class="flex items-center gap-2">
          <div class={cn('size-2 rounded-full', toggleState ? 'bg-green-500' : 'bg-muted-foreground')}></div>
          <span class={cn('text-sm font-medium', toggleState ? 'text-green-600' : 'text-muted-foreground')}>
            {toggleState
              ? t('advancedkey.enabled', currentLanguage)
              : t('advancedkey.disabled', currentLanguage)}
          </span>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
