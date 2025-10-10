<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { RotateCcw, Download, Trash2, Info } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import SettingsCard from '$lib/components/settings/SettingsCard.svelte';

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
    // Implementation for restart
  }

  function handleBootloader() {
    // Implementation for bootloader
  }

  function handleFactoryReset() {
    // Implementation for factory reset
  }

  function handleResetConfig() {
    // Implementation for reset configuration
  }

  function handleRecoveryMode() {
    // Implementation for recovery mode
  }
</script>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-primary-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
        {t('settings.title', currentLanguage)}
      </h2>
      <p class="text-gray-600 dark:text-gray-300 mt-2">
        {t('settings.subtitle', currentLanguage)}
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    {#each settingsOptions as option}
      <SettingsCard {option} />
    {/each}
  </div>
</div>
