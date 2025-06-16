<script lang="ts">
    import { darkMode } from "$lib/DarkModeStore.svelte";
    import { language, t } from '$lib/LanguageStore.svelte';
    import { AlertTriangle } from 'lucide-svelte';
    
    let currentLanguage = $state($language);
    
    // Subscribe to language changes
    language.subscribe(value => {
        currentLanguage = value;
    });

    // Add actuation point state
    let actuationPoint = $state(1.5);
</script>

<div
    class="rounded-lg border p-6"
    style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'});
           border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};"
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
          <!-- Warning box for values below 0.3 -->        {#if actuationPoint < 0.3}
            <div class="mb-2 p-2 border rounded-md text-xs flex items-center gap-2"
                 style="background-color: {$darkMode ? 'color-mix(in srgb, #f59e0b 15%, #451a03)' : 'color-mix(in srgb, #f59e0b 10%, #fefce8)'};
                        border-color: {$darkMode ? 'color-mix(in srgb, #f59e0b 30%, #78716c)' : 'color-mix(in srgb, #f59e0b 25%, #e7e5e4)'};
                        color: {$darkMode ? '#fbbf24' : '#a16207'};">
                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                <span>the key may be too sensitive, causing instability, please be careful</span>
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
            class="w-full h-2 rounded-full appearance-none slider-thumb mb-2"
            style="background-color: {$darkMode ? '#374151' : '#d1d5db'};
                   --thumb-color: var(--theme-color-primary);"
        />
        
        <!-- Dual input: Text input -->
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('performance.directInput', currentLanguage)}:</span>            <input 
                type="number" 
                min="0.01" 
                max="3.5" 
                step="0.01" 
                bind:value={actuationPoint}
                class="w-20 px-2 py-1 text-xs border rounded"
                style="background-color: {$darkMode ? '#1f2937' : 'white'};
                       border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #d1d5db)'};
                       color: {$darkMode ? 'white' : '#111827'};"
            />
            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">mm</span>
        </div>
        
        <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
            Set the distance at which the key press is registered
        </p>
    </div>    <div
        class="flex items-start gap-3 p-4 border rounded-lg"
        style="background-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #111827)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f0f9ff)'};
               border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #bfdbfe)'};"
    >        <svg
            class="w-5 h-5 mt-0.5"
            style="color: var(--theme-color-primary);"
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
        <div>            <p
                class="text-sm font-medium"
                style="color: {$darkMode ? 'white' : 'color-mix(in srgb, var(--theme-color-primary) 85%, black)'};"
            >
                Rapid Trigger Disabled
            </p>
            <p class="text-sm"
               style="color: {$darkMode ? '#d1d5db' : 'color-mix(in srgb, var(--theme-color-primary) 75%, black)'};">
                Rapid Trigger is automatically disabled when the key is bound to
                a DKS.
            </p>
        </div>
    </div>
</div>
