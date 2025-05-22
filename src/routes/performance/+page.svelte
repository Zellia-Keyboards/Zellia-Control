<script lang="ts">
  let rapidTriggerEnabled = false;
  let sensitivityValue = 0.5;
  let deadzoneValue = 0.2;
  let keysSelected = 0;
</script>

<div class="p-4">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-2xl font-bold">Rapid Trigger</h2>
    <div>
      <button class="bg-blue-600 text-white px-4 py-2 rounded mr-2">Select all keys</button>
      <button class="bg-gray-200 text-gray-600 px-4 py-2 rounded">Discard selection</button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <!-- Enable Rapid Trigger -->
    <div class="bg-white rounded-md shadow p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">Enable Rapid Trigger</h3>
        <button class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none" aria-label="Rapid Trigger Toggle"
          class:bg-blue-600={rapidTriggerEnabled} 
          class:bg-gray-300={!rapidTriggerEnabled}
          on:click={() => rapidTriggerEnabled = !rapidTriggerEnabled}>
          <span class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={rapidTriggerEnabled}
            class:translate-x-1={!rapidTriggerEnabled}></span>
        </button>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        rapid trigger text
      </p>
      
      <div class="mt-4">
        <div class="text-blue-600 font-medium">{keysSelected} keys selected</div>
      </div>
    </div>
    
    <!-- Rapid Trigger Sensitivity and Actuation Point -->
    <div class="bg-white rounded-md shadow p-4">
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium">Rapid Trigger Sensitivity</h3>
        </div>
        <div class="flex items-center mb-4">
          <span class="text-sm text-gray-600 mr-2">sensitivity text</span>
        </div>
        
        <div class="mb-2">
          <h4 class="text-sm text-gray-500 mb-2">SENSITIVITY</h4>
          <div class="relative">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              bind:value={sensitivityValue}
              class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb" 
            />
            <div class="flex justify-between mt-2 text-sm text-gray-600">
              <span>HIGH</span>
              <span>LOW</span>
            </div>
            <div class="text-right text-sm text-gray-500 mt-1">
              {(sensitivityValue * 2).toFixed(2)} mm
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actuation Point -->
      <div class="pt-4 border-t border-gray-200">
        <h3 class="text-lg font-medium mb-4">Actuation Point</h3>
        
        <p class="text-sm text-gray-600 mb-4">
          actuation point text
        </p>
        
        <div class="mb-2">
          <h4 class="text-sm text-gray-500 mb-2">ACTUATION POINT</h4>
          <div class="relative">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              bind:value={deadzoneValue}
              class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb" 
            />
            <div class="flex justify-between mt-2 text-sm text-gray-600">
              <span>LOW</span>
              <span>HIGH</span>
            </div>
            <div class="text-right text-sm text-gray-500 mt-1">
              {(deadzoneValue * 2).toFixed(2)} mm
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .slider-thumb {
    appearance: none;
  }
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2253be;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .slider-thumb::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2253be;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
</style>