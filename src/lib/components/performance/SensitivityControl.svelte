<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ThemedSlider, Toggle } from '$lib/components/ui';

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
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {t('performance.rapidTriggerSensitivity', currentLanguage)}
    </h3>
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 dark:text-gray-400">Separate Press/Release</span>
      <Toggle
        checked={separateSensitivity}
        onToggle={val => onToggleSeparate(val)}
        ariaLabel="Separate Sensitivity Toggle"
      />
    </div>
  </div>
  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
    {t('performance.adjustSensitivity', currentLanguage)}
  </p>
  <div class="flex-1">
    {#if separateSensitivity}
      <div class="mb-4">
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>↓ {t('performance.pressSensitivityLabel', currentLanguage)}</div>
          <div>{pressSensitivity.toFixed(2)} mm</div>
        </div>
        <ThemedSlider
          min={0.01}
          max={2}
          step={0.01}
          value={pressSensitivity}
          oninput={e => onPressChange(Number((e.target as HTMLInputElement).value))}
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>↑ {t('performance.releaseSensitivityLabel', currentLanguage)}</div>
          <div>{releaseSensitivity.toFixed(2)} mm</div>
        </div>
        <ThemedSlider
          min={0.01}
          max={2}
          step={0.01}
          value={releaseSensitivity}
          oninput={e => onReleaseChange(Number((e.target as HTMLInputElement).value))}
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
    {:else}
      <div>
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mb-1">
          <div>⇅ {t('performance.sensitivityLabel', currentLanguage)}</div>
          <div>{sensitivityValue.toFixed(2)} mm</div>
        </div>
        <ThemedSlider
          min={0.01}
          max={2}
          step={0.01}
          value={sensitivityValue}
          oninput={e => onSensitivityChange(Number((e.target as HTMLInputElement).value))}
        />
        <div class="flex justify-between text-sm dark:text-gray-400 text-gray-500 mt-1">
          <div>{t('performance.high', currentLanguage)}</div>
          <div>{t('performance.low', currentLanguage)}</div>
        </div>
      </div>
    {/if}
  </div>
</div>

