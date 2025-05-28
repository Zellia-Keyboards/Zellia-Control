<script lang="ts">
    import type { Snippet } from "svelte";
    import { darkMode } from "$lib/DarkModeStore.svelte";
    import type { DKSAction, KeyAction } from "$lib/AdvancedKeyShared"; // Assuming KeyAction is exported

    type Props = {
        bindingIndex: number;
        keycode: string;
        selectedBindingIndex: number | null;
        onSelectBinding: (index: number) => void;
        DKSSliderSnippet: Snippet<[DKSAction[], DKSAction[], number]>;
        selectedBitmap: DKSAction[];
        uiBitmap: DKSAction[];
        keyActions: KeyAction[];
    };

    let {
        bindingIndex,
        keycode,
        selectedBindingIndex,
        onSelectBinding,
        DKSSliderSnippet,
        selectedBitmap,
        uiBitmap,
        keyActions,
    }: Props = $props();

    const currentKeyAction = $derived(keyActions.find((k) => k.id === keycode));
</script>

<div class="flex items-center gap-4">
    <button
        class="w-16 h-16 p-0.5 rounded-lg border-2 text-xs transition-all font-medium {selectedBindingIndex ===
        bindingIndex
            ? $darkMode
                ? 'border-white bg-gray-800'
                : 'border-blue-300 bg-blue-50'
            : $darkMode
              ? 'border-gray-600 bg-black hover:bg-gray-800'
              : 'border-gray-200 bg-white hover:bg-gray-50'}"
        onclick={() => onSelectBinding(bindingIndex)}
    >
        {currentKeyAction?.name || keycode}
    </button>
    <div class="flex justify-between grow relative">
        {@render DKSSliderSnippet(
            selectedBitmap,
            uiBitmap,
            bindingIndex
        )}
    </div>
</div>
