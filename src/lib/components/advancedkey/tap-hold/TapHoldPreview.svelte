<script lang="ts">
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  interface Props {
    currentKeyName: string;
    tapAction: string;
    holdAction: string;
    holdDelay: number;
  }

  let { currentKeyName, tapAction, holdAction, holdDelay }: Props = $props();
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
      <span class="text-sm text-muted-foreground">Tap</span>
      <span class="font-medium text-primary-500">
        {keyActions.find(k => String(k.keycode) === tapAction)?.name || tapAction}
      </span>
    </div>
    <Separator />
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">Hold</span>
      <span class="font-medium text-green-500">
        {keyActions.find(k => String(k.keycode) === holdAction)?.name || holdAction}
      </span>
    </div>
    <Separator />
    <div class="flex justify-between items-center py-2">
      <span class="text-sm text-muted-foreground">Delay</span>
      <span class="font-medium">{holdDelay}ms</span>
    </div>
  </CardContent>
</Card>
