<script lang="ts">
    import { goto } from '$app/navigation';
    import { CurrentSelected, KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { AlertTriangle } from 'lucide-svelte';
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions
    } from "$lib/AdvancedKeyShared";
    import NewZellia80He from '$lib/NewZellia80HE.svelte';

    // Define the null bind specific configuration type
    type NullBindConfiguration = {
        type: 'null-bind';
        behavior: number; // 0 = last input, 1 = absolute priority key1, 2 = absolute priority key2, 3 = neutral, 4 = distance
        bottomOutPoint: number; // 0 = disabled, > 0 = enabled
        actuationPoint: number;
        pairedKeys: [string, string]; // Exactly 2 keys required
        rtDown: number; // rapid trigger down sensitivity
        rtUp: number; // rapid trigger up sensitivity
        continuous: boolean;
    };

    // Constants
    const DEFAULT_ACTUATION = 1.5;
    const DEFAULT_BOTTOM_OUT_POINT = 4.0;
    const DEFAULT_RT_DOWN = 0.1;
    const SWITCH_DISTANCE = 4.0;

    // NULL_BIND_BEHAVIOR_METADATA with all 5 modes
    const NULL_BIND_BEHAVIOR_METADATA = [
        {
            behavior: 0,
            name: 'Last Input',
            description: 'The most recently pressed key takes priority over the previously held key'
        },
        {
            behavior: 1,
            name: 'Absolute Priority Key1',
            description: 'First selected key always has absolute priority over the second key'
        },
        {
            behavior: 2,
            name: 'Absolute Priority Key2', 
            description: 'Second selected key always has absolute priority over the first key'
        },
        {
            behavior: 3,
            name: 'Neutral',
            description: 'Both opposing inputs are canceled when pressed simultaneously'
        },
        {
            behavior: 4,
            name: 'Distance (Rappy Snappy)',
            description: 'Priority based on key travel distance - deeper pressed key wins'
        }
    ];

    // State variables
    let behavior = $state(0); // Default to last input
    let bottomOutPoint = $state(0); // Default to disabled
    let actuationPoint = $state(DEFAULT_ACTUATION);
    let selectedKeys = $state<string[]>([]);
    let activeTab = $state<'performance' | 'key-tester'>('performance');
    let rtDown = $state(0); // Rapid trigger down
    let rtUp = $state(0); // Rapid trigger up
    let continuous = $state(false);

    // UI state variables for real-time updates
    let uiBottomOutPoint = $state(DEFAULT_BOTTOM_OUT_POINT);
    let uiActuationPoint = $state(DEFAULT_ACTUATION);

    function goBack(): void {
        goto('/advancedkey');
    }

    // Automatically add selected key without needing to press a button
    $effect(() => {
        if ($CurrentSelected && selectedKeys.length < 2) {
            const keyName = $KeyboardDisplayValues[$CurrentSelected[1]]?.[$CurrentSelected[0]] || 'Unknown';
            
            if (!selectedKeys.includes(keyName)) {
                selectedKeys = [...selectedKeys, keyName];
            }
        }
    });

    function removeKey(index: number): void {
        selectedKeys = selectedKeys.filter((_, i) => i !== index);
    }

    function resetSelection(): void {
        selectedKeys = [];
    }

    function updateBottomOut(checked: boolean): void {
        bottomOutPoint = checked ? DEFAULT_BOTTOM_OUT_POINT : 0;
        if (checked) {
            uiBottomOutPoint = DEFAULT_BOTTOM_OUT_POINT;
        }
    }

    function updateRapidTrigger(checked: boolean): void {
        if (checked) {
            rtDown = DEFAULT_RT_DOWN;
            rtUp = 0;
            continuous = false;
        } else {
            rtDown = 0;
            rtUp = 0;
            continuous = false;
        }
    }

    function commitBottomOutPoint(): void {
        bottomOutPoint = uiBottomOutPoint;
    }

    function commitActuationPoint(): void {
        actuationPoint = uiActuationPoint;
    }

    function updateConfiguration(): void {
        if (selectedKeys.length !== 2) return;
        
        // Apply configuration to both keys
        selectedKeys.forEach((keyName) => {
            // Find the key position for this key name
            let keyPosition: [number, number] | null = null;
            
            for (let row = 0; row < $KeyboardDisplayValues.length; row++) {
                for (let col = 0; col < $KeyboardDisplayValues[row].length; col++) {
                    if ($KeyboardDisplayValues[row][col] === keyName) {
                        keyPosition = [col, row];
                        break;
                    }
                }
                if (keyPosition) break;
            }
            
            if (keyPosition) {
                const keyId = `${keyPosition[0]},${keyPosition[1]}`;
                const config: NullBindConfiguration = {
                    type: 'null-bind',
                    behavior: behavior,
                    bottomOutPoint: bottomOutPoint,
                    actuationPoint: actuationPoint,
                    pairedKeys: [selectedKeys[0], selectedKeys[1]] as [string, string],
                    rtDown: rtDown,
                    rtUp: rtUp,
                    continuous: continuous
                };
                updateGlobalConfiguration(keyId, config);
            }
        });
    }

    function applyConfiguration(): void {
        updateConfiguration();
        console.log('Applying null bind configurations:', $globalConfigurations);
    }

    // Get configured null bind keys count
    const configuredNullBindKeys = $derived(
        Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'null-bind')
    );

    // Check if we have exactly 2 keys selected
    const canConfigure = $derived(selectedKeys.length === 2);

    // Helper function to get behavior name
    function getBehaviorName(behaviorValue: number): string {
        const metadata = NULL_BIND_BEHAVIOR_METADATA.find(m => m.behavior === behaviorValue);
        return metadata ? metadata.name : 'Unknown';
    }

    // Reactive updates for UI sliders
    $effect(() => {
        if (bottomOutPoint > 0) {
            uiBottomOutPoint = bottomOutPoint;
        }
    });

    $effect(() => {
        uiActuationPoint = actuationPoint;
    });
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
  class="rounded-2xl shadow p-4 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>     <!-- Header -->
    <div class="border-b px-6 py-4" style="background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 20%, ${$darkMode ? 'white' : '#e5e5e5'});">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button 
                    class="flex items-center gap-2 {$darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors"
                    onclick={goBack}
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <div>
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">Null Bind Configuration</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Configure rapid trigger with SOCD cleaning for competitive gaming</p>
                </div>
            </div>            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style="background-color: var(--theme-color-primary); 
                           {!canConfigure ? '' : 'hover:background-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);'}"
                    onclick={applyConfiguration}
                    disabled={!canConfigure}
                >
                    Apply
                </button>
            </div>
        </div>
    </div>    <!-- Key Selection Section -->    {#if !canConfigure}
        <div class="p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});" >
            <div class="max-w-4xl mx-auto">
                <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}  mb-3">Select Two Keys</h3>
                <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
                    Click on two opposing keys in the keyboard layout to configure null bind behavior. Keys will be added automatically.
                </p>
                  <!-- Selected Keys Display -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="p-4 border-2 border-dashed rounded-lg"
                         style="{selectedKeys.length >= 1 
                             ? 'border-color: #10b981; background-color: #ecfdf5;' 
                             : `border-color: color-mix(in srgb, var(--theme-color-primary) 60%, ${$darkMode ? 'white' : '#e5e5e5'}); 
                                background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'});`
                         }">
                        <div class="text-center">
                            {#if selectedKeys.length >= 1}
                                <div class="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span class="font-mono font-bold">{selectedKeys[0]}</span>
                                </div>
                                <div class="text-sm font-medium text-green-700">First Key</div>
                                <button 
                                    class="mt-2 text-xs text-red-600 hover:text-red-700"
                                    onclick={() => removeKey(0)}
                                >
                                    Remove
                                </button>
                            {:else}
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse"
                                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 40%, {$darkMode ? 'black' : 'white'});">
                                    <span style="color: var(--theme-color-primary);">?</span>
                                </div>
                                <div class="text-sm" style="color: var(--theme-color-primary);">Click a key to select</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="p-4 border-2 border-dashed rounded-lg"
                         style="{selectedKeys.length >= 2 
                             ? 'border-color: #10b981; background-color: #ecfdf5;' 
                             : selectedKeys.length === 1 
                             ? 'border-color: #f59e0b; background-color: #fffbeb;' 
                             : `border-color: ${$darkMode ? '#4b5563' : '#d1d5db'}; 
                                background-color: ${$darkMode ? '#1f2937' : '#f9fafb'};`
                         }">
                        <div class="text-center">
                            {#if selectedKeys.length >= 2}
                                <div class="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span class="font-mono font-bold">{selectedKeys[1]}</span>
                                </div>
                                <div class="text-sm font-medium text-green-700">Second Key</div>
                                <button 
                                    class="mt-2 text-xs text-red-600 hover:text-red-700"
                                    onclick={() => removeKey(1)}
                                >
                                    Remove
                                </button>
                            {:else if selectedKeys.length === 1}
                                <div class="w-12 h-12 bg-orange-300 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse">
                                    <span class="text-orange-700">?</span>
                                </div>
                                <div class="text-sm text-orange-700">Click opposing key</div>
                            {:else}
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2"
                                     style="background-color: {$darkMode ? '#4b5563' : '#d1d5db'};">
                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">?</span>
                                </div>
                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Second Key</div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    {#if selectedKeys.length > 0}
                        <button 
                            class="px-4 py-2 {$darkMode ? 'text-white bg-gray-800 hover:bg-gray-700 border border-white' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors text-sm font-medium"
                            onclick={resetSelection}
                        >
                            Reset Selection
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Main Configuration (only show when 2 keys are selected) -->
    {#if canConfigure}
        <div class="flex-1 p-6">
            <div class="max-w-7xl mx-auto">
                <div class="flex w-full gap-8">
                    <!-- Left Panel - Configuration -->
                    <div class="flex w-72 flex-col gap-4">                        <!-- Selected Keys Info -->
                        <div class="p-4 border rounded-lg"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 40%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">Selected Keys</div>
                            <div class="flex items-center gap-2 text-sm" style="color: var(--theme-color-primary);">
                                <span class="font-mono font-bold">{selectedKeys[0]}</span>
                                <span>↔</span>
                                <span class="font-mono font-bold">{selectedKeys[1]}</span>
                            </div>
                        </div>

                        <!-- Configure Null Bind Behavior -->
                        <div class="flex flex-col">
                            <p class="text-sm font-semibold leading-none tracking-tight {$darkMode ? 'text-white' : 'text-gray-900'}">
                                Configure Null Bind Behavior
                            </p>
                            <p class="mt-1 text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
                                Select how to resolve the key events when both keys are pressed.
                            </p>
                            
                            <div class="mt-3 grid gap-1">                                {#each NULL_BIND_BEHAVIOR_METADATA as behaviorMetadata}
                                    <button
                                        class="relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors"
                                        style="{behavior === behaviorMetadata.behavior
                                            ? `background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'}); 
                                               color: var(--theme-color-primary); 
                                               border: 1px solid color-mix(in srgb, var(--theme-color-primary) 40%, ${$darkMode ? 'white' : '#e5e5e5'});`
                                            : `color: ${$darkMode ? 'white' : '#374151'};`
                                        }"                                        onmouseover={(e) => {
                                            if (behavior !== behaviorMetadata.behavior) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#1f2937' : '#f3f4f6';
                                            }
                                        }}
                                        onmouseleave={(e) => {
                                            if (behavior !== behaviorMetadata.behavior) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        onclick={() => behavior = behaviorMetadata.behavior}
                                    >
                                        <span class="absolute left-2 flex size-3.5 items-center justify-center">
                                            <div class="size-3 rounded-full border-2 border-current flex items-center justify-center">
                                                {#if behavior === behaviorMetadata.behavior}
                                                    <div class="size-1.5 rounded-full bg-current"></div>
                                                {/if}
                                            </div>
                                        </span>
                                        {behaviorMetadata.name}
                                        <span class="inline-flex flex-1 justify-end">
                                            <div class="group relative">
                                                <svg class="size-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div class="absolute bottom-full right-0 mb-2 w-56 p-2 {$darkMode ? 'bg-black text-white border border-white' : 'bg-gray-900 text-white'} text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    {behaviorMetadata.description}
                                                </div>
                                            </div>
                                        </span>
                                    </button>
                                {/each}
                            </div>
                        </div>                        <!-- Alternative Bottom Out -->
                        <div class="flex flex-col">
                            <div class="flex items-center justify-between">
                                <div class="flex-1">
                                    <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Alternative Bottom Out Behavior</div>
                                    <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">When both keys are bottomed out, register key press for both keys.</div>
                                </div>                                <button
                                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                                    style="background-color: {bottomOutPoint > 0 ? 'var(--theme-color-primary)' : ($darkMode ? '#4b5563' : '#d1d5db')}; 
                                           focus:ring-color: var(--theme-color-primary);"
                                    onclick={() => updateBottomOut(bottomOutPoint === 0)}
                                >
                                    <span class="inline-block h-3 w-3 transform rounded-full {bottomOutPoint > 0 ? ($darkMode ? 'bg-black' : 'bg-white') : 'bg-white'} transition-transform shadow-sm {bottomOutPoint > 0 ? 'translate-x-5' : 'translate-x-1'}"></span>
                                </button>
                            </div>
                        </div>

                        <!-- Bottom Out Point Slider -->
                        {#if bottomOutPoint > 0}
                            <div class="flex flex-col">
                                <div class="flex justify-between items-center mb-2">
                                    <div>
                                        <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Bottom Out Point</div>
                                        <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Set the distance at which the key is bottomed out.</div>
                                    </div>
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{uiBottomOutPoint.toFixed(1)}mm</span>
                                </div>
                                <input 
                                    type="range" 
                                    min={actuationPoint + 0.1}
                                    max={SWITCH_DISTANCE}
                                    step="0.1" 
                                    bind:value={uiBottomOutPoint}
                                    onchange={commitBottomOutPoint}
                                    class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-600' : 'bg-gray-300'} appearance-none slider-thumb"
                                />
                                <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
                                    <span>{(actuationPoint + 0.1).toFixed(1)}mm</span>
                                    <span>{SWITCH_DISTANCE.toFixed(1)}mm</span>
                                </div>
                            </div>
                        {/if}
                    </div>                    <!-- Right Panel - Tabs -->
                    <div class="flex flex-1 flex-col">
                        <!-- Tab Navigation -->
                        <div class="{$darkMode ? 'border-white' : 'border-gray-200'} border-b">                            <nav class="-mb-px flex space-x-8">                                <button
                                    class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                                    style="{activeTab === 'performance'
                                        ? `border-color: var(--theme-color-primary); color: var(--theme-color-primary);`
                                        : `border-color: transparent; color: ${$darkMode ? '#9ca3af' : '#6b7280'};`
                                    }"
                                    onmouseover={(e) => {
                                        if (activeTab !== 'performance') {
                                            (e.currentTarget as HTMLElement).style.color = $darkMode ? '#e5e7eb' : '#374151';
                                            (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? '#6b7280' : '#d1d5db';
                                        }
                                    }}
                                    onmouseleave={(e) => {
                                        if (activeTab !== 'performance') {
                                            (e.currentTarget as HTMLElement).style.color = $darkMode ? '#9ca3af' : '#6b7280';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                        }
                                    }}
                                    onclick={() => activeTab = 'performance'}
                                >
                                    Performance
                                </button>                                <button
                                    class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                                    style="{activeTab === 'key-tester'
                                        ? `border-color: var(--theme-color-primary); color: var(--theme-color-primary);`
                                        : `border-color: transparent; color: ${$darkMode ? '#9ca3af' : '#6b7280'};`
                                    }"
                                    onmouseover={(e) => {
                                        if (activeTab !== 'key-tester') {
                                            (e.currentTarget as HTMLElement).style.color = $darkMode ? '#e5e7eb' : '#374151';
                                            (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? '#6b7280' : '#d1d5db';
                                        }
                                    }}                                    
                                    onmouseleave={(e) => {
                                        if (activeTab !== 'key-tester') {
                                            (e.currentTarget as HTMLElement).style.color = $darkMode ? '#9ca3af' : '#6b7280';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                        }
                                    }}                                    onclick={() => activeTab = 'key-tester'}
                                >
                                    Key Tester
                                </button>
                            </nav>
                        </div>

                        <!-- Tab Content -->
                        <div class="flex-1 mt-6">
                            {#if activeTab === 'performance'}
                                <div class="flex flex-col gap-4 rounded-md border {$darkMode ? 'border-white bg-black' : 'border-gray-200 bg-white'} p-4 shadow-sm">
                                    <!-- Rapid Trigger Toggle -->
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">
                                            <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Rapid Trigger</div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Enable Rapid Trigger to resolve key events only when Rapid Trigger registers the key press. Adjust the sensitivity below.</div>
                                        </div>                                        <button
                                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                                            style="background-color: {rtDown > 0 ? 'var(--theme-color-primary)' : ($darkMode ? '#4b5563' : '#d1d5db')}; 
                                                   focus:ring-color: var(--theme-color-primary);"
                                            onclick={() => updateRapidTrigger(rtDown === 0)}
                                        >
                                            <span class="inline-block h-3 w-3 transform rounded-full {rtDown > 0 ? ($darkMode ? 'bg-black' : 'bg-white') : 'bg-white'} transition-transform shadow-sm {rtDown > 0 ? 'translate-x-5' : 'translate-x-1'}"></span>
                                        </button>
                                    </div>                                    <!-- Actuation Point Slider -->
                                    <div class="flex flex-col">
                                        <div class="flex justify-between items-center mb-2">
                                            <div>
                                                <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Actuation Point</div>
                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Set the distance at which the key press is registered.</div>
                                            </div>
                                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{uiActuationPoint.toFixed(1)}mm</span>
                                        </div>
                                          <!-- Warning box for values below 0.3 -->
                                        {#if uiActuationPoint < 0.3}
                                            <div class="mb-2 p-2 {$darkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-300 text-yellow-700'} border rounded-md text-xs flex items-center gap-2">
                                                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                                                <span>the key may be too sensitive, causing instability, please be careful</span>
                                            </div>
                                        {/if}
                                        
                                        <!-- Dual input: Slider -->
                                        <input 
                                            type="range" 
                                            min="0.01"
                                            max={bottomOutPoint > 0 ? bottomOutPoint - 0.1 : SWITCH_DISTANCE}
                                            step="0.01" 
                                            bind:value={uiActuationPoint}
                                            onchange={commitActuationPoint}
                                            class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-600' : 'bg-gray-300'} appearance-none slider-thumb mb-2"
                                        />
                                        
                                        <!-- Dual input: Text input -->
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Direct input:</span>
                                            <input 
                                                type="number" 
                                                min="0.01" 
                                                max={bottomOutPoint > 0 ? bottomOutPoint - 0.1 : SWITCH_DISTANCE}
                                                step="0.01" 
                                                bind:value={uiActuationPoint}
                                                onchange={commitActuationPoint}
                                                class="w-20 px-2 py-1 text-xs border rounded {$darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}"
                                            />
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">mm</span>
                                        </div>
                                        
                                        <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
                                            <span>0.01mm</span>
                                            <span>{(bottomOutPoint > 0 ? bottomOutPoint - 0.1 : SWITCH_DISTANCE).toFixed(1)}mm</span>
                                        </div>
                                    </div>

                                    <!-- Rapid Trigger Down Sensitivity (only show when enabled) -->
                                    {#if rtDown > 0}
                                        <div class="flex flex-col">
                                            <div class="flex justify-between items-center mb-2">
                                                <div>
                                                    <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Rapid Trigger Down Sensitivity</div>
                                                    <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Set how sensitive the rapid trigger should be on key press.</div>
                                                </div>
                                                <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{rtDown.toFixed(2)}mm</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.01"
                                                max="1.0"
                                                step="0.01" 
                                                bind:value={rtDown}
                                                class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-600' : 'bg-gray-300'} appearance-none slider-thumb"
                                            />
                                            <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">
                                                <span>0.01mm</span>
                                                <span>1.00mm</span>
                                            </div>
                                        </div>
                                    {/if}
                                </div>                            {:else if activeTab === 'key-tester'}
                                <div class="flex flex-col gap-4 rounded-md border {$darkMode ? 'border-white bg-black' : 'border-gray-200 bg-white'} p-4 shadow-sm">
                                    <div class="text-center">
                                        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">Key Tester</h3>
                                        <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Press the configured keys to test the null bind behavior</p>
                                        
                                        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                            <div class="p-6 border-2 {$darkMode ? 'border-white' : 'border-gray-300'} rounded-lg">
                                                <div class="text-2xl font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{selectedKeys[0]}</div>
                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key 1</div>
                                                {#if behavior === 1}
                                                    <div class="text-xs text-green-600 mt-1 font-medium">Priority Key</div>
                                                {/if}
                                            </div>
                                            <div class="p-6 border-2 {$darkMode ? 'border-white' : 'border-gray-300'} rounded-lg">
                                                <div class="text-2xl font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{selectedKeys[1]}</div>
                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key 2</div>
                                                {#if behavior === 2}
                                                    <div class="text-xs text-green-600 mt-1 font-medium">Priority Key</div>
                                                {/if}
                                            </div>
                                        </div>
                                        
                                        <div class="mt-6 p-4 {$darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg">
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
                                                Current Behavior: <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{getBehaviorName(behavior)}</span>
                                            </div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1">
                                                Bottom Out: <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{bottomOutPoint > 0 ? 'Enabled' : 'Disabled'}</span>
                                            </div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1">
                                                Rapid Trigger: <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{rtDown > 0 ? 'Enabled' : 'Disabled'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}    <!-- Configured Keys Summary -->
    {#if configuredNullBindKeys.length > 0}
        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} border-t p-6">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Configured Null Bind Keys</h3>
                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredNullBindKeys.length} pair{configuredNullBindKeys.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each configuredNullBindKeys as [keyId, config]}
                        {@const [x, y] = keyId.split(',').map(Number)}
                        {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}
                        {@const nullBindConfig = config as NullBindConfiguration}
                        <div class="p-4 {$darkMode ? 'bg-gray-800 border-white' : 'bg-gray-50 border-gray-200'} rounded-lg border">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{keyName}</span>
                            </div>                                            <div class="text-sm space-y-1">
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Paired With:</span>
                                                    <span class="{$darkMode ? 'text-white' : 'text-gray-700'} font-mono text-xs">{nullBindConfig.pairedKeys.join(' ↔ ')}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Behavior:</span>
                                                    <span class="font-medium" style="color: var(--theme-color-primary);">{getBehaviorName(nullBindConfig.behavior)}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Bottom Out:</span>
                                                    <span class="text-green-600 font-medium">{nullBindConfig.bottomOutPoint > 0 ? 'On' : 'Off'}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Rapid Trigger:</span>
                                                    <span class="text-green-600 font-medium">{nullBindConfig.rtDown > 0 ? 'On' : 'Off'}</span>
                                                </div>
                                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .slider-thumb {
        appearance: none;
    }    .slider-thumb::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--thumb-color, #ffffff);
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .slider-thumb::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--thumb-color, #ffffff);
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    
    /* Dark mode slider thumb */
    :global(.dark) .slider-thumb::-webkit-slider-thumb {
        --thumb-color: #ffffff;
    }
    :global(.dark) .slider-thumb::-moz-range-thumb {
        --thumb-color: #ffffff;
    }
</style>