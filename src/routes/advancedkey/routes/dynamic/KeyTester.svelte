<script lang="ts">
    import { darkMode } from "$lib/DarkModeStore.svelte";

    interface Props {
        currentKeyName: string;
    }

    let { currentKeyName }: Props = $props();
</script>

<div
    class="{$darkMode
        ? 'bg-black border-white'
        : 'bg-white border-gray-200'} rounded-lg border p-6"
>
    <h3
        class="text-lg font-medium {$darkMode
            ? 'text-white'
            : 'text-gray-900'} mb-4"
    >
        Key Tester
    </h3>
    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6">
        Test your dynamic keystroke configuration
    </p>

    <div
        class="border-2 {$darkMode
            ? 'border-gray-600'
            : 'border-gray-300'} border-dashed rounded-lg p-8 text-center"
    >
        <div
            class="w-20 h-20 {$darkMode
                ? 'bg-gray-800'
                : 'bg-gray-100'} rounded-lg flex items-center justify-center mx-auto mb-4"
        >
            <span
                class="font-mono font-bold {$darkMode
                    ? 'text-white'
                    : 'text-gray-900'}">{currentKeyName}</span
            >
        </div>
        <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">
            Press the key to test dynamic keystroke behavior
        </p>
    </div>
</div>
