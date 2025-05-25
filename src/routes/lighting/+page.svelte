<script lang="ts">
    import { CurrentSelected, KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    
    let selectedEffect = $state('static');
    let brightness = $state(100); // Frontend display value (0-100)
    let speed = $state(50);
    let direction = $state('left-to-right');
    let staticColor = $state('#ff0000');
    let gradientColors = $state(['#ff0000', '#00ff00', '#0000ff']);
    let selectedLayer = $state(1);
    let perKeyMode = $state(false);
    let selectedKeys = $state(new Set());
    let keyColor = $state('#ffffff');
    
    // Convert frontend brightness (0-100) to hardware brightness (0-70)
    function getHardwareBrightness(frontendBrightness: number): number {
        return Math.round((frontendBrightness / 100) * 70);
    }
    
    // Convert hardware brightness (0-70) to frontend brightness (0-100)
    function getFrontendBrightness(hardwareBrightness: number): number {
        return Math.round((hardwareBrightness / 70) * 100);
    }
    
    const effects = [
        { id: 'static', name: 'Static', description: 'Single solid color' },
        { id: 'breathing', name: 'Breathing', description: 'Smooth fade in and out' },
        { id: 'wave', name: 'Wave', description: 'Color wave across keyboard' },
        { id: 'ripple', name: 'Ripple', description: 'Ripple effect on keypress' },
        { id: 'rainbow', name: 'Rainbow', description: 'Cycling rainbow colors' },
        { id: 'reactive', name: 'Reactive', description: 'Color change on keypress' },
        { id: 'spectrum', name: 'Spectrum', description: 'Color spectrum cycling' },
        { id: 'gradient', name: 'Gradient', description: 'Custom color gradient' }
    ];
    
    const directions = [
        { id: 'left-to-right', name: 'Left to Right' },
        { id: 'right-to-left', name: 'Right to Left' },
        { id: 'top-to-bottom', name: 'Top to Bottom' },
        { id: 'bottom-to-top', name: 'Bottom to Top' },
        { id: 'center-out', name: 'Center Out' },
        { id: 'outside-in', name: 'Outside In' }
    ];
    
    function hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function addGradientColor() {
        gradientColors = [...gradientColors, '#ffffff'];
    }
    
    function removeGradientColor(index: number) {
        gradientColors = gradientColors.filter((_, i) => i !== index);
    }
    
    function toggleKeySelection() {
        if ($CurrentSelected) {
            const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
            if (selectedKeys.has(keyId)) {
                selectedKeys.delete(keyId);
            } else {
                selectedKeys.add(keyId);
            }
            selectedKeys = new Set(selectedKeys);
        }
    }
    
    function applyToSelectedKeys() {
        // Apply current color to selected keys
        console.log('Applying color to selected keys:', selectedKeys);
    }
    
    function clearKeySelection() {
        selectedKeys.clear();
        selectedKeys = new Set(selectedKeys);
    }
    
    function applySettings() {
        const hardwareBrightness = getHardwareBrightness(brightness);
        
        console.log('Applying lighting settings:', {
            effect: selectedEffect,
            brightness: hardwareBrightness, // Send hardware value (0-70)
            frontendBrightness: brightness, // For reference (0-100)
            speed,
            direction,
            staticColor,
            gradientColors,
            layer: selectedLayer
        });
    }
</script>

<div class="p-4 h-full flex flex-col">
    <div class="flex items-center justify-between -mt-4 mb-4">
        <h2 class="text-2xl font-bold">Lighting</h2>
        <div class="flex gap-2">
            <button 
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                on:click={applySettings}
            >
                Apply Settings
            </button>
            <button 
                class="bg-gray-200 text-gray-600 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                on:click={() => perKeyMode = !perKeyMode}
            >
                {perKeyMode ? 'Exit Per-Key Mode' : 'Per-Key Mode'}
            </button>
        </div>
    </div>
    
    <div class="bg-white rounded-xl shadow p-6 flex flex-col lg:flex-row gap-6 flex-1">
        <!-- Effects Panel -->
        <div class="flex-1 min-w-[300px]">
            <h3 class="text-lg font-medium mb-4">Lighting Effects</h3>
            <div class="grid grid-cols-2 gap-3 mb-6">
                {#each effects as effect}
                    <button
                        class="p-3 rounded-lg border-2 text-left transition-all duration-200 {selectedEffect === effect.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}"
                        on:click={() => selectedEffect = effect.id}
                    >
                        <div class="font-medium">{effect.name}</div>
                        <div class="text-sm text-gray-600">{effect.description}</div>
                    </button>
                {/each}
            </div>
            
            <!-- Global Controls -->
            <div class="space-y-4">
                <!-- Brightness -->
                <div>
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Brightness</span>
                        <span>{brightness}% <span class="text-xs text-gray-400"></span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        bind:value={brightness}
                        class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
                    />
                </div>
                
                <!-- Speed (for animated effects) -->
                {#if ['breathing', 'wave', 'rainbow', 'spectrum'].includes(selectedEffect)}
                    <div>
                        <div class="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Speed</span>
                            <span>{speed}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            bind:value={speed}
                            class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
                        />
                    </div>
                {/if}
                
                <!-- Direction (for directional effects) -->
                {#if ['wave', 'gradient', 'spectrum'].includes(selectedEffect)}
                    <div>
                        <label class="block text-sm text-gray-600 mb-2">Direction</label>
                        <select 
                            bind:value={direction}
                            class="w-full p-2 border border-gray-300 rounded-lg"
                        >
                            {#each directions as dir}
                                <option value={dir.id}>{dir.name}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </div>
        </div>
        
        <!-- Divider -->
        <div class="hidden lg:block w-px bg-gray-200"></div>
        
        <!-- Color Controls Panel -->
        <div class="flex-1 min-w-[300px]">
            <h3 class="text-lg font-medium mb-4">Color Settings</h3>
            
            {#if perKeyMode}
                <!-- Per-Key Color Mode -->
                <div class="space-y-4">
                    <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div class="font-medium text-blue-800">Per-Key Mode Active</div>
                        <div class="text-sm text-blue-600">Click keys on the keyboard to select them</div>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-600 mb-2">Key Color</label>
                        <div class="flex gap-2">
                            <input 
                                type="color" 
                                bind:value={keyColor}
                                class="w-12 h-10 rounded border border-gray-300"
                            />
                            <input 
                                type="text" 
                                bind:value={keyColor}
                                class="flex-1 p-2 border border-gray-300 rounded-lg font-mono"
                                placeholder="#ffffff"
                            />
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button 
                            class="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
                            on:click={toggleKeySelection}
                            disabled={!$CurrentSelected}
                        >
                            {$CurrentSelected && selectedKeys.has(`${$CurrentSelected[0]},${$CurrentSelected[1]}`) ? 'Deselect Key' : 'Select Key'}
                        </button>
                        <button 
                            class="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                            on:click={clearKeySelection}
                        >
                            Clear ({selectedKeys.size})
                        </button>
                    </div>
                    
                    <button 
                        class="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                        on:click={applyToSelectedKeys}
                        disabled={selectedKeys.size === 0}
                    >
                        Apply to Selected Keys
                    </button>
                </div>
            {:else}
                <!-- Effect-based Color Controls -->
                {#if selectedEffect === 'static' || selectedEffect === 'breathing' || selectedEffect === 'reactive'}
                    <div>
                        <label class="block text-sm text-gray-600 mb-2">Color</label>
                        <div class="flex gap-2">
                            <input 
                                type="color" 
                                bind:value={staticColor}
                                class="w-12 h-10 rounded border border-gray-300"
                            />
                            <input 
                                type="text" 
                                bind:value={staticColor}
                                class="flex-1 p-2 border border-gray-300 rounded-lg font-mono"
                                placeholder="#ff0000"
                            />
                        </div>
                        {#if hexToRgb(staticColor)}
                            {@const rgb = hexToRgb(staticColor)}
                            {#if rgb}
                                <div class="text-xs text-gray-600">
                                    RGB: {rgb.r}, {rgb.g}, {rgb.b}
                                </div>
                            {/if}
                        {/if}
                    </div>
                {:else if selectedEffect === 'gradient'}
                    <div>
                        <label class="block text-sm text-gray-600 mb-2">Gradient Colors</label>
                        <div class="space-y-2">
                            {#each gradientColors as color, index}
                                <div class="flex gap-2 items-center">
                                    <input 
                                        type="color" 
                                        bind:value={gradientColors[index]}
                                        class="w-10 h-8 rounded border border-gray-300"
                                    />
                                    <input 
                                        type="text" 
                                        bind:value={gradientColors[index]}
                                        class="flex-1 p-1 border border-gray-300 rounded text-sm font-mono"
                                    />
                                    {#if gradientColors.length > 2}
                                        <button 
                                            class="w-8 h-8 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                                            on:click={() => removeGradientColor(index)}
                                        >×</button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                        <button 
                            class="mt-2 w-full bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 transition-colors"
                            on:click={addGradientColor}
                        >
                            Add Color
                        </button>
                    </div>
                {:else}
                    <div class="p-4 bg-gray-50 rounded-lg text-center">
                        <div class="text-gray-600">
                            {selectedEffect === 'rainbow' || selectedEffect === 'spectrum' ? 'This effect uses automatic colors' : 'No color settings needed for this effect'}
                        </div>
                    </div>
                {/if}
            {/if}
            
            <!-- Preview -->
            <div class="mt-6">
                <label class="block text-sm text-gray-600 mb-2">Preview</label>
                <div class="h-16 rounded-lg border border-gray-300 flex items-center justify-center" 
                     style:background={selectedEffect === 'static' ? staticColor : selectedEffect === 'gradient' ? `linear-gradient(90deg, ${gradientColors.join(', ')})` : '#f3f4f6'}>
                    {#if selectedEffect === 'rainbow' || selectedEffect === 'spectrum'}
                        <div class="text-sm text-gray-600">Animated Effect</div>
                    {:else if selectedEffect === 'reactive' || selectedEffect === 'ripple'}
                        <div class="text-sm text-gray-600">Reactive Effect</div>
                    {/if}
                </div>
            </div>
        </div>
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
        background: #2563eb;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .slider-thumb::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #2563eb;
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
</style>