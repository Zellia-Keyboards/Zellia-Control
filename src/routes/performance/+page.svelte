<script lang="ts">
  let rapidTriggerEnabled = false;
  let continuousRapidTriggerEnabled = false;
  let actuationPoint = 2.0;
  let sensitivityValue = 0.5;
  let separateSensitivity = false;
  let pressSensitivity = 0.5;
  let releaseSensitivity = 0.5;
  let keysSelected = 0;
</script>

<div class="p-4 h-full flex flex-col">
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold">Performance</h2>
    <div>
      <button class="bg-blue-600 text-white px-4 py-2 rounded mr-2">Select all keys</button>
      <button class="bg-gray-200 text-gray-600 px-4 py-2 rounded">Discard selection</button>
    </div>
  </div>
  <div class="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 flex-1">
    <!-- 1st Box: Actuation Point -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <h3 class="text-lg font-medium mb-4">Actuation Point</h3>
      <p class="text-sm text-gray-600 mb-4">Set the actuation point for your keys.</p>
      <div class="mb-2 flex-1">
        <div class="relative">
          <div class="flex justify-between text-sm text-gray-500 mb-1">
            <div>ACTUATION POINT</div>
            <div>{actuationPoint.toFixed(2)} mm</div>
          </div>
          <input 
            type="range" 
            min="0" 
            max="4" 
            step="0.01" 
            bind:value={actuationPoint}
            class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb" 
          />
          <div class="flex justify-between text-sm text-gray-500 mb-1">
            <div>HIGH</div>
            <div>LOW</div>
          </div>
        </div>
        <!-- Keys selected indicator -->
        <div class="mt-4 text-blue-600 font-medium">
          {keysSelected} keys selected
        </div>
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 mx-2"></div>

    <!-- 2nd Box: Rapid Trigger Toggles (moved from 3rd position) -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">Enable Rapid Trigger</h3>
        <button class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Rapid Trigger Toggle"
          class:bg-blue-600={rapidTriggerEnabled} 
          class:bg-gray-300={!rapidTriggerEnabled}
          on:click={() => rapidTriggerEnabled = !rapidTriggerEnabled}>
          <span class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={rapidTriggerEnabled}
            class:translate-x-1={!rapidTriggerEnabled}></span>
        </button>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        Rapid Trigger dynamically actuates and resets your key based on your intention to press or release the key.
      </p>
      <div class="flex-1">
        {#if rapidTriggerEnabled}
          <div class="flex items-center justify-between mb-4 border-t border-gray-200 pt-4">
            <h4 class="text-sm text-gray-700">Enable Continuous Rapid Trigger</h4>
            <button class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
              aria-label="Continuous Rapid Trigger Toggle"
              class:bg-blue-600={continuousRapidTriggerEnabled} 
              class:bg-gray-300={!continuousRapidTriggerEnabled}
              on:click={() => continuousRapidTriggerEnabled = !continuousRapidTriggerEnabled}>
              <span class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
                class:translate-x-6={continuousRapidTriggerEnabled}
                class:translate-x-1={!continuousRapidTriggerEnabled}></span>
            </button>
          </div>
          <p class="text-sm text-gray-600">
            When enabled, Rapid Trigger ends when the entire key is released. When disabled, Rapid Trigger ends at the actuation point.
          </p>
        {/if}
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 mx-2"></div>

    <!-- 3rd Box: Sensitivity Slider & Toggle (moved from 2nd position) -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">Rapid Trigger Sensitivity</h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Separate Press/Release</span>
          <button
            class="relative inline-flex items-center h-5 rounded-full w-10 transition-colors focus:outline-none"
            aria-label="Separate Sensitivity Toggle"
            class:bg-blue-600={separateSensitivity}
            class:bg-gray-300={!separateSensitivity}
            on:click={() => separateSensitivity = !separateSensitivity}
          >
            <span class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
              class:translate-x-5={separateSensitivity}
              class:translate-x-1={!separateSensitivity}></span>
          </button>
        </div>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        Adjust the sensitivity for rapid trigger.
      </p>
      <div class="flex-1">
        {#if separateSensitivity}
          <div class="mb-4">
            <div class="flex justify-between text-sm text-gray-500 mb-1">
              <div>PRESS SENSITIVITY</div>
              <div>{pressSensitivity.toFixed(2)} mm</div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.01" 
              bind:value={pressSensitivity}
              class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
            />
            <div class="flex justify-between text-sm text-gray-500 mt-1">
              <div>HIGH</div>
              <div>LOW</div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm text-gray-500 mb-1">
              <div>RELEASE SENSITIVITY</div>
              <div>{releaseSensitivity.toFixed(2)} mm</div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.01" 
              bind:value={releaseSensitivity}
              class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
            />
            <div class="flex justify-between text-sm text-gray-500 mt-1">
              <div>HIGH</div>
              <div>LOW</div>
            </div>
          </div>
        {:else}
          <div>
            <div class="flex justify-between text-sm text-gray-500 mb-1">
              <div>SENSITIVITY</div>
              <div>{sensitivityValue.toFixed(2)} mm</div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.01" 
              bind:value={sensitivityValue}
              class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
            />
            <div class="flex justify-between text-sm text-gray-500 mt-1">
              <div>HIGH</div>
              <div>LOW</div>
            </div>
          </div>
        {/if}
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