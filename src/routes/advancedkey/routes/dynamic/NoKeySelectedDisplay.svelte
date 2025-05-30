<script lang="ts">
    import { darkMode } from "$lib/DarkModeStore.svelte";
</script>

<div class="flex-1 flex items-center justify-center">
    <div class="text-center max-w-md mx-auto">        <div
            class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
            style="background-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #1f2937)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f3f4f6)'};"
        >            <svg
                class="w-12 h-12"
                style="color: var(--theme-color-primary);"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                />
            </svg>
        </div>
        <h3
            class="text-lg font-medium {$darkMode
                ? 'text-white'
                : 'text-gray-900'} mb-2"
        >
            No Key Selected
        </h3>
        <p class="{$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
            Select a key from the keyboard layout to configure its dynamic
            keystroke behavior
        </p>        <div
            class="border rounded-lg p-4 text-sm"
            style="background-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #111827)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f0f9ff)'};
                   border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #bfdbfe)'};
                   color: {$darkMode ? '#d1d5db' : 'color-mix(in srgb, var(--theme-color-primary) 85%, black)'};"
        >
            <strong>Tip:</strong> Dynamic keystrokes allow 4-phase control with analog
            input response for advanced customization
        </div>
    </div>
</div>
