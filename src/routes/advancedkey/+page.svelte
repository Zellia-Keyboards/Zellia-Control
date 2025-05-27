<script lang="ts">
    import { goto } from '$app/navigation';

    // Available advanced key modes
    const keyModes = [
        {
            id: 'tap-hold',
            name: 'Tap Hold',
            description: 'Different actions for tap vs hold',
            icon: '⚡',
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
            icon: '🔄',
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
            icon: '🎛️',
            path: '/advancedkey/routes/dynamic',
            features: [
                '4-phase keystroke control',
                'Analog input response',
                'Multiple key bindings',
                'Advanced customization'
            ]
        }
    ];

    function navigateToMode(path: string): void {
        goto(path);
    }
</script>

<div class="p-4 h-full flex flex-col">
    <div class="flex items-center justify-between -mt-4 mb-8">
        <div>
            <h2 class="text-3xl font-bold text-gray-900">Advanced Keys</h2>
            <p class="text-gray-600 mt-2">Configure advanced keyboard behaviors for enhanced productivity</p>
        </div>
    </div>

    <div class="flex-1 max-w-6xl mx-auto w-full">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each keyModes as mode}
                <div class="group relative">
                    <button
                        class="w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 text-left group-hover:scale-105"
                        onclick={() => navigateToMode(mode.path)}
                    >
                        <!-- Mode Header -->
                        <div class="flex items-start gap-4 mb-4">
                            <div class="text-3xl">{mode.icon}</div>
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {mode.name}
                                </h3>
                                <p class="text-sm text-gray-600 mt-1">{mode.description}</p>
                            </div>
                        </div>

                        <!-- Features List -->
                        <div class="space-y-2">
                            {#each mode.features as feature}
                                <div class="flex items-center gap-2 text-sm text-gray-700">
                                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span>{feature}</span>
                                </div>
                            {/each}
                        </div>

                        <!-- Action Arrow -->
                        <div class="absolute top-6 right-6 text-gray-400 group-hover:text-blue-500 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </button>
                </div>
            {/each}
        </div>

        <!-- Getting Started Section -->
        <div class="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Getting Started</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                        <div class="font-medium text-gray-900">Select a Mode</div>
                        <div class="text-gray-600">Choose the advanced key behavior you want to configure</div>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                        <div class="font-medium text-gray-900">Select Keys</div>
                        <div class="text-gray-600">Click on keys in the keyboard layout to configure them</div>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                        <div class="font-medium text-gray-900">Apply Settings</div>
                        <div class="text-gray-600">Save your configuration to the keyboard</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Section -->
        <div class="mt-8 text-center text-gray-600">
            <p class="text-sm">
                Advanced key configurations allow you to customize how individual keys behave beyond standard typing.
                Each mode offers unique functionality to enhance your keyboard experience.
            </p>
        </div>
    </div>
</div>