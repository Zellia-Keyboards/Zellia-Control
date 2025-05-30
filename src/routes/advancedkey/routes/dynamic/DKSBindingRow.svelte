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

<div class="flex items-center gap-4">    <button
        class="w-16 h-16 p-0.5 rounded-lg border-2 text-xs transition-all font-medium"
        style="border-color: {selectedBindingIndex === bindingIndex ? 'var(--theme-color-primary)' : ($darkMode ? '#4b5563' : '#e5e7eb')};
               background-color: {selectedBindingIndex === bindingIndex ? ($darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 10%, #1f2937)' : 'color-mix(in srgb, var(--theme-color-primary) 8%, #f9fafb)') : ($darkMode ? 'black' : 'white')};
               color: {selectedBindingIndex === bindingIndex ? 'var(--theme-color-primary)' : ($darkMode ? 'white' : '#111827')};"        onmouseover={(e) => {
            if (selectedBindingIndex !== bindingIndex) {
                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 3%, black)' : 'color-mix(in srgb, var(--theme-color-primary) 2%, #f9fafb)';
            }
        }}
        onmouseout={(e) => {
            if (selectedBindingIndex !== bindingIndex) {
                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? 'black' : 'white';
            }
        }}
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
