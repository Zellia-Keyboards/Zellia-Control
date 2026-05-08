<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    separateSensitivity: boolean;
    sensitivityValue: number;
    pressSensitivity: number;
    releaseSensitivity: number;
    onToggleSeparate: (value: boolean) => void;
    onSensitivityChange: (value: number) => void;
    onPressChange: (value: number) => void;
    onReleaseChange: (value: number) => void;
  }

  let {
    separateSensitivity,
    sensitivityValue,
    pressSensitivity,
    releaseSensitivity,
    onToggleSeparate,
    onSensitivityChange,
    onPressChange,
    onReleaseChange,
  }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="flex-1 min-w-[260px] flex flex-col">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-lg font-medium">
      {t('performance.rapidTriggerSensitivity', currentLanguage)}
    </h3>
    <div class="flex items-center gap-2">
      <Label for="separate-sens" class="text-xs text-muted-foreground cursor-pointer">
        Separate Press/Release
      </Label>
      <Switch
        id="separate-sens"
        checked={separateSensitivity}
        onCheckedChange={onToggleSeparate}
        class="data-[state=checked]:bg-primary-500"
      />
    </div>
  </div>
  <p class="text-sm text-muted-foreground mb-3">
    {t('performance.adjustSensitivity', currentLanguage)}
  </p>

  <div class="flex-1 space-y-4">
    {#if separateSensitivity}
      <div>
        <div class="flex justify-between text-sm text-muted-foreground mb-2">
          <span>↓ {t('performance.pressSensitivityLabel', currentLanguage)}</span>
          <span>{pressSensitivity.toFixed(2)} mm</span>
        </div>
        <Slider
          type="single"
          min={0.01}
          max={2}
          step={0.01}
          value={pressSensitivity}
          onValueChange={v => onPressChange(v)}
        />
        <div class="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{t('performance.high', currentLanguage)}</span>
          <span>{t('performance.low', currentLanguage)}</span>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm text-muted-foreground mb-2">
          <span>↑ {t('performance.releaseSensitivityLabel', currentLanguage)}</span>
          <span>{releaseSensitivity.toFixed(2)} mm</span>
        </div>
        <Slider
          type="single"
          min={0.01}
          max={2}
          step={0.01}
          value={releaseSensitivity}
          onValueChange={v => onReleaseChange(v)}
        />
        <div class="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{t('performance.high', currentLanguage)}</span>
          <span>{t('performance.low', currentLanguage)}</span>
        </div>
      </div>
    {:else}
      <div>
        <div class="flex justify-between text-sm text-muted-foreground mb-2">
          <span>⇅ {t('performance.sensitivityLabel', currentLanguage)}</span>
          <span>{sensitivityValue.toFixed(2)} mm</span>
        </div>
        <Slider
          type="single"
          min={0.01}
          max={2}
          step={0.01}
          value={sensitivityValue}
          onValueChange={v => onSensitivityChange(v)}
        />
        <div class="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{t('performance.high', currentLanguage)}</span>
          <span>{t('performance.low', currentLanguage)}</span>
        </div>
      </div>
    {/if}
  </div>
</div>
