<script lang="ts">
    import { goto } from '$app/navigation';
    import { CurrentSelected, KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { 
        globalConfigurations,
        updateGlobalConfiguration, 
        resetGlobalConfiguration,
        keyActions,
        DKSAction,
        type KeyConfiguration 
    } from "../../../../lib/AdvancedKeyShared";

    // Define the dynamic keystroke specific configuration type
    type DynamicKeystrokeConfiguration = {
        type: 'dynamic';
        keycodes: string[];
        bitmap: DKSAction[][];
        bottomOutPoint: number;
    };

    let selectedKeycodes = $state(['esc', 'enter', 'space', 'backspace']);
    let selectedBitmaps = $state([
        [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
        [DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
        [DKSAction.PRESS, DKSAction.PRESS, DKSAction.HOLD, DKSAction.RELEASE],
        [DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD]
    ]);
    let bottomOutPoint = $state(4.0);
    let selectedBindingIndex = $state<number | null>(null);
    let activeTab = $state('bindings');

    // UI state for each slider
    let uiBitmaps = $state([...selectedBitmaps]);

    // Slider constants
    const NODE_SIZE = 32;
    const NODE_SPACING = 40;
    const SLIDER_GAP = 72;
    const SLIDER_WIDTH = SLIDER_GAP * 3 + NODE_SIZE;
    const SLIDER_HEIGHT = NODE_SIZE;
    const NODE_TOP = SLIDER_HEIGHT / 2 - NODE_SIZE / 2;
    const GRIP_WIDTH = 12;
    const GRIP_HEIGHT = 16;
    const GRIP_OFFSET = NODE_SIZE - 10;
    const GRIP_TOP = SLIDER_HEIGHT / 2 - GRIP_HEIGHT / 2;

    const nodeLeft = (i: number) => SLIDER_GAP * i;

    function getIntervals(bitmap: DKSAction[]): [number, number][] {
        const intervals: [number, number][] = [];
        let start = -1;
        
        for (let i = 0; i < 4; i++) {
            if (bitmap[i] === DKSAction.HOLD) {
                continue;
            }
            if (start !== -1) {
                intervals.push([start, i]);
                start = -1;
            }
            if (bitmap[i] === DKSAction.PRESS) {
                start = i;
            } else if (bitmap[i] === DKSAction.TAP) {
                intervals.push([i, i]);
            }
        }
        
        return intervals;
    }

    const intervalWidth = ([l, r]: [number, number]) =>
        l === r ? 0 : SLIDER_GAP * (r - l) - NODE_SPACING;

    function updateBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
        selectedBitmaps[bindingIndex] = bitmap;
        selectedBitmaps = [...selectedBitmaps];
        uiBitmaps[bindingIndex] = [...bitmap];
        uiBitmaps = [...uiBitmaps];
    }

    function setUIBitmap(bindingIndex: number, bitmap: DKSAction[]): void {
        uiBitmaps[bindingIndex] = bitmap;
        uiBitmaps = [...uiBitmaps];
    }

    // Delete interval functionality
    function deleteInterval(bindingIndex: number, intervalStart: number): void {
        const bitmap = [...uiBitmaps[bindingIndex]];
        const intervals = getIntervals(bitmap);
        const interval = intervals.find(([l]) => l === intervalStart);
        
        if (interval) {
            const [start, end] = interval;
            for (let j = start + 1; j < end; j++) {
                bitmap[j] = DKSAction.HOLD;
            }
            if (bitmap[end] === DKSAction.RELEASE) {
                bitmap[end] = DKSAction.HOLD;
            }
            bitmap[start] = intervals.some(([l, r]) => l !== r && r === start) 
                ? DKSAction.RELEASE 
                : DKSAction.HOLD;
        }
        
        updateBitmap(bindingIndex, bitmap);
    }

    // Drag functionality
    function handleDrag(bindingIndex: number, nodeIndex: number, deltaX: number): void {
        const bitmap = [...uiBitmaps[bindingIndex]];
        const intervals = getIntervals(selectedBitmaps[bindingIndex]);
        const interval = intervals.find(([l]) => l === nodeIndex) ?? [nodeIndex, -1];
        const upperBound = intervals.find(([l]) => l > nodeIndex)?.[0] ?? 3;

        const clampedX = Math.max(
            0,
            Math.min(
                deltaX + (interval[1] === -1 ? 0 : intervalWidth(interval)),
                intervalWidth([nodeIndex, upperBound])
            )
        );

        let closest = nodeIndex;
        let closestDistance = clampedX;
        for (let j = nodeIndex + 1; j <= upperBound; j++) {
            const distance = Math.abs(clampedX - intervalWidth([nodeIndex, j]));
            if (distance < closestDistance) {
                closest = j;
                closestDistance = distance;
            }
        }

        bitmap[nodeIndex] = nodeIndex === closest ? DKSAction.TAP : DKSAction.PRESS;
        
        for (let j = nodeIndex + 1; j < Math.max(interval[1], closest); j++) {
            bitmap[j] = DKSAction.HOLD;
        }
        
        if (interval[1] !== -1 && bitmap[interval[1]] === DKSAction.RELEASE) {
            bitmap[interval[1]] = DKSAction.HOLD;
        }
        
        if (bitmap[closest] === DKSAction.HOLD) {
            bitmap[closest] = DKSAction.RELEASE;
        }

        setUIBitmap(bindingIndex, bitmap);
    }

    function commitDrag(bindingIndex: number): void {
        updateBitmap(bindingIndex, uiBitmaps[bindingIndex]);
    }

    // Click to create interval
    function handleNodeClick(bindingIndex: number, nodeIndex: number): void {
        const bitmap = [...selectedBitmaps[bindingIndex]];
        const uiBitmap = [...uiBitmaps[bindingIndex]];
        const intervals = getIntervals(bitmap);
        
        // Check if this node is in the middle of an interval
        if (intervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
            return; // Can't click on nodes in the middle of intervals
        }

        if (bitmap[nodeIndex] === DKSAction.HOLD) {
            // Create new interval
            bitmap[nodeIndex] = DKSAction.TAP;
            uiBitmap[nodeIndex] = DKSAction.TAP;
        } else {
            // Remove existing interval
            const interval = intervals.find(([l, r]) => l <= nodeIndex && nodeIndex <= r);
            if (interval) {
                const [start, end] = interval;
                for (let i = start; i <= end && i < 4; i++) {
                    bitmap[i] = DKSAction.HOLD;
                    uiBitmap[i] = DKSAction.HOLD;
                }
            }
        }

        updateBitmap(bindingIndex, bitmap);
    }

    // Mouse tracking for drag functionality
    let dragState = $state<{
        isDragging: boolean;
        bindingIndex: number;
        nodeIndex: number;
        startX: number;
        startMouseX: number;
    } | null>(null);

    function handleMouseDown(event: MouseEvent, bindingIndex: number, nodeIndex: number): void {
        const intervals = getIntervals(selectedBitmaps[bindingIndex]);
        const uiIntervals = getIntervals(uiBitmaps[bindingIndex]);
        
        // Don't start drag if node is in middle of interval
        if (uiIntervals.some(([l, r]) => l < nodeIndex && nodeIndex < r)) {
            return;
        }

        dragState = {
            isDragging: true,
            bindingIndex,
            nodeIndex,
            startX: 0,
            startMouseX: event.clientX
        };
        
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent): void {
        if (!dragState?.isDragging) return;
        
        const deltaX = event.clientX - dragState.startMouseX;
        handleDrag(dragState.bindingIndex, dragState.nodeIndex, deltaX);
    }

    function handleMouseUp(): void {
        if (dragState?.isDragging) {
            commitDrag(dragState.bindingIndex);
        }
        dragState = null;
    }

    // Add global event listeners
    $effect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
        const handleGlobalMouseUp = () => handleMouseUp();
        
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    });

    function goBack(): void {
        goto('/advancedkey');
    }

    function getCurrentKeyConfiguration(): DynamicKeystrokeConfiguration | null {
        if (!$CurrentSelected) return null;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        const config = $globalConfigurations[keyId];
        
        if (config && config.type === 'dynamic') {
            return config as DynamicKeystrokeConfiguration;
        }
        
        return {
            type: 'dynamic',
            keycodes: selectedKeycodes,
            bitmap: selectedBitmaps,
            bottomOutPoint: bottomOutPoint
        };
    }

    function updateConfiguration(): void {
        if (!$CurrentSelected) return;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        const config: DynamicKeystrokeConfiguration = {
            type: 'dynamic',
            keycodes: selectedKeycodes,
            bitmap: selectedBitmaps,
            bottomOutPoint: bottomOutPoint
        };
        updateGlobalConfiguration(keyId, config);
    }

    function resetConfiguration(): void {
        if (!$CurrentSelected) return;
        const keyId = `${$CurrentSelected[0]},${$CurrentSelected[1]}`;
        resetGlobalConfiguration(keyId);
        selectedKeycodes = ['esc', 'enter', 'space', 'backspace'];
        selectedBitmaps = [
            [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
            [DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
            [DKSAction.PRESS, DKSAction.PRESS, DKSAction.HOLD, DKSAction.RELEASE],
            [DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD]
        ];
        uiBitmaps = [...selectedBitmaps];
        bottomOutPoint = 4.0;
    }

    function applyConfiguration(): void {
        updateConfiguration();
        console.log('Applying dynamic keystroke configurations:', $globalConfigurations);
    }

    function resetAllDynamicKeys(): void {
        globalConfigurations.update(configs => {
            const newConfigs = { ...configs };
            Object.keys(newConfigs).forEach(keyId => {
                if (newConfigs[keyId].type === 'dynamic') {
                    delete newConfigs[keyId];
                }
            });
            return newConfigs;
        });
    }

    function selectKeycode(keycode: string): void {
        if (selectedBindingIndex !== null) {
            selectedKeycodes[selectedBindingIndex] = keycode;
            selectedKeycodes = [...selectedKeycodes];
            selectedBindingIndex = null;
        }
    }

    // Reactive values
    const currentKeyName = $derived($CurrentSelected ? 
        $KeyboardDisplayValues[$CurrentSelected[1]]?.[$CurrentSelected[0]] || 'Unknown' : 
        'No key selected');

    // Sync UI bitmaps when selected bitmaps change
    $effect(() => {
        uiBitmaps = [...selectedBitmaps];
    });

    // Load existing configuration when key selection changes
    $effect(() => {
        if ($CurrentSelected) {
            const config = getCurrentKeyConfiguration();
            if (config && $globalConfigurations[`${$CurrentSelected[0]},${$CurrentSelected[1]}`]) {
                selectedKeycodes = config.keycodes || ['esc', 'enter', 'space', 'backspace'];
                selectedBitmaps = config.bitmap || [
                    [DKSAction.PRESS, DKSAction.HOLD, DKSAction.HOLD, DKSAction.RELEASE],
                    [DKSAction.TAP, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD],
                    [DKSAction.PRESS, DKSAction.PRESS, DKSAction.HOLD, DKSAction.RELEASE],
                    [DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD, DKSAction.HOLD]
                ];
                bottomOutPoint = config.bottomOutPoint || 4.0;
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

    // Get configured dynamic keys count
    const configuredDynamicKeys = $derived(
        Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'dynamic')
    );

    // Phase descriptions with icons
    const phaseDescriptions = [
        { name: 'Key pressed past actuation point', icon: '↓' },
        { name: 'Key pressed past bottom-out point', icon: '⬇' }, 
        { name: 'Key released past bottom-out point', icon: '⬆' },
        { name: 'Key released past actuation point', icon: '↑' }
    ];
</script>

<!-- DKS Slider Component -->
{#snippet DKSSlider(bitmap, uiBitmap, bindingIndex)}
    {@const intervals = getIntervals(bitmap)}
    {@const uiIntervals = getIntervals(uiBitmap)}
    
    <div class="relative flex items-center" style="width: {SLIDER_WIDTH}px; height: {SLIDER_HEIGHT}px;">
        <!-- Base nodes -->
        {#each Array(4) as _, i}
            <button
                class="absolute inline-flex items-center justify-center rounded-full border-2 bg-white transition-all z-10 {intervals.some(([start, end]) => start <= i && i <= end) ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}"
                style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(i)}px;"
                on:click={() => handleNodeClick(bindingIndex, i)}
                title="Click to toggle action at phase {i + 1}"
            >
                <svg class="w-4 h-4 {intervals.some(([start, end]) => start <= i && i <= end) ? 'text-blue-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        {/each}

        <!-- Interval bars -->
        {#each uiIntervals as interval}
            {@const [start, end] = interval}
            {#if start !== -1 && end > start}
                <!-- Interval bar (clickable to delete) -->
                <button
                    class="absolute z-20 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    style="width: {NODE_SIZE + intervalWidth(interval)}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(start)}px;"
                    on:click={() => deleteInterval(bindingIndex, start)}
                    title="Click to delete interval"
                >
                    <span class="sr-only">Delete interval</span>
                </button>

                <!-- Grip handle for dragging -->
                <div
                    class="absolute z-30 flex items-center justify-center rounded-sm border bg-gray-600 cursor-ew-resize hover:bg-gray-700 transition-colors select-none"
                    style="width: {GRIP_WIDTH}px; height: {GRIP_HEIGHT}px; top: {GRIP_TOP}px; left: {nodeLeft(start) + GRIP_OFFSET + intervalWidth(interval)}px;"
                    on:mousedown={(e) => handleMouseDown(e, bindingIndex, start)}
                    title="Drag to resize interval"
                >
                    <svg class="w-2.5 h-2.5 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                </div>
            {:else if start === end}
                <!-- TAP indicator (single point) -->
                <div
                    class="absolute z-20 rounded-full bg-purple-500"
                    style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(start)}px;"
                    title="TAP action at phase {start + 1}"
                ></div>
            {/if}
        {/each}

        <!-- Draggable areas for creating intervals -->
        {#each Array(4) as _, i}
            {#if !uiIntervals.some(([l, r]) => l < i && i < r)}
                <div
                    class="absolute z-40 cursor-pointer rounded-full"
                    style="width: {NODE_SIZE}px; height: {NODE_SIZE}px; top: {NODE_TOP}px; left: {nodeLeft(i)}px;"
                    on:mousedown={(e) => {
                        const interval = intervals.find(([l]) => l === i);
                        if (interval && interval[1] !== interval[0]) {
                            handleMouseDown(e, bindingIndex, i);
                        }
                    }}
                    title="Drag to create/modify interval"
                >
                    <span class="sr-only">Draggable area</span>
                </div>
            {/if}
        {/each}
    </div>
{/snippet}

<div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button 
                    class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    on:click={goBack}
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <div>
                    <h1 class="text-xl font-semibold text-gray-900">Dynamic Keystroke Configuration</h1>
                    <p class="text-sm text-gray-500">Configure 4-phase keystroke control with analog input response</p>
                </div>
            </div>
            <div class="flex gap-3">
                <button 
                    class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm font-medium"
                    on:click={resetConfiguration}
                    disabled={!$CurrentSelected}
                >
                    Reset
                </button>
                <button 
                    class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
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
            <div class="max-w-7xl mx-auto">
                <!-- Selected Key Info -->
                <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-blue-300">
                                    <span class="font-mono font-bold text-gray-900">{currentKeyName}</span>
                                </div>
                                <div>
                                    <h3 class="font-medium text-gray-900">Selected Key</h3>
                                    <p class="text-sm text-gray-500">Position: {$CurrentSelected[0]}, {$CurrentSelected[1]}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-gray-600">Mode:</span>
                            <span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                Dynamic Keystroke
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Main Layout -->
                <div class="flex gap-8">
                    <!-- Left Panel: Configuration -->
                    <div class="w-96 flex flex-col gap-4">
                        <!-- DKS Bindings Configuration -->
                        <div class="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Configure DKS Bindings</h3>
                            <p class="text-sm text-gray-600 mb-4">
                                Assign a keycode to each binding. Click nodes to create intervals, drag grips to resize, click bars to delete.
                            </p>
                            
                            <!-- Phase Headers -->
                            <div class="flex items-center gap-4 mb-3">
                                <div class="w-16 text-center text-sm font-semibold">Bindings</div>
                                <!-- Header with phase indicators -->
                                <div class="relative h-4" style="width: {SLIDER_WIDTH}px;">
                                    {#each phaseDescriptions as phase, i}
                                        <div
                                            class="absolute top-0 flex flex-col items-center gap-2"
                                            style="width: 16px; left: {SLIDER_GAP * i + NODE_SIZE / 2 - 8}px;"
                                            title={phase.name}
                                        >
                                            <span class="text-sm">{phase.icon}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>

                            <!-- Bindings List with DKS Sliders -->
                            <div class="space-y-2">
                                {#each selectedKeycodes as keycode, bindingIndex}
                                    <div class="flex items-center gap-4">
                                        <!-- Keycode Button -->
                                        <button
                                            class="w-16 h-16 p-0.5 rounded-lg border-2 text-xs transition-all {selectedBindingIndex === bindingIndex ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}"
                                            on:click={() => selectedBindingIndex = selectedBindingIndex === bindingIndex ? null : bindingIndex}
                                        >
                                            <div class="w-full h-full rounded flex items-center justify-center font-medium">
                                                {keyActions.find(k => k.id === keycode)?.name || keycode}
                                            </div>
                                        </button>

                                        <!-- DKS Slider -->
                                        {@render DKSSlider(selectedBitmaps[bindingIndex], uiBitmaps[bindingIndex], bindingIndex)}
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- Bottom Out Point -->
                        <div class="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Bottom Out Point</h3>
                            <p class="text-sm text-gray-600 mb-4">Set the distance at which the key is bottomed out.</p>
                            
                            <div>
                                <div class="flex justify-between items-center mb-2">
                                    <label class="text-sm font-medium text-gray-700">Distance</label>
                                    <span class="text-sm text-gray-500">{bottomOutPoint.toFixed(1)}mm</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="2.0" 
                                    max="4.0" 
                                    step="0.1" 
                                    bind:value={bottomOutPoint}
                                    class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb"
                                />
                                <div class="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>2.0mm</span>
                                    <span>4.0mm</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel: Tabs -->
                    <div class="flex-1 flex flex-col">
                        <!-- Tab Navigation -->
                        <div class="flex border-b border-gray-200 mb-6">
                            {#each [['bindings', 'Bindings'], ['performance', 'Performance'], ['key-tester', 'Key Tester']] as [value, label]}
                                <button
                                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === value ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
                                    on:click={() => activeTab = value}
                                >
                                    {label}
                                </button>
                            {/each}
                        </div>

                        <!-- Tab Content -->
                        {#if activeTab === 'bindings'}
                            <div class="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 class="text-lg font-medium text-gray-900 mb-4">Keycode Selection</h3>
                                {#if selectedBindingIndex !== null}
                                    <p class="text-sm text-gray-600 mb-4">
                                        Select a keycode for binding {selectedBindingIndex + 1}
                                    </p>
                                {:else}
                                    <p class="text-sm text-gray-600 mb-4">
                                        Click on a binding button to select a keycode
                                    </p>
                                {/if}

                                <div class="space-y-4">
                                    {#each actionCategories as category}
                                        <div>
                                            <h4 class="text-sm font-medium text-gray-700 mb-2">{category.name}</h4>
                                            <div class="grid grid-cols-10 gap-2">
                                                {#each category.actions as action}
                                                    <button
                                                        class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {selectedBindingIndex !== null ? 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}"
                                                        on:click={() => selectKeycode(action.id)}
                                                        disabled={selectedBindingIndex === null}
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
                        {:else if activeTab === 'performance'}
                            <div class="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 class="text-lg font-medium text-gray-900 mb-4">Performance Settings</h3>
                                
                                <!-- Actuation Point Slider -->
                                <div class="mb-6">
                                    <div class="flex justify-between items-center mb-2">
                                        <label class="text-sm font-medium text-gray-700">Actuation Point</label>
                                        <span class="text-sm text-gray-500">2.0mm</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3.5" 
                                        step="0.1" 
                                        value="2.0"
                                        disabled
                                        class="w-full h-2 rounded-full bg-gray-300 appearance-none slider-thumb opacity-50"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">Set the distance at which the key press is registered</p>
                                </div>

                                <!-- Info -->
                                <div class="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <svg class="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p class="text-sm font-medium text-blue-900">Rapid Trigger Disabled</p>
                                        <p class="text-sm text-blue-700">Rapid Trigger is automatically disabled when the key is bound to a DKS.</p>
                                    </div>
                                </div>
                            </div>
                        {:else if activeTab === 'key-tester'}
                            <div class="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 class="text-lg font-medium text-gray-900 mb-4">Key Tester</h3>
                                <p class="text-sm text-gray-600 mb-6">Test your dynamic keystroke configuration</p>
                                
                                <!-- Key Visualization -->
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <div class="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                        <span class="font-mono font-bold text-gray-900">{currentKeyName}</span>
                                    </div>
                                    <p class="text-sm text-gray-500">Press the key to test dynamic keystroke behavior</p>
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
                    <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No Key Selected</h3>
                    <p class="text-gray-600 mb-4">Select a key from the keyboard layout to configure its dynamic keystroke behavior</p>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                        <strong>Tip:</strong> Dynamic keystrokes allow 4-phase control with analog input response for advanced customization
                    </div>
                </div>
            </div>
        {/if}

        <!-- Configured Keys Summary -->
        {#if configuredDynamicKeys.length > 0}
            <div class="max-w-7xl mx-auto mt-6">
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Configured Dynamic Keys</h3>
                        <span class="text-sm text-gray-500">{configuredDynamicKeys.length} key{configuredDynamicKeys.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each configuredDynamicKeys as [keyId, config]}
                            {@const [x, y] = keyId.split(',').map(Number)}
                            {@const keyName = $KeyboardDisplayValues[y]?.[x] || 'Unknown'}
                            {@const dynamicConfig = config as DynamicKeystrokeConfiguration}
                            <div class="p-4 bg-gray-50 rounded-lg border">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-mono font-bold text-gray-900">{keyName}</span>
                                </div>
                                <div class="text-sm space-y-1">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Bindings:</span>
                                        <span class="text-gray-700">{dynamicConfig.keycodes.length}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Bottom Out:</span>
                                        <span class="text-gray-700">{dynamicConfig.bottomOutPoint.toFixed(1)}mm</span>
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