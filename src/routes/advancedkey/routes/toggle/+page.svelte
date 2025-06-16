<script lang="ts">
    import { goto } from '$app/navigation';
    import {  KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions,
        type KeyConfiguration 
    } from "$lib/AdvancedKeyShared";
    import NewZellia80He from '$lib/NewZellia80HE.svelte';

    let selectedToggleAction = $state('caps');
    let toggleMode = $state('press');
    let toggleState = $state(false);
    let CurrentSelected = $state<[number, number] | null>(null);

    function goBack(): void {
        goto('/advancedkey');
    }

    function getCurrentKeyConfiguration(): KeyConfiguration | null {
        if (!CurrentSelected) return null;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
        return $globalConfigurations[keyId] || {
            type: 'toggle',
            toggleAction: selectedToggleAction,
            toggleMode: toggleMode,
            toggleState: toggleState
        };
    }

    function updateConfiguration(): void {
        if (!CurrentSelected) return;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
        updateGlobalConfiguration(keyId, {
            type: 'toggle',
            toggleAction: selectedToggleAction,
            toggleMode: toggleMode,
            toggleState: toggleState
        });
    }

    function resetConfiguration(): void {
        if (!CurrentSelected) return;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
        resetGlobalConfiguration(keyId);
        selectedToggleAction = 'caps';
        toggleMode = 'press';
        toggleState = false;
    }

    function applyConfiguration(): void {
        updateConfiguration();
        console.log('Applying toggle configurations:', $globalConfigurations);
    }

    function resetAllToggleKeys(): void {
        globalConfigurations.update(configs => {
            const newConfigs = { ...configs };
            Object.keys(newConfigs).forEach(keyId => {
                if (newConfigs[keyId].type === 'toggle') {
                    delete newConfigs[keyId];
                }
            });
            return newConfigs;
        });
    }

    // Reactive values
    const currentKeyName = $derived(CurrentSelected ? 
        $KeyboardDisplayValues[CurrentSelected[1]]?.[CurrentSelected[0]] || 'Unknown' : 
        'No key selected');    // Load existing configuration when key selection changes
    $effect(() => {
        if (CurrentSelected) {
            const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
            const config = $globalConfigurations[keyId];
            if (config && config.type === 'toggle') {
                selectedToggleAction = config.toggleAction || 'caps';
                toggleMode = config.toggleMode || 'press';
                toggleState = config.toggleState || false;
            } else {
                // Reset to defaults when no configuration exists or switching to a new key
                selectedToggleAction = 'caps';
                toggleMode = 'press';
                toggleState = false;
            }
        }
    });

    // Toggle action categories
    const toggleCategories = [
        {
            name: 'System',
            actions: keyActions.filter(action => 
                ['caps', 'num', 'scroll'].includes(action.id)
            )
        },
        {
            name: 'Modifiers',
            actions: keyActions.filter(action => 
                ['ctrl', 'shift', 'alt', 'win'].includes(action.id)
            )
        },
        {
            name: 'Function',
            actions: keyActions.filter(action => 
                action.category === 'Function'
            ).slice(0, 12)
        },
        {
            name: 'Letters',
            actions: keyActions.filter(action => 
                action.category === 'Letter'
            ).slice(0, 20)
        }
    ];

    // Get configured toggle keys count
    const configuredToggleKeys = $derived(
        Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'toggle')
    );
</script>

