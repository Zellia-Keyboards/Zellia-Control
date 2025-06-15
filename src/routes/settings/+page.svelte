<script lang="ts">
  import { darkMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import { RotateCcw, Download, Trash2, Info } from 'lucide-svelte';
  
  // Settings options
  const settingsOptions = [
    {
      id: 'restart',
      name: 'Restart Device',
      description: 'Restart your keyboard to apply changes',
      icon: RotateCcw,
      action: handleRestart,
      type: 'primary',
      features: [
        'Applies pending configurations',
        'Refreshes device connection',
        'Quick restart process',
        'No data loss'
      ]
    },
    {
      id: 'bootloader',
      name: 'Enter Bootloader',
      description: 'Enter bootloader mode for firmware updates',
      icon: Download,
      action: handleBootloader,
      type: 'secondary',
      features: [
        'Firmware update mode',
        'Advanced configuration access',
        'Recovery capabilities',
        'Expert users only'
      ]
    },
    {
      id: 'factory-reset',
      name: 'Factory Reset',
      description: 'Reset all settings to factory defaults',
      icon: Trash2,
      action: handleFactoryReset,
      type: 'danger',
      features: [
        'Restores default settings',
        'Clears all configurations',
        'Cannot be undone',
        'Fresh start guarantee'
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
>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">Settings</h2>
      <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">Configure device settings and manage your keyboard</p>
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
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold transition-colors"
                  style="color: {$darkMode ? 'white' : '#111827'};"
                  onmouseover={(e) => (e.currentTarget as HTMLElement).style.color = option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'}
                  onmouseout={(e) => (e.currentTarget as HTMLElement).style.color = $darkMode ? 'white' : '#111827'}>
                {option.name}
              </h3>
              <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1">{option.description}</p>
            </div>
          </div>

          <div class="space-y-2 flex-1">
            {#each option.features as feature}
              <div class="flex items-center gap-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                <div class="w-1.5 h-1.5 rounded-full" style="background-color: {option.type === 'danger' ? '#dc2626' : 'var(--theme-color-primary)'};"></div>
                <span>{feature}</span>
              </div>
            {/each}
          </div>          <!-- Action Arrow -->
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
  <div class="mt-4 text-center {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
    <p class="text-sm">
      Device settings allow you to manage your keyboard's operational state.
      Choose actions carefully, especially factory reset which cannot be undone.
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