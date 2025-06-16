<script lang="ts">
    import { darkMode } from "$lib/DarkModeStore.svelte";
    import { language, t } from '$lib/LanguageStore.svelte';

    interface Props {
        currentKeyName: string;
    }

    let { currentKeyName }: Props = $props();
    
    let currentLanguage = $state($language);
    
    // Subscribe to language changes
    language.subscribe(value => {
        currentLanguage = value;
    });
</script>

<div
    class="rounded-lg border p-6"
    style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode ? 'black' : 'white'});
           border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};"
>    <h3
        class="text-lg font-medium {$darkMode
            ? 'text-white'
            : 'text-gray-900'} mb-4"
    >
        {t('advancedkey.keyTester', currentLanguage)}
    </h3>
    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6">
        {t('advancedkey.testDynamicDesc', currentLanguage)}
    </p><div
        class="border-2 border-dashed rounded-lg p-8 text-center"
        style="border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 25%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 20%, #d1d5db)'};"
    >        <div
            class="w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-4"
            style="background-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #1f2937)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f3f4f6)'};"
        >            <span
                class="font-mono font-bold"
                style="color: var(--theme-color-primary);"
                >{currentKeyName}</span
            >
        </div>        <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-500'}">
            {t('advancedkey.testKeyBehavior', currentLanguage)}
        </p>
    </div>
</div>
