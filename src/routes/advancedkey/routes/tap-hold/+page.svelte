<script lang="ts">
    import { goto } from '$app/navigation';
    import {  KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions
    } from "$lib/AdvancedKeyShared";
    import NewZellia80He from '$lib/NewZellia80HE.svelte';

    // Define the tap-hold specific configuration type
    type TapHoldConfiguration = {
        type: 'tap-hold';
        tapAction: string;
        holdAction: string;
        holdDelay: number;
        tapTimeout: number;
    };

    let CurrentSelected = $state<[number, number] | null>(null);
    let tapAction = $state('esc');
    let holdAction = $state('ctrl');
    let holdDelay = $state(200); // milliseconds
    let tapTimeout = $state(150); // milliseconds

    function goBack(): void {
        goto('/advancedkey');
    }

    function getCurrentKeyConfiguration(): TapHoldConfiguration | null {
        if (!CurrentSelected) return null;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
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
        if (!CurrentSelected) return;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
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
        if (!CurrentSelected) return;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
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
    const currentKeyName = $derived(CurrentSelected ? 
        $KeyboardDisplayValues[CurrentSelected[1]]?.[CurrentSelected[0]] || 'Unknown' : 
        'No key selected');

    // Load existing configuration when key selection changes
    $effect(() => {
        if (CurrentSelected) {
            const config = getCurrentKeyConfiguration();
            if (config && $globalConfigurations[`${CurrentSelected[0]},${CurrentSelected[1]}`]) {
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
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>    <!-- Header -->
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
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">Tap Hold Key Configuration</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">Configure keys to perform different actions on tap vs hold</p>
                </div>
            </div>
            <div class="flex gap-3">                <button 
                    class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    style="background-color: {$darkMode ? '#374151' : 'color-mix(in srgb, var(--theme-color-primary) 10%, white)'};
                           border: 1px solid {$darkMode ? 'white' : 'color-mix(in srgb, var(--theme-color-primary) 30%, transparent)'};
                           color: {$darkMode ? 'white' : '#374151'};"
                    onmouseover={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#4b5563' : `color-mix(in srgb, var(--theme-color-primary) 20%, white)`;
                    }}
                    onmouseout={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                    }}
                    onclick={resetConfiguration}
                    disabled={!CurrentSelected}
                >
                    Reset
                </button>
                <button 
                    class="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white"
                    style="background-color: var(--theme-color-primary);
                           border: 1px solid var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                    onclick={applyConfiguration}
                    disabled={!CurrentSelected}
                >
                    Apply
                </button>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-6">
        {#if CurrentSelected}
            <div class="max-w-6xl mx-auto">
                <!-- Selected Key Info -->
                <div class="rounded-lg border p-6 mb-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 30%, ${$darkMode ? 'white' : '#e5e5e5'});">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3">                                <div class="w-12 h-12 rounded-lg flex items-center justify-center border-2"
                                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 10%, {$darkMode ? 'black' : 'white'});
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
                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Mode:</span>                            <span class="px-3 py-1 rounded-full text-sm font-medium text-white"
                                  style="background-color: var(--theme-color-primary);">
                                Tap Hold
                            </span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Configuration Panel -->
                    <div class="lg:col-span-2 space-y-6">                        <!-- Tap Action Selection -->
                        <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Tap Action</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Action to perform when key is quickly tapped</p>
                            
                            <div class="space-y-4">
                                {#each actionCategories as category}
                                    <div>
                                        <h4 class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2">{category.name}</h4>
                                        <div class="grid grid-cols-10 gap-2">
                                            {#each category.actions as action}                                                <button
                                                    class="aspect-square w-15 h-15 text-xs rounded-md border transition-all"
                                                    style="{tapAction === action.id 
                                                        ? `background-color: var(--theme-color-primary); 
                                                           border-color: var(--theme-color-primary); 
                                                           color: white;`
                                                        : `background-color: ${$darkMode ? '#111827' : 'white'}; 
                                                           border-color: ${$darkMode ? '#374151' : '#e5e7eb'}; 
                                                           color: ${$darkMode ? '#d1d5db' : '#374151'};`}"
                                                    onmouseover={(e) => {
                                                        if (tapAction !== action.id) {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                                                            (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, var(--theme-color-primary) 50%, ${$darkMode ? '#374151' : '#e5e7eb'})`;
                                                        }
                                                    }}
                                                    onmouseout={(e) => {
                                                        if (tapAction !== action.id) {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#111827' : 'white';
                                                            (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? '#374151' : '#e5e7eb';
                                                        }
                                                    }}
                                                    onclick={() => tapAction = action.id}
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
                        <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Hold Action</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">Action to perform when key is held down</p>
                            
                            <div class="space-y-4">
                                {#each actionCategories as category}
                                    <div>
                                        <h4 class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2">{category.name}</h4>
                                        <div class="grid grid-cols-10 gap-2">
                                            {#each category.actions as action}                                                <button
                                                    class="aspect-square w-15 h-15 text-xs rounded-md border transition-all"
                                                    style="{holdAction === action.id 
                                                        ? `background-color: color-mix(in srgb, var(--theme-color-primary) 80%, green); 
                                                           border-color: color-mix(in srgb, var(--theme-color-primary) 80%, green); 
                                                           color: white;`
                                                        : `background-color: ${$darkMode ? '#111827' : 'white'}; 
                                                           border-color: ${$darkMode ? '#374151' : '#e5e7eb'}; 
                                                           color: ${$darkMode ? '#d1d5db' : '#374151'};`}"
                                                    onmouseover={(e) => {
                                                        if (holdAction !== action.id) {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                                                            (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, var(--theme-color-primary) 50%, ${$darkMode ? '#374151' : '#e5e7eb'})`;
                                                        }
                                                    }}
                                                    onmouseout={(e) => {
                                                        if (holdAction !== action.id) {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#111827' : 'white';
                                                            (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? '#374151' : '#e5e7eb';
                                                        }
                                                    }}
                                                    onclick={() => holdAction = action.id}
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
                        <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Timing Settings</h3>
                            
                            <div class="space-y-6">
                                <!-- Hold Delay -->
                                <div>                                    <div class="flex justify-between items-center mb-2">
                                        <label for="hold-delay-slider" class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'}">Hold Delay</label>
                                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{holdDelay}ms</span>
                                    </div>                                    <input 
                                        id="hold-delay-slider"
                                        type="range" 
                                        min="100" 
                                        max="1000" 
                                        step="50" 
                                        bind:value={holdDelay}
                                        class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-700' : 'bg-gray-300'} appearance-none slider-thumb"
                                        style="--thumb-color: var(--theme-color-primary)"
                                    />
                                    <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">Time before hold action triggers</p>
                                </div>

                                <!-- Tap Timeout -->
                                <div>                                    <div class="flex justify-between items-center mb-2">
                                        <label for="tap-timeout-slider" class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'}">Tap Timeout</label>
                                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{tapTimeout}ms</span>
                                    </div>                                    <input 
                                        id="tap-timeout-slider"
                                        type="range" 
                                        min="50" 
                                        max="500" 
                                        step="25" 
                                        bind:value={tapTimeout}
                                        class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-700' : 'bg-gray-300'} appearance-none slider-thumb"
                                        style="--thumb-color: var(--theme-color-primary)"
                                    />
                                    <p class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">Maximum time for a tap to register</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Panel -->
                    <div class="lg:col-span-1 space-y-6">
                        <!-- Live Preview -->
                        <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Preview</h3>
                            
                            <div class="space-y-3">
                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key</span>
                                    <span class="font-mono font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{currentKeyName}</span>
                                </div>                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Tap</span>
                                    <span class="font-medium" style="color: var(--theme-color-primary);">{keyActions.find(k => k.id === tapAction)?.name || tapAction}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Hold</span>
                                    <span class="font-medium" style="color: color-mix(in srgb, var(--theme-color-primary) 80%, green);">{keyActions.find(k => k.id === holdAction)?.name || holdAction}</span>
                                </div>
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Delay</span>
                                    <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{holdDelay}ms</span>
                                </div>
                            </div>
                        </div>                        <!-- Info Panel -->                        <div class="border rounded-lg p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 12%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 30%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">How it works</h3>
                            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-800'} space-y-2">
                                <p>• Quick tap (under {tapTimeout}ms): <strong>{keyActions.find(k => k.id === tapAction)?.name || tapAction}</strong></p>
                                <p>• Hold (over {holdDelay}ms): <strong>{keyActions.find(k => k.id === holdAction)?.name || holdAction}</strong></p>
                                <p class="mt-3 text-xs">Perfect for modifier keys that can also function as regular keys when tapped quickly.</p>
                            </div>
                        </div><!-- Actions -->
                        <div class="{$darkMode ? 'bg-black border-white' : 'bg-white border-gray-200'} rounded-lg border p-6">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Actions</h3>
                            <div class="space-y-3">                                <button 
                                    class="w-full px-4 py-2 rounded-md transition-colors text-sm font-medium text-white"
                                    style="background-color: #dc2626; border: 1px solid #dc2626;"
                                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#b91c1c'}
                                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#dc2626'}
                                    onclick={resetAllTapHoldKeys}
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
            <div class="max-w-6xl mx-auto mt-6">
                <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Configured Tap Hold Keys</h3>
                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredTapHoldKeys.length} key{configuredTapHoldKeys.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each configuredTapHoldKeys as [keyId, config]}
                            {@const [x, y] = keyId.split(',').map(Number)}
                            {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}
                            {@const tapHoldConfig = config as TapHoldConfiguration}                            <div class="p-4 rounded-lg border" style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{keyName}</span>
                                </div>
                                <div class="text-sm space-y-1">                                    <div class="flex justify-between">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Tap:</span>
                                        <span class="font-medium" style="color: var(--theme-color-primary);">{keyActions.find(k => k.id === tapHoldConfig.tapAction)?.name || tapHoldConfig.tapAction}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">Hold:</span>
                                        <span class="font-medium" style="color: color-mix(in srgb, var(--theme-color-primary) 80%, green);">{keyActions.find(k => k.id === tapHoldConfig.holdAction)?.name || tapHoldConfig.holdAction}</span>
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