<script lang="ts">
  function handleRestart() {
  }
  
  function handleBootloader() {
  }
  
  function handleFactoryReset() {
  }
</script>

<div class="p-4 h-full flex flex-col">
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold">Settings</h2>
  </div>
  
  <div class="bg-white rounded-xl shadow p-6 space-y-8 flex-1">
    <!-- Restart Device -->
    <div class="p-5 bg-white rounded-lg border border-gray-200">
      <h3 class="text-lg font-medium mb-2">Restart Device</h3>
      <p class="text-sm text-gray-600 mb-4">
        restart device text
      </p>
      <button 
        type="button" 
        class="action-button"
        on:click={handleRestart}>
        Restart Device
      </button>
    </div>
    
    <!-- Enter Bootloader -->
    <div class="p-5 bg-white rounded-lg border border-gray-200">
      <h3 class="text-lg font-medium mb-2">Enter Bootloader</h3>
      <p class="text-sm text-gray-600 mb-4">
        enter bootloader text
      </p>
      <button 
        type="button" 
        class="action-button"
        on:click={handleBootloader}>
        Enter Bootloader
      </button>
    </div>
    
    <!-- Factory Reset -->
    <div class="p-5 bg-white rounded-lg border border-gray-200">
      <h3 class="text-lg font-medium mb-2">Factory Reset</h3>
      <p class="text-sm text-gray-600 mb-4">
        factory reset text
      </p>
      <button 
        type="button" 
        class="action-button red"
        on:click={handleFactoryReset}>
        Factory Reset
      </button>
    </div>
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
  
  .action-button.red {
    background-color: #b91c1c;
  }
  
  .action-button.red:hover {
    background-color: #dc2626;
  }
</style>