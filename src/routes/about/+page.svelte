<script lang="ts">
    import { darkMode } from '$lib/DarkModeStore.svelte';
</script>

<div class="flex-1 w-full p-6">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
            <div>
                <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">About Zellia Control</h2>
                <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">Hall Effect keyboard configurator</p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="space-y-8">
            <!-- App Info Section -->
            <div class="rounded-xl p-6 border"
                 style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                        border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                <div class="flex items-start gap-6">
                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? 'black' : 'white'});">
                            ⌨️
                        </div>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-3">Zellia Control</h3>
                        <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4">
                            A powerful desktop application for configuring Zellia keyboards with Hall Effect switches. 
                            Built with modern web technologies for cross-platform compatibility and an intuitive user experience.
                        </p>
                        <div class="flex items-center gap-4 text-sm">
                            <div class="flex items-center gap-2" style="color: var(--theme-color-primary);">
                                <div class="w-2 h-2 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                                <span>Version 1.0.0</span>
                            </div>
                            <div class="flex items-center gap-2 {$darkMode ? 'text-gray-400' : 'text-gray-500'}">
                                <div class="w-2 h-2 rounded-full {$darkMode ? 'bg-gray-400' : 'bg-gray-400'}"></div>
                                <span>Built with Tauri & SvelteKit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Features Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Performance Features -->
                <div class="rounded-lg border p-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <h4 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Performance</h4>
                    <ul class="space-y-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Adjustable actuation points (0-4mm)
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Rapid trigger technology
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Real-time pressure monitoring
                        </li>
                    </ul>
                </div>

                <!-- Advanced Features -->
                <div class="rounded-lg border p-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <h4 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Advanced Keys</h4>
                    <ul class="space-y-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Tap-hold functionality
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Toggle modes
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Dynamic keystroke control
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Null bind with SOCD cleaning
                        </li>
                    </ul>
                </div>

                <!-- Customization -->
                <div class="rounded-lg border p-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <h4 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Customization</h4>
                    <ul class="space-y-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            RGB lighting effects
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Key remapping
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Multiple theme colors
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Dark/light mode support
                        </li>
                    </ul>
                </div>

                <!-- Technical -->
                <div class="rounded-lg border p-6"
                     style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                            border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                    <h4 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Technical</h4>
                    <ul class="space-y-2 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Cross-platform support
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Hardware calibration
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Debug tools
                        </li>
                        <li class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                            Profile import/export
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Contact/Links -->
            <div class="rounded-xl p-6 border text-center"
                 style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                        border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                <h3 class="text-xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Made with ❤️ for the Hall Effect keyboard community</h3>
                <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">
                    © 2025 Zellia Control. Licensed under MIT License.
                </p>
            </div>
        </div>
    </div>
</div>