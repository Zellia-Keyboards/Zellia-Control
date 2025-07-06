<script lang="ts">    import { goto } from '$app/navigation';
    import {  KeyboardDisplayValues } from "$lib/KeyboardState.svelte";    import { darkMode } from '$lib/DarkModeStore.svelte';
    import { language, t, tPlaceholder } from '$lib/LanguageStore.svelte';
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



    function deleteKey(keyId: string): void {
        // Add fade-out animation
        deletingKeys.add(keyId);
        deletingKeys = new Set(deletingKeys);
        
        setTimeout(() => {
            resetGlobalConfiguration(keyId);
            deletingKeys.delete(keyId);
            deletingKeys = new Set(deletingKeys);
        }, 500); // Increased to match smoother animation
    }

    function resetAllConfigurations(): void {
        const keysToDelete = [...configuredTapHoldKeys.map(([keyId]) => keyId)];
        
        // Add fade-out animation for all keys
        keysToDelete.forEach(keyId => {
            deletingKeys.add(keyId);
        });
        deletingKeys = new Set(deletingKeys);
        
        setTimeout(() => {
            keysToDelete.forEach(keyId => {
                resetGlobalConfiguration(keyId);
            });
            deletingKeys.clear();
            deletingKeys = new Set(deletingKeys);
        }, 500); // Increased to match smoother animation
    }

    function applyConfiguration(): void {
        if (!CurrentSelected) return;
        const keyId = `${CurrentSelected[0]},${CurrentSelected[1]}`;
        
        // Check if this is a new key being configured
        const isNewKey = !$globalConfigurations[keyId] || $globalConfigurations[keyId].type !== 'tap-hold';
        
        updateConfiguration();
        
        // Trigger animation for newly added key
        if (isNewKey) {
            newlyAddedKeys.add(keyId);
            newlyAddedKeys = new Set(newlyAddedKeys);
            setTimeout(() => {
                newlyAddedKeys.delete(keyId);
                newlyAddedKeys = new Set(newlyAddedKeys);
            }, 600); // Increased to match smoother fade-in animation
        }
    }

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
    });    // Action categories for better organization
    const actionCategories = $derived([
        {
            name: t('advancedkey.common', currentLanguage),
            actions: keyActions.filter(action => 
                ['esc', 'enter', 'space', 'tab', 'backspace', 'delete'].includes(action.id)
            )
        },
        {
            name: t('advancedkey.modifiers', currentLanguage),
            actions: keyActions.filter(action => 
                ['ctrl', 'shift', 'alt', 'win'].includes(action.id)
            )
        },
        {
            name: t('advancedkey.function', currentLanguage),
            actions: keyActions.filter(action => 
                action.category === 'Function'
            ).slice(0, 12)
        },
        {
            name: t('advancedkey.letters', currentLanguage),
            actions: keyActions.filter(action => 
                action.category === 'Letter'
            ).slice(0, 20)
        }
    ]);

    // Animation state variables
    let deletingKeys = $state(new Set<string>());
    let newlyAddedKeys = $state(new Set<string>());
    let showConfiguredSection = $state(false);
    let sectionAnimationPlayed = $state(false);
    let previousKeyCount = $state(0);
    let lastAnimationTrigger = $state(0);

    // Get configured tap-hold keys count
    const configuredTapHoldKeys = $derived(
        Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'tap-hold')
    );

    // Calculate dynamic height for configured keys section
    const configuredKeysMaxHeight = $derived(() => {
        const keyCount = configuredTapHoldKeys.length;
        if (keyCount === 0) return '200px';
        
        // Each key item is roughly 120px (including spacing, padding, and content)
        // This matches the max-height in the animation
        const itemHeight = 120;
        const baseHeight = 80; // Header and container padding
        const bottomDeadzone = 40; // Extra space at bottom to prevent clipping
        const calculatedHeight = baseHeight + (keyCount * itemHeight) + bottomDeadzone;
        
        // Set reasonable bounds: minimum 200px, maximum 650px
        const minHeight = 200;
        const maxHeight = 650; // Increased to accommodate deadzone
            
        return `${Math.max(minHeight, Math.min(calculatedHeight, maxHeight))}px`;
    });

    // Watch for changes in configured keys to trigger animations
    $effect(() => {
        const currentCount = configuredTapHoldKeys.length;
        const currentTime = Date.now();
        
        if (currentCount > 0) {
            if (!showConfiguredSection) {
                showConfiguredSection = true;
                // Only play section animation once per appearance  
                if (!sectionAnimationPlayed || currentTime - lastAnimationTrigger > 1000) {
                    sectionAnimationPlayed = true;
                    lastAnimationTrigger = currentTime;
                }
            }
        } else {
            // Reset states when no keys are configured
            showConfiguredSection = false;
            sectionAnimationPlayed = false;
            deletingKeys.clear();
            newlyAddedKeys.clear();
        }
        
        previousKeyCount = currentCount;
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
>    <!-- Header -->
    <div class="border-b px-6 py-4" style="background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 20%, ${$darkMode ? 'white' : '#e5e5e5'});">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button 
                    class="flex items-center gap-2 {$darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors"
                    onclick={goBack}
                >                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('advancedkey.backToAdvanced', currentLanguage)}
                </button>
                <div>
                    <h1 class="text-xl font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.tapHoldTitle', currentLanguage)}</h1>
                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.tapHoldSubtitle', currentLanguage)}</p>
                </div>
            </div>            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                    style="background-color: var(--theme-color-primary); 
                           {!(CurrentSelected) ? '' : 'hover:background-color: color-mix(in srgb, var(--theme-color-primary) 85%, black);'}"
                    onclick={applyConfiguration}
                    disabled={!CurrentSelected}
                >
                    {t('advancedkey.applyConfiguration', currentLanguage)}
                </button>
                <button 
                    class="px-4 py-2 {$darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md transition-colors text-sm font-medium"
                    onclick={resetAllConfigurations}
                >
                    {t('advancedkey.resetAllTapHold', currentLanguage)}
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
                                    <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{CurrentSelected ? ($KeyboardDisplayValues[CurrentSelected[1]]?.[CurrentSelected[0]] || t('common.unknown', currentLanguage)) : t('advancedkey.noKeySelected', currentLanguage)}</span>
                                </div>                                <div>
                                    <h3 class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.selectedKey', currentLanguage)}</h3>
                                    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{t('advancedkey.position', currentLanguage)}: {CurrentSelected[0]}, {CurrentSelected[1]}</p>
                                </div>
                            </div>
                        </div>                        <div class="flex items-center gap-3">
                            <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.mode', currentLanguage)}:</span><span class="px-3 py-1 rounded-full text-sm font-medium text-white"
                                  style="background-color: var(--theme-color-primary);">
                                {t('advancedkey.tapHold', currentLanguage)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Configuration Panel -->
                    <div class="lg:col-span-2 space-y-6">                        <!-- Tap Action Selection -->                        <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">{t('advancedkey.tapAction', currentLanguage)}</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">{t('advancedkey.tapActionDesc', currentLanguage)}</p>
                            
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
                        </div>                        
                        <!-- Hold Action Selection -->                        
                         <div class="rounded-lg border p-6" style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});">
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">{t('advancedkey.holdAction', currentLanguage)}</h3>
                            <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">{t('advancedkey.holdActionDesc', currentLanguage)}</p>
                            
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
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">{t('advancedkey.tapAction', currentLanguage)} & {t('advancedkey.holdAction', currentLanguage)} {t('advancedkey.actionCategories', currentLanguage)}</h3>
                            
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
                            
                            <div class="space-y-3">                                <div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">Key</span>
                                    <span class="font-mono font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{CurrentSelected ? ($KeyboardDisplayValues[CurrentSelected[1]]?.[CurrentSelected[0]] || t('common.unknown', currentLanguage)) : t('advancedkey.noKeySelected', currentLanguage)}</span>
                                </div><div class="flex justify-between items-center py-2 {$darkMode ? 'border-gray-700' : 'border-gray-100'} border-b">
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
                            <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{t('advancedkey.howItWorks', currentLanguage)}</h3>
                            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-800'} space-y-2">
                                <p>• {tPlaceholder('advancedkey.quickTap', currentLanguage, tapTimeout.toString())}: <strong>{keyActions.find(k => k.id === tapAction)?.name || tapAction}</strong></p>
                                <p>• {tPlaceholder('advancedkey.holdOver', currentLanguage, holdDelay.toString())}: <strong>{keyActions.find(k => k.id === holdAction)?.name || holdAction}</strong></p>
                                <p class="mt-3 text-xs">{t('advancedkey.tapHoldDescription', currentLanguage)}</p>
                            </div>                        </div>
                        

                        
                        <!-- Configured Keys Summary -->
                        {#if showConfiguredSection}
                            <div 
                                class="rounded-lg border p-6 {sectionAnimationPlayed ? 'animate-section-fade-in' : ''}" 
                                style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});"
                            >
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('advancedkey.configuredTapHold', currentLanguage)}</h3>
                                    <span class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">{configuredTapHoldKeys.length} {configuredTapHoldKeys.length !== 1 ? t('advancedkey.keysCountPlural', currentLanguage) : t('advancedkey.keysCount', currentLanguage)}</span>
                                </div>
                                <div class="space-y-3 mb-6">
                                    {#each configuredTapHoldKeys as [keyId, config] (keyId)}
                                        {@const [x, y] = keyId.split(',').map(Number)}
                                        {@const keyName = $KeyboardDisplayValues[y]?.[x] || t('common.unknown', currentLanguage)}
                                        {@const tapHoldConfig = config as TapHoldConfiguration}
                                        {@const isDeleting = deletingKeys.has(keyId)}
                                        {@const isNewlyAdded = newlyAddedKeys.has(keyId)}
                                        <div 
                                            class="p-3 rounded-lg border transform transition-all duration-500 ease-out {isDeleting ? 'animate-fade-out' : ''} {isNewlyAdded ? 'animate-fade-in' : ''}" 
                                            style="background-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${$darkMode ? 'black' : 'white'}); border-color: color-mix(in srgb, var(--theme-color-primary) 25%, ${$darkMode ? 'white' : '#e5e5e5'});"
                                        >
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="font-mono font-bold {$darkMode ? 'text-white' : 'text-gray-900'} text-sm">{keyName}</span>
                                                <button 
                                                    class="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
                                                    onclick={() => deleteKey(keyId)}
                                                    title={t('common.delete', currentLanguage)}
                                                    aria-label={t('common.delete', currentLanguage)}
                                                >
                                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div class="text-xs space-y-1">
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.tap', currentLanguage)}:</span>
                                                    <span class="font-medium" style="color: var(--theme-color-primary);">{keyActions.find(k => k.id === tapHoldConfig.tapAction)?.name || tapHoldConfig.tapAction}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.hold', currentLanguage)}:</span>
                                                    <span class="font-medium" style="color: color-mix(in srgb, var(--theme-color-primary) 80%, green);">{keyActions.find(k => k.id === tapHoldConfig.holdAction)?.name || tapHoldConfig.holdAction}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="{$darkMode ? 'text-gray-400' : 'text-gray-600'}">{t('advancedkey.holdDelay', currentLanguage)}:</span>
                                                    <span class="{$darkMode ? 'text-gray-300' : 'text-gray-700'}">{tapHoldConfig.holdDelay}{t('advancedkey.milliseconds', currentLanguage)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
        <!-- No Key Selected State -->
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center max-w-md mx-auto">
                    <div class="w-24 h-24 {$darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-12 h-12 {$darkMode ? 'text-gray-400' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>                    <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{t('advancedkey.noKeySelected', currentLanguage)}</h3>
                    <p class="{$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">{t('advancedkey.selectKeyToConfig', currentLanguage)}</p>
                    <div class="{$darkMode ? 'bg-gray-900 border-gray-600 text-gray-300' : 'bg-blue-50 border-blue-200 text-blue-700'} border rounded-lg p-4 text-sm">
                        <strong>{t('advancedkey.tip', currentLanguage)}:</strong> {t('advancedkey.tapHoldTip', currentLanguage)}
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

    /* Animation styles */
    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        50% {
            opacity: 0.3;
            transform: translateY(-10px) scale(0.98);
        }
        100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
    }

    @keyframes sectionFadeIn {
        0% {
            opacity: 0;
            transform: translateY(-15px);
            max-height: 0;
        }
        100% {
            opacity: 1;
            transform: translateY(0);
            max-height: 1000px;
        }
    }

    .animate-fade-in {
        animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .animate-fade-out {
        animation: fadeOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    .animate-section-fade-in {
        animation: sectionFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
</style>