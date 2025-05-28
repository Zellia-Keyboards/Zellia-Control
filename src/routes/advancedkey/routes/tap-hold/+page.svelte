<script lang="ts">
    import { goto } from '$app/navigation';
    import { CurrentSelected, KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions
    } from "../../../../lib/AdvancedKeyShared";

    // Define the tap-hold specific configuration type
    type TapHoldConfiguration = {
        type: 'tap-hold';
        tapAction: string;
        holdAction: string;
        holdDelay: number;
        tapTimeout: number;
    };

    let tapAction = $state('esc');
    let holdAction = $state('ctrl');
    let holdDelay = $state(200); // milliseconds
    let tapTimeout = $state(150); // milliseconds

    function goBack(): void {
        goto('/advancedkey');
    }

    function getCurrentKeyConfiguration(): TapHoldConfiguration | null {
        if (!$CurrentSelected) return null;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        const config = $globalConfigurations[keyId];
        
        if (config && config.type === 'tap-hold') {
            return config as TapHoldConfiguration;
        }
        
        return {
            type: 'tap-hold',
            tapAction: tapAction,
            holdAction: holdAction,
            holdDelay: holdDelay,
            tapTimeout: tapTimeout
        };
    }

    function updateConfiguration(): void {
        if (!$CurrentSelected) return;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        const config: TapHoldConfiguration = {
            type: 'tap-hold',
            tapAction: tapAction,
            holdAction: holdAction,
            holdDelay: holdDelay,
            tapTimeout: tapTimeout
        };
        updateGlobalConfiguration(keyId, config);
    }

    function resetConfiguration(): void {
        if (!$CurrentSelected) return;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        resetGlobalConfiguration(keyId);
        tapAction = 'esc';
        holdAction = 'ctrl';
        holdDelay = 200;
        tapTimeout = 150;
    }

    function applyConfiguration(): void {
        updateConfiguration();
        console.log('Applying tap-hold configurations:', $globalConfigurations);
    }

    function resetAllTapHoldKeys(): void {
        globalConfigurations.update(configs => {
            const newConfigs = { ...configs };
            Object.keys(newConfigs).forEach(keyId => {
                if (newConfigs[keyId].type === 'tap-hold') {
                    delete newConfigs[keyId];
                }
            });
            return newConfigs;
        });
    }

    // Reactive values
    const currentKeyName = $derived($CurrentSelected ? 
        $KeyboardDisplayValues[$CurrentSelected[1]]?.[$CurrentSelected[0]] || 'Unknown' : 
        'No key selected');

    // Load existing configuration when key selection changes
    $effect(() => {
        if ($CurrentSelected) {
            const config = getCurrentKeyConfiguration();
            if (config && $globalConfigurations[`${$CurrentSelected[0]},${$CurrentSelected[1]}`]) {
                tapAction = config.tapAction || 'esc';
                holdAction = config.holdAction || 'ctrl';
                holdDelay = config.holdDelay || 200;
                tapTimeout = config.tapTimeout || 150;
            }
        }
    });

    // Action categories for better organization
    const actionCategories = [
        {
            name: 'Common',
            actions: keyActions.filter(action => 
                ['esc', 'enter', 'space', 'tab', 'backspace', 'delete'].includes(action.id)
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

    // Get configured tap-hold keys count
    const configuredTapHoldKeys = $derived(
        Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'tap-hold')
    );
</script>

<div class="h-full flex flex-col {$darkMode ? 'bg-black' : 'bg-gray-50'}">
    <!-- Header -->
    <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} border-b px-6 py-4">
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
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">Tap Hold Key Configuration</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Configure keys to perform different actions on tap vs hold</p>
                </div>
            </div>
            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 {$darkMode ? 'text-white bg-gray-800 hover:bg-gray-700 border border-white' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors text-sm font-medium"
                    on:click={resetConfiguration}
                    disabled={!$CurrentSelected}
                >
                    Reset
                </button>
                <button 
                    class="px-4 py-2 {$darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-md transition-colors text-sm font-medium"
                    on:click={applyConfiguration}
                    disabled={!$CurrentSelected}
                >
                    Apply
                </button>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-6">
        {#if $CurrentSelected}
            <div class="max-w-6xl mx-auto">                <!-- Selected Key Info -->
                <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 {$darkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-blue-300'} rounded-lg flex items-center justify-center border-2">
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{currentKeyName}</span>
                                </div>
                                <div>
                                    <h3 class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Selected Key</h3>
                                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Position: {$CurrentSelected[0]}, {$CurrentSelected[1]}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Mode:</span>
                            <span class="px-3 py-1 {$darkMode ? 'bg-gray-800 text-white border border-white' : 'bg-purple-100 text-purple-700'} rounded-full text-sm font-medium">
                                Tap Hold
                            </span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Configuration Panel -->
                    <div class="lg:col-span-2 space-y-6">                        <!-- Tap Action Selection -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Tap Action</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Action to perform when key is quickly tapped</p>
                            
                            <div class="space-y-4">
                                {#each actionCategories as category}
                                    <div>
                                        <h4 class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2">{category.name}</h4>
                                        <div class="grid grid-cols-10 gap-2">
                                            {#each category.actions as action}
                                                <button
                                                    class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {tapAction === action.id ? 
                                                        ($darkMode ? 'bg-gray-800 border-white text-white' : 'bg-blue-50 border-blue-300 text-blue-700') : 
                                                        ($darkMode ? 'bg-gray-900 border-gray-600 hover:bg-gray-800 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700')
                                                    }"
                                                    on:click={() => tapAction = action.id}
                                                    title={action.name}
                                                >
                                                    {action.name}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>                        <!-- Hold Action Selection -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Hold Action</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Action to perform when key is held down</p>
                            
                            <div class="space-y-4">
                                {#each actionCategories as category}
                                    <div>
                                        <h4 class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2">{category.name}</h4>
                                        <div class="grid grid-cols-10 gap-2">
                                            {#each category.actions as action}
                                                <button
                                                    class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {holdAction === action.id ? 
                                                        ($darkMode ? 'bg-gray-800 border-white text-white' : 'bg-green-50 border-green-300 text-green-700') : 
                                                        ($darkMode ? 'bg-gray-900 border-gray-600 hover:bg-gray-800 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700')
                                                    }"
                                                    on:click={() => holdAction = action.id}
                                                    title={action.name}
                                                >
                                                    {action.name}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>                        <!-- Timing Configuration -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Timing Settings</h3>
                            
                            <div class="space-y-6">
                                <!-- Hold Delay -->
                                <div>
                                    <div class="flex justify-between items-center mb-2">
                                        <label class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'}">Hold Delay</label>
                                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{holdDelay}ms</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="100" 
                                        max="1000" 
                                        step="50" 
                                        bind:value={holdDelay}
                                        class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-700' : 'bg-gray-300'} appearance-none slider-thumb"
                                        style="--thumb-color: {$darkMode ? '#ffffff' : '#2563eb'}"
                                    />
                                    <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">Time before hold action triggers</p>
                                </div>

                                <!-- Tap Timeout -->
                                <div>
                                    <div class="flex justify-between items-center mb-2">
                                        <label class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'}">Tap Timeout</label>
                                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{tapTimeout}ms</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="50" 
                                        max="500" 
                                        step="25" 
                                        bind:value={tapTimeout}
                                        class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-700' : 'bg-gray-300'} appearance-none slider-thumb"
                                        style="--thumb-color: {$darkMode ? '#ffffff' : '#2563eb'}"
                                    />
                                    <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">Maximum time for a tap to register</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Panel -->
                    <div class="space-y-6">                        <!-- Live Preview -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Preview</h3>
                            
                            <div class="space-y-3">
                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key</span>
                                    <span class="font-mono font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{currentKeyName}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Tap</span>
                                    <span class="font-medium {$darkMode ? 'text-gray-300' : 'text-blue-600'}">{keyActions.find(k => k.id === tapAction)?.name || tapAction}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Hold</span>
                                    <span class="font-medium {$darkMode ? 'text-gray-300' : 'text-green-600'}">{keyActions.find(k => k.id === holdAction)?.name || holdAction}</span>
                                </div>
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Delay</span>
                                    <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{holdDelay}ms</span>
                                </div>
                            </div>
                        </div>                        <!-- Info Panel -->
                        <div class="{$darkMode ? 'bg-gray-900 border-gray-600' : 'bg-amber-50 border-amber-200'} border rounded-lg p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-amber-900'} mb-2">How it works</h3>
                            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-amber-800'} space-y-2">
                                <p>• Quick tap (under {tapTimeout}ms): <strong>{keyActions.find(k => k.id === tapAction)?.name || tapAction}</strong></p>
                                <p>• Hold (over {holdDelay}ms): <strong>{keyActions.find(k => k.id === holdAction)?.name || holdAction}</strong></p>
                                <p class="mt-3 text-xs">Perfect for modifier keys that can also function as regular keys when tapped quickly.</p>
                            </div>
                        </div>                        <!-- Actions -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Actions</h3>
                            <div class="space-y-3">
                                <button 
                                    class="w-full px-4 py-2 {$darkMode ? 'bg-red-800 text-white hover:bg-red-700 border border-red-600' : 'bg-red-600 text-white hover:bg-red-700'} rounded-md transition-colors text-sm font-medium"
                                    on:click={resetAllTapHoldKeys}
                                >
                                    Reset All Tap Hold Keys
                                </button>
                            </div>
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
                    <p class="{$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Select a key from the keyboard layout to configure its tap-hold behavior</p>
                    <div class="{$darkMode ? 'bg-gray-900 border-gray-600 text-gray-300' : 'bg-blue-50 border-blue-200 text-blue-700'} border rounded-lg p-4 text-sm">
                        <strong>Tip:</strong> Tap-hold keys are perfect for modifier keys that can also function as regular keys when tapped quickly
                    </div>
                </div>
            </div>
        {/if}

        <!-- Configured Keys Summary -->
        {#if configuredTapHoldKeys.length > 0}
            <div class="max-w-6xl mx-auto mt-6">                <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Configured Tap Hold Keys</h3>
                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredTapHoldKeys.length} key{configuredTapHoldKeys.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each configuredTapHoldKeys as [keyId, config]}
                            {@const [x, y] = keyId.split(',').map(Number)}
                            {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}
                            {@const tapHoldConfig = config as TapHoldConfiguration}
                            <div class="p-4 {$darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50'} rounded-lg border">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{keyName}</span>
                                </div>
                                <div class="text-sm space-y-1">
                                    <div class="flex justify-between">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Tap:</span>
                                        <span class="{$darkMode ? 'text-gray-300' : 'text-blue-600'} font-medium">{keyActions.find(k => k.id === tapHoldConfig.tapAction)?.name || tapHoldConfig.tapAction}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Hold:</span>
                                        <span class="{$darkMode ? 'text-gray-300' : 'text-green-600'} font-medium">{keyActions.find(k => k.id === tapHoldConfig.holdAction)?.name || tapHoldConfig.holdAction}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Delay:</span>
                                        <span class="{$darkMode ? 'text-gray-300' : 'text-gray-700'}">{tapHoldConfig.holdDelay}ms</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
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
        background: var(--thumb-color, #2563eb);
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .slider-thumb::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--thumb-color, #2563eb);
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
</style>