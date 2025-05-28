<script lang="ts">
  import { darkMode } from '$lib/DarkModeStore.svelte';
  
  let keyPressReporting = false;
  
  function handleReset() {

  }
  
  function handleRebootRecovery() {

  }
</script>

<div class="p-4 h-full flex flex-col">
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">Debug</h2>
  </div>
  
  <div class="rounded-xl shadow p-6 space-y-8 flex-1 {$darkMode ? 'border' : ''}">
    <!-- Key Press Reporting -->
    <div class="p-5 {$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Reports whether key is pressed</h3>
        <button 
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Key Press Reporting Toggle"
          class:bg-blue-600={keyPressReporting} 
          class:bg-gray-300={!keyPressReporting}
          on:click={() => keyPressReporting = !keyPressReporting}>
          <span 
            class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={keyPressReporting}
            class:translate-x-1={!keyPressReporting}></span>
        </button>
      </div>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
        text
      </p>
    </div>
    
    <!-- Reset Configuration -->
    <div class="p-5 {$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border">
      <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">Reset</h3>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
        text
      </p>
      <button 
        type="button" 
        class="action-button red"
        on:click={handleReset}>
        Reset
      </button>
    </div>
    
    <!-- Recovery Mode -->
    <div class="p-5 {$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border">
      <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">Reboot to Recovery Mode</h3>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
        text
      </p>
      <button 
        type="button" 
        class="action-button purple"
        on:click={handleRebootRecovery}>
        Reboot to Recovery Mode
      </button>
    </div>
  </div>
</div>

<style>
  .action-button {
    display: inline-block;
    min-width: 120px;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    opacity: 0.9;
  }
  
  .action-button.red {
    background-color: #b91c1c;
  }
  
  .action-button.red:hover {
    background-color: #dc2626;
  }
  
  .action-button.purple {
    background-color: #7c3aed;
  }
  
  .action-button.purple:hover {
    background-color: #8b5cf6;
  }
</style>