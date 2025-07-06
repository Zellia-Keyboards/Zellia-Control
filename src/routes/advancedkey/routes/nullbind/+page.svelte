<script lang="ts">    import { goto } from '$app/navigation';
    import {  KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { language, t } from '$lib/LanguageStore.svelte';
    import { AlertTriangle, Trash2 } from 'lucide-svelte';
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions
    } from "$lib/AdvancedKeyShared";
    import NewZellia80He from '$lib/NewZellia80HE.svelte';

    let currentLanguage = $state($language);
    
    // Subscribe to language changes
    language.subscribe(value => {
        currentLanguage = value;
    });

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
    const SWITCH_DISTANCE = 4.0;    // NULL_BIND_BEHAVIOR_METADATA with all 5 modes - reactive to language changes
    const NULL_BIND_BEHAVIOR_METADATA = $derived([
        {
            behavior: 0,
            name: t('advancedkey.lastInputBehavior', currentLanguage),
            description: t('advancedkey.lastInputBehaviorDesc', currentLanguage)
        },
        {
            behavior: 1,
            name: t('advancedkey.absolutePriority1Behavior', currentLanguage),
            description: t('advancedkey.absolutePriority1BehaviorDesc', currentLanguage)
        },
        {
            behavior: 2,
            name: t('advancedkey.absolutePriority2Behavior', currentLanguage),
            description: t('advancedkey.absolutePriority2BehaviorDesc', currentLanguage)
        },
        {
            behavior: 3,
            name: t('advancedkey.neutralBehavior', currentLanguage),
            description: t('advancedkey.neutralBehaviorDesc', currentLanguage)
        },
        {
            behavior: 4,
            name: t('advancedkey.distanceBehavior', currentLanguage),
            description: t('advancedkey.distanceBehaviorDesc', currentLanguage)
        }
    ]);

    // State variables
    let behavior = $state(0); // Default to last input
    let bottomOutPoint = $state(0); // Default to disabled
    let actuationPoint = $state(DEFAULT_ACTUATION);
    let selectedKeys = $state<string[]>([]);
    let activeTab = $state<'performance' | 'key-tester'>('performance');
    let rtDown = $state(0); // Rapid trigger down
    let rtUp = $state(0); // Rapid trigger up
    let continuous = $state(false);
    let CurrentSelected = $state<[number, number] | null>(null);
    
    // State for smooth deletion and addition animations
    let deletingPairs = $state<Set<string>>(new Set());
    let newlyAddedPairs = $state<Set<string>>(new Set());

    // UI state variables for real-time updates
    let uiBottomOutPoint = $state(DEFAULT_BOTTOM_OUT_POINT);
    let uiActuationPoint = $state(DEFAULT_ACTUATION);

    function goBack(): void {
        goto('/advancedkey');
    }

    // Automatically add selected key without needing to press a button
    $effect(() => {
        if (CurrentSelected && selectedKeys.length < 2) {
            const keyName = $KeyboardDisplayValues[CurrentSelected[1]]?.[CurrentSelected[0]] || 'Unknown';
            
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
    }    function updateConfiguration(): void {
        if (selectedKeys.length !== 2) return;
        
        // Apply configuration to both keys
        selectedKeys.forEach((keyName) => {
            const keyPosition = findKeyPosition(keyName);
            
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
                
                // Force update even if configuration exists
                updateGlobalConfiguration(keyId, config);
                console.log(`Updated configuration for key ${keyId}:`, config);
            }
        });
        
        console.log('Configuration updated for keys:', selectedKeys);
    }

    function resetConfiguration(): void {
        if (selectedKeys.length !== 2) return;
        
        // Reset configuration for both selected keys
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
                resetGlobalConfiguration(keyId);
            }
        });
        
        // Reset local settings to defaults
        behavior = 0;
        bottomOutPoint = 0;
        actuationPoint = DEFAULT_ACTUATION;
        uiActuationPoint = DEFAULT_ACTUATION;
        uiBottomOutPoint = DEFAULT_BOTTOM_OUT_POINT;
        rtDown = 0;
        rtUp = 0;
        continuous = false;
    }

    function resetAllNullBindKeys(): void {
        // Start fade-out animation for all existing pairs
        const currentPairs = new Set(
            configuredNullBindKeys().map(([keyId, config]) => {
                const nullBindConfig = config as NullBindConfiguration;
                return `${nullBindConfig.pairedKeys[0]}-${nullBindConfig.pairedKeys[1]}`;
            })
        );
        deletingPairs = currentPairs;
        
        // Wait for animation to complete, then reset
        setTimeout(() => {
            globalConfigurations.update(configs => {
                const newConfigs = { ...configs };
                Object.keys(newConfigs).forEach(keyId => {
                    if (newConfigs[keyId].type === 'null-bind') {
                        delete newConfigs[keyId];
                    }
                });
                return newConfigs;
            });
            
            // Clear the deleting state after reset
            deletingPairs = new Set();
        }, 300); // Match the CSS animation duration
    }

    function deleteNullBindPair(pairKeys: [string, string]): void {
        const pairId = `${pairKeys[0]}-${pairKeys[1]}`;
        
        // Start fade-out animation
        deletingPairs = new Set([...deletingPairs, pairId]);
        
        // Wait for animation to complete, then delete
        setTimeout(() => {
            // Find and delete both keys in the pair
            pairKeys.forEach((keyName) => {
                const keyPosition = findKeyPosition(keyName);
                if (keyPosition) {
                    const keyId = `${keyPosition[0]},${keyPosition[1]}`;
                    resetGlobalConfiguration(keyId);
                }
            });
            
            // Remove from deleting state
            deletingPairs = new Set([...deletingPairs].filter(id => id !== pairId));
        }, 300); // Match the CSS animation duration
    }

    function applyConfiguration(): void {
        updateConfiguration();
        
        // Add fade-in animation for newly configured pairs
        if (selectedKeys.length === 2) {
            // Create both possible pair combinations since pairedKeys are sorted
            const pairId1 = `${selectedKeys[0]}-${selectedKeys[1]}`;
            const pairId2 = `${selectedKeys[1]}-${selectedKeys[0]}`;
            const sortedPairId = [selectedKeys[0], selectedKeys[1]].sort().join('-');
            
            newlyAddedPairs = new Set([...newlyAddedPairs, pairId1, pairId2, sortedPairId]);
            
            // Remove the fade-in effect after animation completes
            setTimeout(() => {
                newlyAddedPairs = new Set([...newlyAddedPairs].filter(id => 
                    id !== pairId1 && id !== pairId2 && id !== sortedPairId
                ));
            }, 500); // Slightly longer than fade-in duration for better visual
        }
        
        console.log('Applying null bind configurations:', $globalConfigurations);
    }    // Get configured null bind keys count - only show unique pairs
    const configuredNullBindKeys = $derived(() => {
        const nullBindConfigs = Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'null-bind');
        const uniquePairs = new Map();
        
        nullBindConfigs.forEach(([keyId, config]) => {
            const nullBindConfig = config as NullBindConfiguration;
            // Create a consistent pair key by sorting the paired keys
            const pairKey = [...nullBindConfig.pairedKeys].sort().join('-');
            
            // Only keep the first occurrence of each pair
            if (!uniquePairs.has(pairKey)) {
                uniquePairs.set(pairKey, [keyId, config]);
            }
        });
        
        return Array.from(uniquePairs.values());
    });    // Check if we have exactly 2 keys selected
    const canConfigure = $derived(selectedKeys.length === 2);

    // Load existing configuration when two keys are selected
    $effect(() => {
        if (selectedKeys.length === 2) {
            // Check if these keys already have a configuration
            const firstKeyPosition = findKeyPosition(selectedKeys[0]);
            if (firstKeyPosition) {
                const keyId = `${firstKeyPosition[0]},${firstKeyPosition[1]}`;
                const existingConfig = $globalConfigurations[keyId] as NullBindConfiguration | undefined;
                
                if (existingConfig && existingConfig.type === 'null-bind') {
                    // Load the existing configuration into the UI
                    behavior = existingConfig.behavior;
                    bottomOutPoint = existingConfig.bottomOutPoint;
                    actuationPoint = existingConfig.actuationPoint;
                    uiActuationPoint = existingConfig.actuationPoint;
                    if (existingConfig.bottomOutPoint > 0) {
                        uiBottomOutPoint = existingConfig.bottomOutPoint;
                    }
                    rtDown = existingConfig.rtDown;
                    rtUp = existingConfig.rtUp;
                    continuous = existingConfig.continuous;
                    
                    console.log('Loaded existing configuration for keys:', selectedKeys, existingConfig);
                }
            }
        }
    });

    // Helper function to find key position
    function findKeyPosition(keyName: string): [number, number] | null {
        for (let row = 0; row < $KeyboardDisplayValues.length; row++) {
            for (let col = 0; col < $KeyboardDisplayValues[row].length; col++) {
                if ($KeyboardDisplayValues[row][col] === keyName) {
                    return [col, row];
                }
            }
        }
        return null;
    }

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
  bind:currentSelectedKey={CurrentSelected}
