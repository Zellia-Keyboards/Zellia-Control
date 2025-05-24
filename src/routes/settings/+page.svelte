<script lang="ts">
  function handleRestart() {
    console.log("Restart Device clicked");
  }
  
  function handleBootloader() {
    console.log("Enter Bootloader clicked");
  }
  
  function handleFactoryReset() {
    console.log("Factory Reset clicked");
  }
</script>

<div class="p-4 bg-white rounded-lg shadow">
  
  <!-- Restart Device -->
  <div class="mb-12">
    <h4 class="font-bold">Restart Device</h4>
    <p class="text-gray-600 mb-3">restart device text</p>
    <button 
      type="button" 
      class="action-button"
      on:click={handleRestart}>
      Restart Device
    </button>
  </div>
    
  <!-- Enter Bootloader -->
  <div class="mb-12">
    <h4 class="font-bold">Enter Bootloader</h4>
    <p class="text-gray-600 mb-3">enter bootloader text</p>
    <button 
      type="button" 
      class="action-button"
      on:click={handleBootloader}>
      Enter Bootloader
    </button>
  </div>
    
  <!-- Factory Reset -->
  <div class="mb-auto">
    <h4 class="font-bold">Factory Reset</h4>
    <p class="text-gray-600 mb-3">factory reset text</p>
    <button 
      type="button" 
      class="action-button red"
      on:click={handleFactoryReset}>
      Factory Reset
    </button>
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
