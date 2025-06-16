<script lang="ts">
    import { goto } from '$app/navigation';
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import NewZellia80He from '$lib/NewZellia80HE.svelte';
    import { Zap, RotateCcw, Settings, Target } from 'lucide-svelte';
    
    // Add the missing state variable
    let currentSelectedKey = $state<[number, number] | null>(null);
    
    // Available advanced key modes
    const keyModes = [
        {
            id: 'tap-hold',
            name: 'Tap Hold',
            description: 'Different actions for tap vs hold',
            icon: Zap,
            path: '/advancedkey/routes/tap-hold',
            features: [
                'Quick tap action',
                'Hold action with configurable delay',
                'Perfect for modifier keys',
                'Customizable timing'
            ]
        },
        {
            id: 'toggle',
            name: 'Toggle',
            description: 'Toggle between two states',
            icon: RotateCcw,
            path: '/advancedkey/routes/toggle',
            features: [
                'Toggle on press or release',
                'Perfect for Caps Lock behavior',
                'State persistence',
                'Visual feedback'
            ]
        },
        {
            id: 'dynamic',
            name: 'Dynamic Key Stroke',
            description: 'Interactive keystroke configuration',
            icon: Settings,
            path: '/advancedkey/routes/dynamic',
            features: [
                '4-phase keystroke control',
                'Analog input response',
                'Multiple key bindings',
                'Advanced customization'
            ]
        },
        {
            id: 'null-bind',
            name: 'Null Bind',
            description: 'Rapid trigger with SOCD cleaning',
            icon: Target,
            path: '/advancedkey/routes/nullbind',
            features: [
                'Rapid trigger technology',
                'SOCD (Simultaneous Opposing Cardinal Directions)',
                'Perfect for gaming',
                'Ultra-responsive input'
            ]
        }
    ];

    function navigateToMode(path: string): void {
        goto(path);
    }
</script>


<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey={currentSelectedKey}
>
  {#snippet body(x, y)}
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
    <div class="flex items-center justify-between mb-6">
        <div>
            <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">Advanced Keys</h2>
            <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">Configure advanced keyboard behaviors for enhanced productivity</p>
        </div>
    </div>
    <!-- Getting Started Section -->        
        <div class="mt-6 rounded-xl p-6 border mb-4"
             style="background: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #111827)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f9fafb)'};
                    border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e7eb)'};">
            <h3 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-3">Getting Started</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                         style="background-color: var(--theme-color-primary);">1</div>
                    <div>
                        <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Select a Mode</div>
                        <div class="{$darkMode ? 'text-gray-300' : 'text-gray-600'}">Choose the advanced key behavior you want to configure</div>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                         style="background-color: var(--theme-color-primary);">2</div>
                    <div>
                        <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Select Keys</div>
                        <div class="{$darkMode ? 'text-gray-300' : 'text-gray-600'}">Click on keys in the keyboard layout to configure them</div>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                         style="background-color: var(--theme-color-primary);">3</div>
                    <div>
                        <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">Apply Settings</div>
                        <div class="{$darkMode ? 'text-gray-300' : 'text-gray-600'}">Save your configuration to the keyboard</div>
                    </div>
                </div>
            </div>
        </div>
    <div class="grid grid-cols-4 gap-6">
        {#each keyModes as mode}            <div class="group relative w-full">
                <button
                    class="w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col"
                    style="background-color: {$darkMode ? 'black' : 'white'}; 
                           border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};
                           --hover-border: var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-color-primary)'}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.borderColor = $darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'}
                    onclick={() => navigateToMode(mode.path)}
                >                    <!-- Mode Header -->
                    <div class="flex items-center gap-4 mb-4">
                        <div class="flex items-center justify-center w-10 h-10">
                            <sveltecomponent this={mode.icon} class="w-8 h-8" style="color: var(--theme-color-primary);" />
                        </div><div class="flex-1">
                            <h3 class="text-xl font-bold transition-colors"
                                style="color: {$darkMode ? 'white' : '#111827'};"
                                onmouseover={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)'}
                                onmouseout={(e) => (e.currentTarget as HTMLElement).style.color = $darkMode ? 'white' : '#111827'}>
                                {mode.name}
                            </h3>
                            <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1">{mode.description}</p>
                        </div>
                    </div>                        <div class="space-y-2 flex-1">
                            {#each mode.features as feature}
                                <div class="flex items-center gap-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                                    <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                                    <span>{feature}</span>
                                </div>
                            {/each}
                        </div>                        <!-- Action Arrow -->
                        <div class="absolute top-6 right-6 text-gray-400 transition-colors"
                            style="transition: color 0.3s ease;"
                            onmouseover={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)'}
                            onmouseout={(e) => (e.currentTarget as HTMLElement).style.color = '#9ca3af'}> 
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </button>
                </div>
            {/each}        </div>


        <!-- Info Section -->
        <div class="mt-4 text-center {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
            <p class="text-sm">
                Advanced key configurations allow you to customize how individual keys behave beyond standard typing.
                Each mode offers unique functionality to enhance your keyboard experience.
            </p>
        </div>
    </div>
