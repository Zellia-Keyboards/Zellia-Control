<script lang="ts">
    import "../app.css";
    import Zellia80HE from "../lib/Zellia80HE.svelte";
    import { KeyboardDisplayValues, CurrentSelected } from "$lib/KeyboardState.svelte";
    import { page } from '$app/stores';

    const NAVIGATE = [
        //["/test", "Test", "🧪"],
        ["/performance", "Performance", "⚡"],
        ["/remap", "Remap", "⌨️"],
        ["/lighting", "Lighting", "💡"],
        ["/advancedkey", "Advanced Keys", "🔧"],
        ["/calibration", "Calibration", "⚖️"],
        ["/debug", "Debug", "🐛"],
        ["/settings", "Settings", "⚙️"],
        ["/about", "About", "ℹ️"],
    ];

    let { children } = $props();
    let selectedLayer = $state(1);
    let showDropdown = $state(false);

    // Function to check if a navigation item is active
    function isActive(href: string): boolean {
        return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
    }
</script>

<!-- Small Screen Warning (follows codebase theme) -->
<div class="xl:hidden fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
    <div class="max-w-2xl mx-4">
        <!-- Main Warning Card -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <!-- Icon and Title -->
            <div class="flex items-center justify-center mb-6">
                <div class="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Display Too Small</h2>
            <p class="text-gray-600 mb-6 leading-relaxed">
                Zellia Control requires a larger display for the optimal keyboard configuration experience. 
                Please use a desktop or laptop computer, or expand your browser window.
            </p>
            
            <!-- Requirements Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div class="flex items-center gap-3 text-blue-800">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="text-sm font-medium">
                        Minimum recommended width: 1280px
                    </div>
                </div>
            </div>
            
            <!-- Features that require larger screen -->
            <div class="text-left space-y-3 mb-6">
                <h3 class="text-lg font-medium text-gray-900 text-center mb-4">Features requiring larger display:</h3>
                <div class="grid grid-cols-1 gap-3">
                    <div class="flex items-center gap-3 text-sm text-gray-700">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span>Keyboard layout visualization</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-gray-700">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span>Advanced key configuration panels</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-gray-700">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span>Performance tuning controls</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-gray-700">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span>Lighting configuration interface</span>
                    </div>
                </div>
            </div>
            
            <!-- Action Button -->
            <div class="flex justify-center">
                <button 
                    class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-sm"
                    onclick={() => window.location.reload()}
                >
                    Retry After Resizing
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Main Application (hidden on small screens) -->
<div class="hidden xl:flex h-screen bg-gray-50">
    <!-- Sidebar -->
    <div class="flex flex-col w-52 bg-white shadow-lg h-full overflow-y-auto border-r border-gray-200">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100">
            <h1 class="font-bold text-xl text-gray-900 text-center">Zellia Control</h1>
        </div>
        
        <!-- Sync Button -->
        <div class="flex justify-center mb-4 mt-2">
            <button class="bg-indigo-200 px-18 py-2 rounded-4xl font-bold hover:bg-indigo-400 hover:text-white transition-colors duration-200 shadow w-auto">Sync</button>
        </div>
        
        <!-- Profile Section -->
        <div class="px-3 pb-3 border-b border-gray-100">
            <!-- Profile Dropdown -->
            <div class="relative mb-2">
                <button 
                    class="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200" 
                    onclick={() => showDropdown = !showDropdown}
                >
                    <span>Profiles</span>
                    <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                
                {#if showDropdown}
                    <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div class="p-3 text-sm text-gray-600">No profiles available</div>
                    </div>
                {/if}
            </div>
            
            <!-- Import/Export Buttons -->
            <div class="grid grid-cols-2 gap-2">
                <button class="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors duration-200">
                    Import
                </button>
                <button class="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors duration-200">
                    Export
                </button>
            </div>
        </div>
        
        <!-- Navigation -->
        <div class="flex-1 p-3">
            <nav class="space-y-1">
                {#each NAVIGATE as [href, name, icon]}
                    <a 
                        {href} 
                        class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {isActive(href) 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'}"
                    >
                        <span class="text-base">{icon}</span>
                        <span>{name}</span>
                    </a>
                {/each}
            </nav>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col gap-4 px-4 overflow-y-auto">
        <div class="flex items-center -mb-3">
            <div class="flex items-center gap-2 px-4 py-2">
                <span class="font-semibold text-gray-700 mr-2">Layer:</span>
                {#each [1, 2, 3, 4] as layer}
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-lg border-2 font-bold text-lg transition-colors duration-200 focus:outline-none {selectedLayer === layer ? 'bg-indigo-500 text-white border-indigo-700' : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-100'}"
                        onclick={() => selectedLayer = layer}
                    >
                        {layer}
                    </button>
                {/each}
            </div>
        </div>
        <!-- Global keyboard layout -->
        <div class="flex justify-center">
            <Zellia80HE
                onClick={(x, y) => {
                    console.log(`Clicked on ${x}, ${y}`);
                    $CurrentSelected = [x, y];
                }}
                values={$KeyboardDisplayValues}
            />
        </div>
        <!-- Component for adjust part -->
        <div class="bg-white rounded-2xl shadow p-4 mt-2 mb-4 grow">
            {@render children()}
        </div>
    </div>
</div>

<style lang="postcss">
    @reference "tailwindcss";
    :global(html) {
        background-color: theme(--color-gray-50);
    }
</style>