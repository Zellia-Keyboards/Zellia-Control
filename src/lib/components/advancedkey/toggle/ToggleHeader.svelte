<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';

  interface Props {
    onBack: () => void;
    onApply: () => void;
    onResetAll: () => void;
    canApply: boolean;
  }

  let { onBack, onApply, onResetAll, canApply }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="px-6 py-4 -mx-8 -mt-8 mb-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" onclick={onBack} class="gap-2">
        <ArrowLeft class="size-4" />
        {t('advancedkey.backToAdvanced', currentLanguage)}
      </Button>
      <div>
        <h1 class="text-xl font-semibold">
          {t('advancedkey.toggleTitle', currentLanguage)}
        </h1>
        <p class="text-sm text-muted-foreground">
          {t('advancedkey.toggleSubtitle', currentLanguage)}
        </p>
      </div>
    </div>
    <div class="flex gap-3">
      <Button
        variant="default"
        class="bg-primary-600 hover:bg-primary-700 text-white glassmorphism-button"
        onclick={onApply}
        disabled={!canApply}
      >
        {t('advancedkey.applyConfiguration', currentLanguage)}
      </Button>
      <Button variant="destructive" onclick={onResetAll} class="glassmorphism-button">
        {t('advancedkey.resetAllToggle', currentLanguage)}
      </Button>
    </div>
  </div>
</div>
<Separator class="-mx-8 mb-4" />
