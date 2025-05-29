<script lang="ts">
    import { darkMode } from "$lib/DarkModeStore.svelte";
    
    // Add actuation point state
    let actuationPoint = $state(1.5);
</script>

<div
    class="{$darkMode
        ? 'bg-black border-white'
        : 'bg-white border-gray-200'} rounded-lg border p-6"
>
    <h3
        class="text-lg font-medium {$darkMode
            ? 'text-white'
            : 'text-gray-900'} mb-4"
    >
        Performance Settings
    </h3>    <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
            <label
                for="actuation-point-slider"
                class="text-sm font-medium {$darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'}">Actuation Point</label
            >
            <span
                class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}"
                >{actuationPoint.toFixed(2)}mm</span
            >
        </div>
        
        <!-- Warning box for values below 0.3 -->
        {#if actuationPoint < 0.3}
            <div class="mb-2 p-2 {$darkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-300 text-yellow-700'} border rounded-md text-xs">
                ⚠️ The key might be too sensitive, so be careful
            </div>
        {/if}
        
        <!-- Dual input: Slider -->
        <input
            id="actuation-point-slider"
            type="range"
            min="0.01"
            max="3.5"
            step="0.01"
            bind:value={actuationPoint}
            class="w-full h-2 rounded-full {$darkMode
                ? 'bg-gray-700'
                : 'bg-gray-300'} appearance-none slider-thumb mb-2"
        />
        
        <!-- Dual input: Text input -->
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Direct input:</span>
            <input 
                type="number" 
                min="0.01" 
                max="3.5" 
                step="0.01" 
                bind:value={actuationPoint}
                class="w-20 px-2 py-1 text-xs border rounded {$darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}"
            />
            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">mm</span>
        </div>
        
        <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
            Set the distance at which the key press is registered
        </p>
    </div>

    <div
        class="flex items-start gap-3 p-4 {$darkMode
            ? 'bg-gray-900 border-gray-600'
            : 'bg-blue-50 border-blue-200'} border rounded-lg"
    >
        <svg
            class="w-5 h-5 {$darkMode
                ? 'text-gray-400'
                : 'text-blue-500'} mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <div>
            <p
                class="text-sm font-medium {$darkMode
                    ? 'text-white'
                    : 'text-blue-900'}"
            >
                Rapid Trigger Disabled
            </p>
            <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-blue-700'}">
                Rapid Trigger is automatically disabled when the key is bound to
                a DKS.
            </p>
        </div>
    </div>
</div>
