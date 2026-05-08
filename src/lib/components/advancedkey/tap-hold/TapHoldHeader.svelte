<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';

  interface Props {
    currentSelectedIndex: number | null;
    onBack: () => void;
    onApply: () => void;
    onResetAll: () => void;
  }

  let { currentSelectedIndex, onBack, onApply, onResetAll }: Props = $props();
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
          {t('advancedkey.tapHoldTitle', currentLanguage)}
        </h1>
        <p class="text-sm text-muted-foreground">
          {t('advancedkey.tapHoldSubtitle', currentLanguage)}
        </p>
      </div>
    </div>
    <div class="flex gap-3">
      <Button
        variant="default"
        class="bg-primary-500 hover:bg-primary-600 text-white glassmorphism-button"
        onclick={onApply}
        disabled={currentSelectedIndex === null}
      >
        {t('advancedkey.applyConfiguration', currentLanguage)}
      </Button>
      <Button variant="destructive" onclick={onResetAll} class="glassmorphism-button">
        {t('advancedkey.resetAllTapHold', currentLanguage)}
      </Button>
    </div>
  </div>
</div>
<Separator class="-mx-8 mb-4" />
