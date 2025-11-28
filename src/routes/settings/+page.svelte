<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { RotateCcw, Download, Trash2 } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
  import { KeyboardController } from 'emi-keyboard-controller';

  let currentLanguage = $derived($language);

  // Settings options - these will be translated in the template
  const settingsOptions = [
    {
      id: 'restart',
      nameKey: 'settings.restart',
      descriptionKey: 'settings.restartDesc',
      icon: RotateCcw,
      action: handleRestart,
      type: 'primary' as const,
      featureKeys: [
        'settings.restartFeature1',
        'settings.restartFeature2',
        'settings.restartFeature3',
        'settings.restartFeature4',
      ],
    },
    {
      id: 'bootloader',
      nameKey: 'settings.bootloader',
      descriptionKey: 'settings.bootloaderDesc',
      icon: Download,
      action: handleBootloader,
      type: 'secondary' as const,
      featureKeys: [
        'settings.bootloaderFeature1',
        'settings.bootloaderFeature2',
        'settings.bootloaderFeature3',
        'settings.bootloaderFeature4',
      ],
    },
    {
      id: 'factory-reset',
      nameKey: 'settings.factoryReset',
      descriptionKey: 'settings.factoryResetDesc',
      icon: Trash2,
      action: handleFactoryReset,
      type: 'danger' as const,
      featureKeys: [
        'settings.factoryResetFeature1',
        'settings.factoryResetFeature2',
        'settings.factoryResetFeature3',
        'settings.factoryResetFeature4',
      ],
    },
  ];

  function handleRestart() {
    keyboardConnectionState.controller?.system_reset();
  }

  function handleBootloader() {
    keyboardConnectionState.controller?.enter_bootloader();
  }

  function handleFactoryReset() {
    keyboardConnectionState.controller?.factory_reset();
  }
</script>

<div
  class="rounded-2xl shadow mt-2 mb-4 grow bg-primary-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
  style="padding: calc(2rem * var(--ui-scale, 1));"
>
  <!-- Header -->
  <div class="flex items-center justify-between" style="margin-bottom: calc(1.5rem * var(--ui-scale, 1));">
    <div>
      <h2 class="font-bold text-gray-900 dark:text-white" style="font-size: calc(1.875rem * var(--ui-scale, 1));">
        {t('settings.title', currentLanguage)}
      </h2>
      <p class="text-gray-600 dark:text-gray-300" style="margin-top: calc(0.5rem * var(--ui-scale, 1));">
        {t('settings.subtitle', currentLanguage)}
      </p>
    </div>
  </div>

  <!-- Device Actions -->
  <div class="grid grid-cols-1 md:grid-cols-3 flex-1" style="gap: calc(1.5rem * var(--ui-scale, 1));">
    {#each settingsOptions as option}
      <SettingsCard {option} />
    {/each}
  </div>
</div>