<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey={CurrentSelected}
>
  {#snippet body(x, y)}
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-4 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'}  flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>     <!-- Header -->
    <div class="border-b px-6 py-4" style="background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 20%, ${$darkMode ? 'white' : '#e5e5e5'});">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button 
                    class="flex items-center gap-2 {$darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors"
                    on:click={goBack}
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <div>
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">Toggle Key Configuration</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Configure keys to toggle between states</p>
                </div>
            </div>            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 {$darkMode ? 'text-white bg-gray-800 hover:bg-gray-700 border border-white' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors text-sm font-medium"
                    on:click={resetConfiguration}
                    disabled={!CurrentSelected}
                >
                    Reset
                </button>
                <button 
                    class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                    style="background-color: var(--theme-color-primary); 
                           {!(CurrentSelected) ? '' : 'hover:background-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);'}"
                    on:click={applyConfiguration}
                    disabled={!CurrentSelected}
                >
                    Apply
                </button>
            </div>
        </div>
    </div>    <!-- Main Content -->
    <div class="flex-1 p-4 sm:p-6">
        {#if CurrentSelected}
            <div class="max-w-7xl mx-auto">                <!-- Selected Key Info -->
                <div class="rounded-lg border p-4 sm:p-6 mb-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 30%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center border-2"
                                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? 'black' : 'white'});
                                            border-color: var(--theme-color-primary);">
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{currentKeyName}</span>
                                </div>
                                <div>
                                    <h3 class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Selected Key</h3>
                                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Position: {CurrentSelected[0]}, {CurrentSelected[1]}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Current State:</span>
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full {toggleState ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                <span class="text-sm font-medium {toggleState ? 'text-green-700' : ($darkMode ? 'text-gray-400' : 'text-gray-600')}">
                                    {toggleState ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <!-- Configuration Panel -->
                    <div class="xl:col-span-2 space-y-6">                        <!-- Toggle Action Selection -->
                        <div class="rounded-lg border p-4 sm:p-6"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Toggle Action</h3>
                            
                            <div class="space-y-4">
                                {#each toggleCategories as category}                                    <div>
                                        <h4 class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-700'} mb-2">{category.name}</h4>
                                        <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                                            {#each category.actions as action}
                                                <button
                                                    class="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1"
                                                    style="{selectedToggleAction === action.id 
                                                        ? `background-color: var(--theme-color-primary); color: white; border-color: var(--theme-color-primary);`
                                                        : `background-color: ${$darkMode ? 'black' : 'white'}; 
                                                           color: ${$darkMode ? 'white' : '#374151'}; 
                                                           border-color: ${$darkMode ? 'white' : '#e5e5e5'};`
                                                    }"
                                                    on:mouseenter={(e) => e.currentTarget.style.backgroundColor = selectedToggleAction === action.id 
                                                        ? 'color-mix(in srgb, var(--theme-color-primary) 85%, black)' 
                                                        : ($darkMode ? '#1f2937' : '#f9fafb')}
                                                    on:mouseleave={(e) => e.currentTarget.style.backgroundColor = selectedToggleAction === action.id 
                                                        ? 'var(--theme-color-primary)' 
                                                        : ($darkMode ? 'black' : 'white')}
                                                    on:click={() => selectedToggleAction = action.id}
                                                    title={action.name}
                                                >
                                                    {action.name}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>                        <!-- Toggle Mode -->
                        <div class="rounded-lg border p-4 sm:p-6"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Trigger Mode</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    class="p-4 rounded-lg border-2 text-left transition-all"
                                    style="{toggleMode === 'press'
                                        ? `border-color: var(--theme-color-primary); background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'});`
                                        : `border-color: ${$darkMode ? '#4b5563' : '#e5e5e5'}; background-color: transparent;`
                                    }"
                                    on:mouseenter={(e) => e.currentTarget.style.borderColor = toggleMode === 'press' 
                                        ? 'var(--theme-color-primary)' 
                                        : ($darkMode ? '#6b7280' : '#d1d5db')}
                                    on:mouseleave={(e) => e.currentTarget.style.borderColor = toggleMode === 'press' 
                                        ? 'var(--theme-color-primary)' 
                                        : ($darkMode ? '#4b5563' : '#e5e5e5')}
                                    on:click={() => toggleMode = 'press'}
                                >
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-4 h-4 rounded-full border-2"
                                             style="border-color: {toggleMode === 'press' ? 'var(--theme-color-primary)' : ($darkMode ? '#9ca3af' : '#d1d5db')}; 
                                                    background-color: {toggleMode === 'press' ? 'var(--theme-color-primary)' : 'transparent'};">
                                            {#if toggleMode === 'press'}
                                                <div class="w-2 h-2 {$darkMode ? 'bg-black' : 'bg-white'} rounded-full m-0.5"></div>
                                            {/if}
                                        </div>
                                        <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">On Press</span>
                                    </div>
                                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Toggle when key is pressed down</p>
                                </button>
                                
                                <button
                                    class="p-4 rounded-lg border-2 text-left transition-all"
                                    style="{toggleMode === 'release'
                                        ? `border-color: var(--theme-color-primary); background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'});`
                                        : `border-color: ${$darkMode ? '#4b5563' : '#e5e5e5'}; background-color: transparent;`
                                    }"
                                    on:mouseenter={(e) => e.currentTarget.style.borderColor = toggleMode === 'release' 
                                        ? 'var(--theme-color-primary)' 
                                        : ($darkMode ? '#6b7280' : '#d1d5db')}
                                    on:mouseleave={(e) => e.currentTarget.style.borderColor = toggleMode === 'release' 
                                        ? 'var(--theme-color-primary)' 
                                        : ($darkMode ? '#4b5563' : '#e5e5e5')}
                                    on:click={() => toggleMode = 'release'}
                                >
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-4 h-4 rounded-full border-2"
                                             style="border-color: {toggleMode === 'release' ? 'var(--theme-color-primary)' : ($darkMode ? '#9ca3af' : '#d1d5db')}; 
                                                    background-color: {toggleMode === 'release' ? 'var(--theme-color-primary)' : 'transparent'};">
                                            {#if toggleMode === 'release'}
                                                <div class="w-2 h-2 {$darkMode ? 'bg-black' : 'bg-white'} rounded-full m-0.5"></div>
                                            {/if}
                                        </div>
                                        <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">On Release</span>
                                    </div>
                                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Toggle when key is released</p>
                                </button>
                            </div>
                        </div>                        <!-- State Control -->
                        <div class="rounded-lg border p-4 sm:p-6"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Initial State</h3>
                            
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg"
                                 style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? 'black' : 'white'});">
                                <div class="flex-1">
                                    <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Toggle State</div>
                                    <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Set the initial state for this toggle key</div>
                                </div>                                <div class="flex-shrink-0">
                                    <button
                                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                                        style="background-color: {toggleState ? 'var(--theme-color-primary)' : ($darkMode ? '#4b5563' : '#d1d5db')}; 
                                               focus:ring-color: var(--theme-color-primary);"
                                        on:click={() => toggleState = !toggleState}
                                    >
                                        <span class="inline-block h-4 w-4 transform rounded-full {toggleState ? ($darkMode ? 'bg-black' : 'bg-white') : 'bg-white'} transition-transform shadow-sm {toggleState ? 'translate-x-6' : 'translate-x-1'}"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Panel -->
                    <div class="space-y-6">                        <!-- Live Preview -->
                        <div class="rounded-lg border p-4 sm:p-6"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Preview</h3>
                            
                            <div class="space-y-3">
                                <div class="flex justify-between items-center py-2 border-b {$darkMode ? 'border-gray-600' : 'border-gray-100'}">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key</span>
                                    <span class="font-mono font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{currentKeyName}</span>
                                </div>                                <div class="flex justify-between items-center py-2 border-b {$darkMode ? 'border-gray-600' : 'border-gray-100'}">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Action</span>
                                    <span class="font-medium" style="color: var(--theme-color-primary);">{keyActions.find(k => k.id === selectedToggleAction)?.name || selectedToggleAction}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b {$darkMode ? 'border-gray-600' : 'border-gray-100'}">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Trigger</span>
                                    <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{toggleMode === 'press' ? 'On Press' : 'On Release'}</span>
                                </div>
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">State</span>
                                    <span class="font-medium {toggleState ? 'text-green-600' : ($darkMode ? 'text-gray-400' : 'text-gray-600')}">
                                        {toggleState ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>                        <!-- Info Panel -->
                        <div class="border rounded-lg p-6"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 12%, {$darkMode ? 'black' : 'white'});
                                    border-color: color-mix(in srgb, var(--theme-color-primary) 30%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">How it works</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
                                This key will toggle <strong style="color: var(--theme-color-primary);">{keyActions.find(k => k.id === selectedToggleAction)?.name || selectedToggleAction}</strong> 
                                {toggleMode === 'press' ? 'when pressed' : 'when released'}. Each trigger will switch between active and inactive states.
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="space-y-3">
                            <button 
                                class="w-full px-4 py-2 {$darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md transition-colors text-sm font-medium"
                                on:click={resetAllToggleKeys}
                            >
                                Reset All Toggle Keys
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {:else}            <!-- No Key Selected State -->
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center max-w-md mx-auto">
                    <div class="w-24 h-24 {$darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-12 h-12 {$darkMode ? 'text-gray-400' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">No Key Selected</h3>
                    <p class="{$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Select a key from the keyboard layout to configure its toggle behavior</p>                    <div class="{$darkMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-50 border-blue-200 text-blue-700'} border rounded-lg p-4 text-sm"
                         style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, white);
                                border-color: color-mix(in srgb, var(--theme-color-primary) 40%, #e5e5e5);
                                color: color-mix(in srgb, var(--theme-color-primary) 80%, black);">
                        <strong>Tip:</strong> Toggle keys are perfect for Caps Lock, Num Lock, or creating custom modifier states
                    </div>
                </div>
            </div>
        {/if}        <!-- Configured Keys Summary -->
        {#if configuredToggleKeys.length > 0}
            <div class="max-w-6xl mx-auto mt-6">                <div class="rounded-lg border p-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Configured Toggle Keys</h3>
                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredToggleKeys.length} key{configuredToggleKeys.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each configuredToggleKeys as [keyId, config]}
                            {@const [x, y] = keyId.split(',').map(Number)}
                            {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}                            <div class="p-4 rounded-lg border"
                                 style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? 'black' : 'white'});
                                        border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{keyName}</span>
                                    <div class="w-2 h-2 rounded-full {config.toggleState ? 'bg-green-500' : 'bg-gray-400'}"></div>
                                </div>
                                <div class="text-sm font-medium" style="color: var(--theme-color-primary);">
                                    {keyActions.find(k => k.id === config.toggleAction)?.name || config.toggleAction}
                                </div>
                                <div class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize">
                                    {config.toggleMode} trigger
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>