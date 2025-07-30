<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import { RotateCcw, Download, Trash2, Info } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  // Settings options - these will be translated in the template
  const settingsOptions = [
    {
      id: 'restart',
      nameKey: 'settings.restart',
      descriptionKey: 'settings.restartDesc',
      icon: RotateCcw,
      action: handleRestart,
      type: 'primary',
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
      type: 'secondary',
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
      type: 'danger',
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
</script>

<NewZellia80He
  currentSelectedKey={null}
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
>
  {#snippet body(x, y)}
    <div
      class="hover:scale-90 transition-all duration-300 h-14 bg-gray-50 dark:bg-black border border-gray-400 dark:border-gray-700 data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
    ></div>{/snippet}
</NewZellia80He>
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
      {@const IconComponent = option.icon}
      <div class="group relative w-full">
        <button
          class="bg-white dark:bg-black w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col {$glassmorphismMode
            ? 'glassmorphism-card'
            : ''} {option.type === 'danger'
            ? 'hover:border-red-600 focus:border-red-600'
            : 'hover:border-primary-500 focus:border-primary-500 dark:hover:border-primary-400 dark:focus:border-primary-400'} border-gray-300 dark:border-gray-600"
          onclick={() => option.action()}
        >
          <!-- Option Header -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center justify-center w-10 h-10">
              <IconComponent
                class="w-8 h-8 {option.type === 'danger'
                  ? 'text-red-600'
                  : 'text-primary-500 dark:text-primary-400'}"
              />
            </div>
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-gray-800 dark:text-white transition-colors {option.type ===
                'danger'
                  ? 'group-hover:text-red-600'
                  : 'group-hover:text-primary-500 dark:group-hover:text-primary-400'}"
              >
                {t(option.nameKey, currentLanguage)}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {t(option.descriptionKey, currentLanguage)}
              </p>
            </div>
          </div>

          <div class="space-y-2 flex-1">
            {#each option.featureKeys as featureKey}
              <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div
                  class="w-1.5 h-1.5 rounded-full {option.type === 'danger'
                    ? 'bg-red-600'
                    : 'bg-primary-500 dark:bg-black'}"
                ></div>
                <span>{t(featureKey, currentLanguage)}</span>
              </div>
            {/each}
          </div>
          <!-- Action Arrow -->
          <div
            class="absolute top-6 right-6 text-gray-400 transition-colors pointer-events-none {option.type ===
            'danger'
              ? 'group-hover:text-red-600'
              : 'group-hover:text-primary-500 dark:group-hover:text-primary-400'}"
            role="presentation"
            aria-hidden="true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      </div>
    {/each}
  </div>

  <!-- Info Section -->
  <div class="mt-4 text-center text-gray-600 dark:text-gray-300">
    <p class="text-sm">
      {t('calibration.deviceSettingsDesc', currentLanguage)}
    </p>
  </div>
</div>
