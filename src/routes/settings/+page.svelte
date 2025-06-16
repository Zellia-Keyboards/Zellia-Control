<script lang="ts">
  import { darkMode } from '$lib/DarkModeStore.svelte';
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
        'settings.restartFeature4'
      ]
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
        'settings.bootloaderFeature4'
      ]
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
        'settings.factoryResetFeature4'
      ]
    }
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
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
>
  {#snippet body(x, y)}
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{t('settings.title', currentLanguage)}</h2>
      <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">{t('settings.subtitle', currentLanguage)}</p>
    </div>
  </div>



  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    {#each settingsOptions as option}
      <div class="group relative w-full">
        <button
          class="w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col"
          style="background-color: {$darkMode ? 'black' : 'white'}; 
                 border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};
                 --hover-border: {option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'};"
          onmouseover={(e) => (e.currentTarget as HTMLElement).style.borderColor = option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'}
          onmouseout={(e) => (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'}
          onclick={() => option.action()}
        >
          <!-- Option Header -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center justify-center w-10 h-10">
              <svelte:component this={option.icon} class="w-8 h-8" style="color: {option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'};" />
            </div>            <div class="flex-1">
              <h3 class="text-xl font-bold transition-colors"
                  style="color: {$darkMode ? 'white' : '#111827'};"
                  onmouseover={(e) => (e.currentTarget as HTMLElement).style.color = option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'}
                  onmouseout={(e) => (e.currentTarget as HTMLElement).style.color = $darkMode ? 'white' : '#111827'}>
                {t(option.nameKey, currentLanguage)}
              </h3>
              <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1">{t(option.descriptionKey, currentLanguage)}</p>
            </div>
          </div>

          <div class="space-y-2 flex-1">
            {#each option.featureKeys as featureKey}
              <div class="flex items-center gap-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                <div class="w-1.5 h-1.5 rounded-full" style="background-color: {option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'};"></div>
                <span>{t(featureKey, currentLanguage)}</span>
              </div>
            {/each}
          </div><!-- Action Arrow -->
          <div class="absolute top-6 right-6 text-gray-400 transition-colors"
              style="transition: color 0.3s ease;"
              onmouseover={(e) => {(e.currentTarget as HTMLElement).style.color = option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'}}
              onmouseout={(e) => {(e.currentTarget as HTMLElement).style.color = '#9ca3af'}}> 
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    {/each}
  </div>

  <!-- Info Section -->
  <div class="mt-4 text-center {$darkMode ? 'text-gray-300' : 'text-gray-600'}">    <p class="text-sm">
      {t('calibration.deviceSettingsDesc', currentLanguage)}
    </p>
  </div>
</div>

<style>
  .action-button {
    display: inline-block;
    min-width: 120px;
    background-color: #000;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    background-color: #333;
  }
  
  .action-button.dark {
    background-color: white;
    color: black;
    border: 1px solid white;
  }
  
  .action-button.dark:hover {
    background-color: #f3f4f6;
  }
  
  .action-button.red {
    background-color: #b91c1c;
  }
  
  .action-button.red:hover {
    background-color: #dc2626;
  }
  
  .action-button.red.dark {
    background-color: #dc2626;
    color: white;
    border: 1px solid #dc2626;
  }
  
  .action-button.red.dark:hover {
    background-color: #b91c1c;
  }
</style>