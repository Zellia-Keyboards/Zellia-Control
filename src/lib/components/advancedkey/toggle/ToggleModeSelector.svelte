<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { cn } from '$lib/utils.js';

  interface Props {
    toggleMode: string;
    onModeSelect: (mode: string) => void;
  }

  let { toggleMode, onModeSelect }: Props = $props();
  let currentLanguage = $derived($language);

  const modes = [
    { id: 'press', labelKey: 'advancedkey.onPress' },
    { id: 'release', labelKey: 'advancedkey.onRelease' },
  ];
</script>

<Card class="glassmorphism-card">
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.toggleMode', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each modes as mode}
        {@const active = toggleMode === mode.id}
        <button
          class={cn(
            'p-4 rounded-lg border-2 text-left transition-all glassmorphism-button',
            active
              ? 'border-primary-600 bg-primary-500/10'
              : 'border-border hover:border-muted-foreground'
          )}
          onclick={() => onModeSelect(mode.id)}
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class={cn(
                'size-4 rounded-full border-2 flex items-center justify-center',
                active ? 'border-primary-600 bg-primary-600' : 'border-muted-foreground'
              )}
            >
              {#if active}
                <div class="size-2 bg-white rounded-full"></div>
              {/if}
            </div>
            <span class="font-medium">{t(mode.labelKey, currentLanguage)}</span>
          </div>
          <p class="text-sm text-muted-foreground">
            {t('advancedkey.toggleModeDesc', currentLanguage)}
          </p>
        </button>
      {/each}
    </div>
  </CardContent>
</Card>
