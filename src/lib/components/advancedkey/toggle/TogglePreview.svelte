<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { cn } from '$lib/utils.js';

  interface Props {
    currentKeyName: string;
    selectedToggleAction: string;
    toggleMode: string;
    toggleState: boolean;
  }

  let { currentKeyName, selectedToggleAction, toggleMode, toggleState }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<Card class="glassmorphism-card">
  <CardHeader>
    <CardTitle class="text-lg">Preview</CardTitle>
  </CardHeader>
  <CardContent class="space-y-0">
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">Key</span>
      <span class="font-mono font-medium">{currentKeyName}</span>
    </div>
    <Separator />
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">Action</span>
      <span class="font-medium text-primary-600">
        {keyActions.find(k => k.keycode === selectedToggleAction)?.name || selectedToggleAction}
      </span>
    </div>
    <Separator />
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">Trigger</span>
      <span class="font-medium">
        {toggleMode === 'press'
          ? t('advancedkey.onPress', currentLanguage)
          : t('advancedkey.onRelease', currentLanguage)}
      </span>
    </div>
    <Separator />
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">
        {t('advancedkey.toggleState', currentLanguage)}
      </span>
      <span class={cn('font-medium', toggleState ? 'text-green-600' : 'text-muted-foreground')}>
        {toggleState
          ? t('advancedkey.enabled', currentLanguage)
          : t('advancedkey.disabled', currentLanguage)}
      </span>
    </div>
  </CardContent>
</Card>
