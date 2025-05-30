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
            <!-- GitHub Repository Section -->
            <div class="rounded-xl p-6 border"
                 style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'});
                        border-color: color-mix(in srgb, var(--theme-color-primary) 25%, {$darkMode ? 'white' : '#e5e5e5'});">
                <div class="flex items-start gap-6">                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 rounded-lg flex items-center justify-center"
                             style="background-color: color-mix(in srgb, var(--theme-color-primary) 15%, {$darkMode ? 'black' : 'white'});">
                            <svg class="w-8 h-8 {$darkMode ? 'text-white' : 'text-gray-900'}" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-3">Open Source Project</h3>
                        <p class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6">
                            Zellia Control is an open source project built by the community, for the community. 
                            We welcome contributions, feedback, and support from keyboard enthusiasts worldwide.
                        </p>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-col sm:flex-row gap-3">                            <button 
                                class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md"
                                style="background-color: var(--theme-color-primary);"
                                onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 85%, black)`}
                                onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                                onclick={() => window.open('https://github.com/Zellia-Keyboards/Zellia-Control  ', '_blank')}
                            >
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                <span>View on GitHub</span>
                            </button>
                            
                            <button 
                                class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2 hover:shadow-sm"
                                style="border-color: var(--theme-color-primary); color: var(--theme-color-primary); background-color: transparent;"
                                onmouseover={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 10%, transparent)`;
                                }}
                                onmouseout={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = `transparent`;
                                }}
                                onclick={() => window.open('https://github.com/sponsors/your-username', '_blank')}
                            >
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>Support Development</span>
                            </button>
                        </div>
                        
                        <!-- Contribution Info -->
                        <div class="mt-6 pt-4 border-t" style="border-color: color-mix(in srgb, var(--theme-color-primary) 20%, {$darkMode ? 'white' : '#e5e5e5'});">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div class="text-center">
                                    <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-1">Contribute Code</div>
                                    <div class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">Submit PRs, report bugs, suggest features</div>
                                </div>
                                <div class="text-center">
                                    <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-1">Documentation</div>
                                    <div class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">Help improve guides and tutorials</div>
                                </div>
                                <div class="text-center">
                                    <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-1">Community</div>
                                    <div class="{$darkMode ? 'text-gray-400' : 'text-gray-500'}">Share feedback and help others</div>
                                </div>
                            </div>
                        </div>
                    </div>
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