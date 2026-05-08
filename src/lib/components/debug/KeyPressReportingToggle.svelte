<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Radio } from 'lucide-svelte';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Switch } from '$lib/components/ui/switch';
  import { Separator } from '$lib/components/ui/separator';
  import { cn } from '$lib/utils.js';

  interface Props {
    keyPressReporting: boolean;
    onToggle: (value: boolean) => void;
  }

  let { keyPressReporting, onToggle }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card transition-all duration-300">
  <CardContent class="p-6">
    <div class="flex items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
          <Radio class="size-6 text-white" />
        </div>
        <div>
          <h3 class="text-lg font-bold">
            {t('debug.keyPressReporting', currentLanguage)}
          </h3>
          <p class="text-sm text-muted-foreground mt-0.5">
            {t('debug.keyPressReportingDesc', currentLanguage)}
          </p>
        </div>
      </div>

      <Switch
        checked={keyPressReporting}
        onCheckedChange={onToggle}
        class="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500 data-[state=checked]:to-orange-500"
      />
    </div>

    <Separator class="my-4" />

    <div class="flex items-center gap-2">
      <span class="relative flex size-2.5">
        {#if keyPressReporting}
          <span class="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75"></span>
        {/if}
        <span
          class={cn(
            'relative inline-flex rounded-full size-2.5',
            keyPressReporting ? 'bg-green-500' : 'bg-muted-foreground/50'
          )}
        ></span>
      </span>
      <span class={cn('text-sm font-medium', keyPressReporting ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
        {keyPressReporting ? 'Reporting enabled' : 'Reporting disabled'}
      </span>
    </div>
  </CardContent>
</Card>