>
  {#snippet body(x, y)}
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-4 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} flex flex-col"
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
                    </svg>                    {t('advancedkey.backToAdvanced', currentLanguage)}
                </button>
                <div>
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.nullBindTitle', currentLanguage)}</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.nullBindSubtitle', currentLanguage)}</p>
                </div>
            </div>            
            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style="background-color: var(--theme-color-primary); 
                           {!canConfigure ? '' : 'hover:background-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);'}"
                    onclick={applyConfiguration}
                    disabled={!canConfigure}
                >
                    {t('advancedkey.applyConfiguration', currentLanguage)}
                </button>
            </div>
        </div>
    </div>    <!-- Key Selection Section -->
    {#if !canConfigure}
        <div class="p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});" >
            <div class="max-w-4xl mx-auto">
                <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}  mb-3">{t('advancedkey.selectTwoKeys', currentLanguage)}</h3>
                <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
                    {t('advancedkey.selectTwoKeysInstructions', currentLanguage)}
                </p>
                  <!-- Selected Keys Display -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="p-4 border-2 border-dashed rounded-lg"
                         style="{selectedKeys.length >= 1 
                             ? `border-color: var(--theme-color-primary); background-color: color-mix(in srgb, var(--theme-color-primary) 12%, ${$darkMode ? 'black' : 'white'});` 
                             : `border-color: color-mix(in srgb, var(--theme-color-primary) 60%, ${$darkMode ? 'white' : '#e5e5e5'}); 
                                background-color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'});`
                         }">
                        <div class="text-center">
                            {#if selectedKeys.length >= 1}
                                <div class="w-12 h-12 text-white rounded-lg flex items-center justify-center mx-auto mb-2"
                                     style="background-color: var(--theme-color-primary);">
                                    <span class="font-mono font-bold">{selectedKeys[0]}</span>
                                </div>
                                <div class="text-sm font-medium" style="color: var(--theme-color-primary);">{t('advancedkey.firstKey', currentLanguage)}</div>
                                <button 
                                    class="mt-2 text-xs text-red-600 hover:text-red-700"
                                    onclick={() => removeKey(0)}
                                >
                                    {t('advancedkey.remove', currentLanguage)}
                                </button>
                            {:else}
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse"
                                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 40%, {$darkMode ? 'black' : 'white'});">
                                    <span style="color: var(--theme-color-primary);">?</span>
                                </div>
                                <div class="text-sm" style="color: var(--theme-color-primary);">{t('advancedkey.clickKeyToSelect', currentLanguage)}</div>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="p-4 border-2 border-dashed rounded-lg"
                         style="{selectedKeys.length >= 2 
                             ? `border-color: var(--theme-color-primary); background-color: color-mix(in srgb, var(--theme-color-primary) 12%, ${$darkMode ? 'black' : 'white'});` 
                             : selectedKeys.length === 1 
                             ? `border-color: var(--theme-color-primary); background-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${$darkMode ? 'black' : 'white'});` 
                             : `border-color: ${$darkMode ? '#4b5563' : '#d1d5db'}; 
                                background-color: ${$darkMode ? '#1f2937' : '#f9fafb'};`
                         }">
                        <div class="text-center">
                            {#if selectedKeys.length >= 2}
                                <div class="w-12 h-12 text-white rounded-lg flex items-center justify-center mx-auto mb-2"
                                     style="background-color: var(--theme-color-primary);">
                                    <span class="font-mono font-bold">{selectedKeys[1]}</span>
                                </div>
                                <div class="text-sm font-medium" style="color: var(--theme-color-primary);">{t('advancedkey.secondKey', currentLanguage)}</div>
                                <button 
                                    class="mt-2 text-xs text-red-600 hover:text-red-700"
                                    onclick={() => removeKey(1)}
                                >
                                    {t('advancedkey.remove', currentLanguage)}
                                </button>
                            {:else if selectedKeys.length === 1}
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 animate-pulse"
                                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 40%, {$darkMode ? 'black' : 'white'});">
                                    <span style="color: var(--theme-color-primary);">?</span>
                                </div>
                                <div class="text-sm" style="color: var(--theme-color-primary);">{t('advancedkey.clickOpposingKey', currentLanguage)}</div>
                            {:else}
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2"
                                     style="background-color: {$darkMode ? '#4b5563' : '#d1d5db'};">
                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">?</span>
                                </div>
                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.secondKey', currentLanguage)}</div>
                            {/if}
                        </div>
                    </div>
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
                        <div class="relative overflow-hidden rounded-lg border"
                             style="background: linear-gradient(135deg, 
                                     color-mix(in srgb, var(--theme-color-primary) 10%, {$darkMode ? '#1f2937' : '#ffffff'}) 0%, 
                                     color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? '#111827' : '#f8fafc'}) 100%);
                                     border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? '#374151' : '#e2e8f0'});">
                            <div class="p-4">
                                <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-3">{t('advancedkey.selectedKeys', currentLanguage)}</div>
                                <div class="flex items-center justify-center gap-3">
                                    <div class="px-3 py-2 rounded-lg font-mono font-bold text-sm"
                                         style="background-color: var(--theme-color-primary); color: white;">
                                        {selectedKeys[0]}
                                    </div>
                                    <div class="flex items-center gap-1" style="color: var(--theme-color-primary);">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                        </svg>
                                    </div>
                                    <div class="px-3 py-2 rounded-lg font-mono font-bold text-sm"
                                         style="background-color: var(--theme-color-primary); color: white;">
                                        {selectedKeys[1]}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Configure Null Bind Behavior -->
                        <div class="flex flex-col">                            <p class="text-sm font-semibold leading-none tracking-tight {$darkMode ? 'text-white' : 'text-gray-900'}">
                                {t('advancedkey.configureNullBindBehavior', currentLanguage)}
                            </p>
                            <p class="mt-1 text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
                                {t('advancedkey.selectHowToResolveKeyEvents', currentLanguage)}
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
                                <div class="flex-1">                                    <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.alternativeBottomOutBehavior', currentLanguage)}</div>
                                    <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.alternativeBottomOutBehaviorDesc', currentLanguage)}</div>
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
                                    <div>                                        <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.bottomOutPoint', currentLanguage)}</div>
                                        <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.bottomOutPointDesc', currentLanguage)}</div>
                                    </div>
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{uiBottomOutPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span>
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
                                <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">                                    <span>{(actuationPoint + 0.1).toFixed(1)}{t('units.mm', currentLanguage)}</span>
                                    <span>{SWITCH_DISTANCE.toFixed(1)}{t('units.mm', currentLanguage)}</span>
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
                                    }}                                    onclick={() => activeTab = 'performance'}
                                >
                                    {t('advancedkey.performance', currentLanguage)}
                                </button><button
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
                                    {t('advancedkey.keyTester', currentLanguage)}
                                </button>
                            </nav>
                        </div>

                        <!-- Tab Content -->
                        <div class="flex-1 mt-6">
                            {#if activeTab === 'performance'}
                                <div class="flex flex-col gap-4 rounded-md border {$darkMode ? 'border-white bg-black' : 'border-gray-200 bg-white'} p-4 shadow-sm">
                                    <!-- Rapid Trigger Toggle -->
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">                                            <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.rapidTrigger', currentLanguage)}</div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.rapidTriggerDesc', currentLanguage)}</div>
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
                                            <div>                                                <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.actuationPoint', currentLanguage)}</div>
                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.actuationPointDesc', currentLanguage)}</div>
                                            </div>
                                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{uiActuationPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span>
                                        </div>
                                          <!-- Warning box for values below 0.3 -->
                                        {#if uiActuationPoint < 0.3}                                            <div class="mb-2 p-2 {$darkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-300 text-yellow-700'} border rounded-md text-xs flex items-center gap-2">
                                                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                                                <span>{t('advancedkey.keySensitivityWarning', currentLanguage)}</span>
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
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.directInput', currentLanguage)}</span>
                                            <input 
                                                type="number" 
                                                min="0.01" 
                                                max={bottomOutPoint > 0 ? bottomOutPoint - 0.1 : SWITCH_DISTANCE}
                                                step="0.01" 
                                                bind:value={uiActuationPoint}
                                                onchange={commitActuationPoint}
                                                class="w-20 px-2 py-1 text-xs border rounded {$darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}"
                                            />
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.millimeters', currentLanguage)}</span>
                                        </div>
                                        
                                        <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">                                            <span>0.01{t('units.mm', currentLanguage)}</span>
                                            <span>{(bottomOutPoint > 0 ? bottomOutPoint - 0.1 : SWITCH_DISTANCE).toFixed(1)}{t('units.mm', currentLanguage)}</span>
                                        </div>
                                    </div>

                                    <!-- Rapid Trigger Down Sensitivity (only show when enabled) -->
                                    {#if rtDown > 0}
                                        <div class="flex flex-col">
                                            <div class="flex justify-between items-center mb-2">
                                                <div>                                                    <div class="text-sm font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.rapidTriggerDownSensitivity', currentLanguage)}</div>
                                                    <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.rapidTriggerDownSensitivityDesc', currentLanguage)}</div>
                                                </div>
                                                <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{rtDown.toFixed(2)}{t('units.mm', currentLanguage)}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.01"
                                                max="1.0"
                                                step="0.01" 
                                                bind:value={rtDown}
                                                class="w-full h-2 rounded-full {$darkMode ? 'bg-gray-600' : 'bg-gray-300'} appearance-none slider-thumb"
                                            />
                                            <div class="flex justify-between text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1">                                                <span>0.01{t('units.mm', currentLanguage)}</span>
                                                <span>1.00{t('units.mm', currentLanguage)}</span>
                                            </div>
                                        </div>
                                    {/if}
                                </div>                            {:else if activeTab === 'key-tester'}
                                <div class="flex flex-col gap-4 rounded-md border {$darkMode ? 'border-white bg-black' : 'border-gray-200 bg-white'} p-4 shadow-sm">
                                    <div class="text-center">                                        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{t('advancedkey.keyTesterTitle', currentLanguage)}</h3>
                                        <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">{t('advancedkey.keyTesterDesc', currentLanguage)}</p>
                                        
                                        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                            <div class="p-6 border-2 {$darkMode ? 'border-white' : 'border-gray-300'} rounded-lg">
                                                <div class="text-2xl font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{selectedKeys[0]}</div>                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.key1', currentLanguage)}</div>
                                                {#if behavior === 1}
                                                    <div class="text-xs mt-1 font-medium" style="color: var(--theme-color-primary);">{t('advancedkey.priorityKey', currentLanguage)}</div>
                                                {/if}
                                            </div>
                                            <div class="p-6 border-2 {$darkMode ? 'border-white' : 'border-gray-300'} rounded-lg">
                                                <div class="text-2xl font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{selectedKeys[1]}</div>                                                <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.key2', currentLanguage)}</div>
                                                {#if behavior === 2}
                                                    <div class="text-xs mt-1 font-medium" style="color: var(--theme-color-primary);">{t('advancedkey.priorityKey', currentLanguage)}</div>
                                                {/if}
                                            </div>
                                        </div>
                                        
                                        <div class="mt-6 p-4 {$darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg">                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
                                                {t('advancedkey.currentBehavior', currentLanguage)} <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{getBehaviorName(behavior)}</span>
                                            </div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1">
                                                {t('advancedkey.bottomOut', currentLanguage)} <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{bottomOutPoint > 0 ? t('advancedkey.enabled', currentLanguage) : t('advancedkey.disabled', currentLanguage)}</span>
                                            </div>
                                            <div class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1">
                                                {t('advancedkey.rapidTrigger', currentLanguage)}: <span class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{rtDown > 0 ? t('advancedkey.enabled', currentLanguage) : t('advancedkey.disabled', currentLanguage)}</span>
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
    {#if configuredNullBindKeys().length > 0}
        <div class="{$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)` : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`} border-t p-6">
            <div class="max-w-7xl mx-auto">                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.configuredNullBindKeys', currentLanguage)}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredNullBindKeys().length} {configuredNullBindKeys().length === 1 ? t('advancedkey.pair', currentLanguage) : t('advancedkey.pairs', currentLanguage)}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {#each configuredNullBindKeys() as [keyId, config]}
                        {@const [x, y] = keyId.split(',').map(Number)}
                        {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}
                        {@const nullBindConfig = config as NullBindConfiguration}
                        {@const pairId = `${nullBindConfig.pairedKeys[0]}-${nullBindConfig.pairedKeys[1]}`}
                        {@const isDeleting = deletingPairs.has(pairId)}
                        {@const isNewlyAdded = newlyAddedPairs.has(pairId)}
                        <div class="group relative overflow-hidden rounded-xl border transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 {isDeleting ? 'opacity-0 scale-95 pointer-events-none' : isNewlyAdded ? 'opacity-100 scale-100 animate-fade-in' : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'}"
                             style="background: linear-gradient(135deg, 
                                     color-mix(in srgb, var(--theme-color-primary) 8%, {$darkMode ? '#1f2937' : '#ffffff'}) 0%, 
                                     color-mix(in srgb, var(--theme-color-primary) 3%, {$darkMode ? '#111827' : '#f8fafc'}) 100%);
                                     border-color: color-mix(in srgb, var(--theme-color-primary) 20%, {$darkMode ? '#374151' : '#e2e8f0'});">
                            
                            <!-- Header with key pair -->
                            <div class="p-4 border-b" 
                                 style="border-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? '#374151' : '#e2e8f0'});">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center justify-center gap-3 flex-1">
                                        <div class="px-3 py-1.5 rounded-lg font-mono font-bold text-sm"
                                             style="background-color: var(--theme-color-primary); color: white;">
                                            {nullBindConfig.pairedKeys[0]}
                                        </div>
                                        <div class="flex items-center gap-1" style="color: var(--theme-color-primary);">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                            </svg>
                                        </div>
                                        <div class="px-3 py-1.5 rounded-lg font-mono font-bold text-sm"
                                             style="background-color: var(--theme-color-primary); color: white;">
                                            {nullBindConfig.pairedKeys[1]}
                                        </div>
                                    </div>
                                    <button 
                                        class="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors ml-3"
                                        onclick={() => deleteNullBindPair(nullBindConfig.pairedKeys)}
                                        title={t('advancedkey.deletePair', currentLanguage)}
                                        aria-label={t('advancedkey.deletePair', currentLanguage)}
                                    >
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Content -->
                            <div class="p-4 space-y-3">
                                <!-- Behavior -->
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                                        <span class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-600'}">{t('advancedkey.behavior', currentLanguage)}</span>
                                    </div>
                                    <span class="text-sm font-semibold" style="color: var(--theme-color-primary);">
                                        {getBehaviorName(nullBindConfig.behavior)}
                                    </span>
                                </div>

                                <!-- Features -->
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full flex items-center justify-center"
                                             style="background-color: {nullBindConfig.bottomOutPoint > 0 ? 'var(--theme-color-primary)' : '#6b7280'};">
                                            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.bottomOut', currentLanguage)}</span>
                                            <span class="text-xs font-medium {nullBindConfig.bottomOutPoint > 0 ? ($darkMode ? 'text-white' : 'text-gray-900') : ($darkMode ? 'text-gray-400' : 'text-gray-500')}"
                                                  style="{nullBindConfig.bottomOutPoint > 0 ? 'color: var(--theme-color-primary);' : ''}">
                                                {nullBindConfig.bottomOutPoint > 0 ? t('advancedkey.on', currentLanguage) : t('advancedkey.off', currentLanguage)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 rounded-full flex items-center justify-center"
                                             style="background-color: {nullBindConfig.rtDown > 0 ? 'var(--theme-color-primary)' : '#6b7280'};">
                                            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.rapidTrigger', currentLanguage)}</span>
                                            <span class="text-xs font-medium {nullBindConfig.rtDown > 0 ? ($darkMode ? 'text-white' : 'text-gray-900') : ($darkMode ? 'text-gray-400' : 'text-gray-500')}"
                                                  style="{nullBindConfig.rtDown > 0 ? 'color: var(--theme-color-primary);' : ''}">
                                                {nullBindConfig.rtDown > 0 ? t('advancedkey.on', currentLanguage) : t('advancedkey.off', currentLanguage)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Technical details -->
                                <div class="pt-2 border-t space-y-1"
                                     style="border-color: color-mix(in srgb, var(--theme-color-primary) 10%, {$darkMode ? '#374151' : '#e2e8f0'});">
                                    <div class="flex justify-between text-xs">
                                        <span class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">Actuation</span>
                                        <span class="{$darkMode ? 'text-gray-300' : 'text-gray-700'}">{nullBindConfig.actuationPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span>
                                    </div>
                                    {#if nullBindConfig.bottomOutPoint > 0}
                                        <div class="flex justify-between text-xs">
                                            <span class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">Bottom Out</span>
                                            <span class="{$darkMode ? 'text-gray-300' : 'text-gray-700'}">{nullBindConfig.bottomOutPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span>
                                        </div>
                                    {/if}
                                    {#if nullBindConfig.rtDown > 0}
                                        <div class="flex justify-between text-xs">
                                            <span class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">RT Sensitivity</span>
                                            <span class="{$darkMode ? 'text-gray-300' : 'text-gray-700'}">{nullBindConfig.rtDown.toFixed(2)}{t('units.mm', currentLanguage)}</span>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Hover effect overlay -->
                            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                 style="background: linear-gradient(135deg, 
                                         color-mix(in srgb, var(--theme-color-primary) 5%, transparent) 0%, 
                                         color-mix(in srgb, var(--theme-color-primary) 2%, transparent) 100%);"></div>
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
    
    /* Fade-out animation for deleting pairs */
    .group {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: center;
    }
    
    /* Enhanced hover effects */
    .group:hover {
        box-shadow: 
            0 10px 25px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05),
            0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 25%, transparent);
    }
    
    :global(.dark) .group:hover {
        box-shadow: 
            0 10px 25px -3px rgba(0, 0, 0, 0.25),
            0 4px 6px -2px rgba(0, 0, 0, 0.1),
            0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 40%, transparent);
    }
    
    /* Ensure smooth animation when pairs are being deleted */
    .group.opacity-0 {
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                   transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Fade-in animation for newly added pairs */
    @keyframes fade-in {
        0% {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
        }
        100% {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fade-in 0.4s ease-out;
    }

    /* Smooth bin button transitions */
    .group button {
        transition: background-color 0.2s ease-out;
    }
</style>