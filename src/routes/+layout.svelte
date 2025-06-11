<script lang="ts">
    import "../app.css";
    import Zellia80HE from "../lib/Zellia80HE.svelte";    
    import { KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { page } from '$app/stores';
    import { darkMode, selectedThemeColor, themeColors, type ThemeColorName } from '$lib/DarkModeStore.svelte';
    import {Palette, Sun, Moon} from 'lucide-svelte';   
     
    const NAVIGATE = [
        ["/performance", "Performance"],
        ["/remap", "Remap"],
        ["/lighting", "Lighting"],
        ["/advancedkey", "Advanced Keys"],
        ["/calibration", "Calibration"],
        ["/debug", "Debug"],
        ["/settings", "Settings"],
        ["/about", "About"],
    ];let { children } = $props();
    let selectedLayer = $state(1);
    let showDropdown = $state(false);
    let showThemeSelector = $state(false);
    let currentTheme = $state<ThemeColorName>('indigo');

    selectedThemeColor.subscribe(value => {
        currentTheme = value;
    });

    function setTheme(colorName: ThemeColorName) {
        selectedThemeColor.set(colorName);
    }

    // Function to check if a navigation item is active
    function isActive(href: string): boolean {
        return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
    }
</script>

<!-- Small Screen Warning (follows codebase theme) -->
<div class="xl:hidden fixed inset-0 flex items-center justify-center z-50 {$darkMode ? 'bg-black' : 'bg-gray-50'}">
    <div class="max-w-2xl mx-4">
        <!-- Main Warning Card -->
        <div class="{$darkMode ? 'bg-black border-gray-600 text-white' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-8 text-center">
            <!-- Icon and Title -->
            <div class="flex items-center justify-center mb-6">
                <div class="w-16 h-16 {$darkMode ? 'bg-white' : 'bg-indigo-100'} rounded-xl flex items-center justify-center">
                    <svg class="w-8 h-8 {$darkMode ? 'text-black' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Display Too Small</h2>
            <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed">
                Zellia Control requires a larger display for the optimal keyboard configuration experience. 
                Please use a desktop or laptop computer, or expand your browser window.
            </p>
            
            <!-- Requirements Info -->
            <div class="{$darkMode ? 'bg-white border-gray-400' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6">
                <div class="flex items-center gap-3 {$darkMode ? 'text-black' : 'text-blue-800'}">
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
                <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} text-center mb-4">Features requiring larger display:</h3>
                <div class="grid grid-cols-1 gap-3">
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full {$darkMode ? 'bg-white' : 'bg-indigo-500'}"></div>
                        <span>Keyboard layout visualization</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full {$darkMode ? 'bg-white' : 'bg-indigo-500'}"></div>
                        <span>Advanced key configuration panels</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full {$darkMode ? 'bg-white' : 'bg-indigo-500'}"></div>
                        <span>Performance tuning controls</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full {$darkMode ? 'bg-white' : 'bg-indigo-500'}"></div>
                        <span>Lighting configuration interface</span>
                    </div>
                </div>
            </div>
            
            <!-- Action Button -->
            <div class="flex justify-center">
                <button 
                    class="{$darkMode ? 'bg-white hover:bg-gray-200 text-black' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-sm"
                    onclick={() => window.location.reload()}
                >
                    Retry After Resizing
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Main Application (hidden on small screens) -->
<div class="hidden xl:flex h-screen {$darkMode ? 'bg-black' : 'bg-gray-50'}">
    <!-- Sidebar -->
    <div class="flex flex-col w-52 {$darkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} shadow-lg h-full overflow-y-auto border-r">
        <!-- Header -->
        <div class="p-4">
            <h1 class="font-bold text-xl {$darkMode ? 'text-white' : 'text-gray-900'} text-center">Zellia Control</h1>
        </div>
          <!-- Sync Button -->
        <div class="flex justify-center mb-4 mt-2">
            <button 
                class="px-18 py-2 rounded-4xl font-bold transition-colors duration-200 shadow w-auto"
                style="background-color: var(--theme-color-primary); color: white;"
                onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
            >Sync</button>
        </div>
        
        <!-- Profile Section -->
        <div class="px-3 pb-3 border-b {$darkMode ? 'border-gray-600' : 'border-gray-100'}">
            <!-- Profile Dropdown -->
            <div class="relative mb-2">
                <button 
                    class="flex items-center justify-between w-full px-3 py-2 text-sm font-medium {$darkMode ? 'text-white bg-black border-gray-600 hover:bg-gray-900' : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'} border rounded-lg transition-colors duration-200" 
                    onclick={() => showDropdown = !showDropdown}
                >
                    <span>Profiles</span>
                    <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                
                {#if showDropdown}
                    <div class="absolute top-full left-0 right-0 mt-1 {$darkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-10">
                        <div class="p-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">No profiles available</div>
                    </div>
                {/if}
            </div>
              <!-- Import/Export Buttons -->
            <div class="grid grid-cols-2 gap-2">
                <button 
                    class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent"
                    style="background-color: var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                >
                    Import
                </button>
                <button 
                    class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent"
                    style="background-color: var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                >
                    Export
                </button>
            </div>
        </div>
          <!-- Navigation -->
        <div class="flex-1 p-3">
            <nav class="space-y-1">                
                {#each NAVIGATE as [href, name]}                    
                <a 
                        {href} 
                        class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {isActive(href) 
                            ? 'text-white shadow-sm'
                            : ($darkMode ? 'text-white hover:bg-gray-900 hover:text-white' : 'text-gray-700')}"
                        style={isActive(href) ? `background-color: var(--theme-color-primary);` : ''}
                        onmouseover={(e) => {
                            if (!isActive(href)) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                                if (!$darkMode) {
                                    (e.currentTarget as HTMLElement).style.color = `var(--theme-color-primary)`;
                                }
                            }
                        }}
                        onmouseout={(e) => {
                            if (!isActive(href)) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = '';
                                if (!$darkMode) {
                                    (e.currentTarget as HTMLElement).style.color = '';
                                }
                            }
                        }}
                    >
                        <span>{name}</span>
                    </a>
                {/each}
            </nav>
        </div>
          <!-- Theme Selector -->
        <div class="p-3 border-t {$darkMode ? 'border-gray-600' : 'border-gray-200'}">
            <!-- Theme Button -->
            <button 
                class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$darkMode ? 'text-white hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'}"
                onclick={() => showThemeSelector = !showThemeSelector}            >
                <div class="flex items-center gap-3">
                    <Palette class="w-4 h-4" />
                    <span>Theme Colors</span>
                </div>
                <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showThemeSelector ? 'rotate(180deg)' : 'rotate(0deg)'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            
            <!-- Color Squares (collapsible) -->
            {#if showThemeSelector}
                <div class="grid grid-cols-4 gap-2 mt-2">
                    {#each Object.entries(themeColors) as [name, color] (name)}
                        <button 
                            title={name.charAt(0).toUpperCase() + name.slice(1)}
                            class="w-full h-7 rounded border transition-all duration-150 
                                   {currentTheme === name ? ($darkMode ? 'border-white ring-1 ring-white' : 'border-black ring-1 ring-gray-400') : ($darkMode ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-500')}"
                            style="background-color: {color};"
                            onclick={() => setTheme(name as ThemeColorName)}
                        ></button>
                    {/each}
                </div>
            {/if}
        </div>        
        <!-- Dark Mode Toggle at Bottom -->
        <div class="p-3 border-t border-transparent">            <button
                class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$darkMode ? 'text-white hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'}"
                onclick={() => darkMode.toggle()}
            >
                {#if $darkMode}
                    <Sun class="w-4 h-4" />
                    <span>Light Mode</span>
                {:else}
                    <Moon class="w-4 h-4" />
                    <span>Dark Mode</span>
                {/if}
            </button>
        </div>
    </div><!-- Main Content -->    <div 
        class="flex-1 flex flex-col gap-4 px-4 overflow-y-scroll"
        style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 3%, #030712)` : `color-mix(in srgb, var(--theme-color-primary) 5%, white)`};"    ><!-- Layer selector (hidden on about page) -->
        {#if $page.url.pathname !== '/about'}
        <div class="flex items-center -mb-3">
            <div class="flex items-center gap-2 px-4 py-2">
                <span class="font-semibold {$darkMode ? 'text-white' : 'text-gray-700'} mr-2">Layer:</span>                {#each [1, 2, 3, 4] as layer}
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-lg transition-colors duration-200 focus:outline-none {selectedLayer === layer ? 'text-white' : ($darkMode ? 'bg-black text-white border-gray-600 hover:bg-gray-900' : '')}"
                        style={selectedLayer === layer ? `background-color: var(--theme-color-primary); border-color: color-mix(in srgb, var(--theme-color-primary) 70%, black);` : (selectedLayer !== layer ? `background-color: ${$darkMode ? 'black' : 'white'}; border-color: color-mix(in srgb, var(--theme-color-primary) 30%, ${$darkMode ? 'black' : 'white'}); color: var(--theme-color-primary);` : '')}
                        onmouseover={(e) => {
                            if (selectedLayer !== layer) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 15%, white)`;
                            }
                        }}
                        onmouseout={(e) => {
                            if (selectedLayer !== layer) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? 'black' : 'white';
                            }
                        }}
                        onclick={() => selectedLayer = layer}
                    >
                        {layer}
                    </button>
                {/each}
            </div>        </div>
        {/if}
        <!-- Component for adjust part -->
        
            {@render children()} 
    </div>
</div>

<style lang="postcss">
    @reference "tailwindcss";
    :global(html) {
        background-color: theme(--color-gray-50);
        --theme-color-primary: #6366F1; /* Default Indigo, will be overridden */
    }
    :global(html.dark) {
        background-color: #000000; /* Ensure body background for dark mode is pure black if needed */
    }
</style>