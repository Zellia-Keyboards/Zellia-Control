<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Slider } from '$lib/components/ui/slider';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    holdDelay: number;
    tapTimeout: number;
  }

  let { holdDelay = $bindable(), tapTimeout = $bindable() }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card">
  <CardHeader>
    <CardTitle class="text-lg">
      {t('advancedkey.tapAction', currentLanguage)} & {t('advancedkey.holdAction', currentLanguage)}
      {t('advancedkey.actionCategories', currentLanguage)}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-6">
    <div>
      <div class="flex justify-between items-center mb-2">
        <Label for="hold-delay-slider" class="text-sm font-medium">Hold Delay</Label>
        <span class="text-sm text-muted-foreground">{holdDelay}ms</span>
      </div>
      <Slider
        id="hold-delay-slider"
        type="single"
        min={100}
        max={1000}
        step={50}
        bind:value={holdDelay}
      />
      <p class="text-xs text-muted-foreground mt-1">Time before hold action triggers</p>
    </div>

    <div>
      <div class="flex justify-between items-center mb-2">
        <Label for="tap-timeout-slider" class="text-sm font-medium">Tap Timeout</Label>
        <span class="text-sm text-muted-foreground">{tapTimeout}ms</span>
      </div>
      <Slider
        id="tap-timeout-slider"
        type="single"
        min={50}
        max={500}
        step={25}
        bind:value={tapTimeout}
      />
      <p class="text-xs text-muted-foreground mt-1">Maximum time for a tap to register</p>
    </div>
  </CardContent>
</Card>
