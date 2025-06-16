<script lang="ts">
    import { darkMode } from '$lib/DarkModeStore.svelte';
    import NewZellia80He from '$lib/NewZellia80HE.svelte';
    import { language, t } from '$lib/LanguageStore.svelte';
    
    let currentLanguage = $state($language);
    
    // Subscribe to language changes
    language.subscribe(value => {
        currentLanguage = value;
    });
    
    const NORMAL_KEY = [...Array(94).keys()].map(_ => _ + 33).map(_ => [String.fromCharCode(_), _]);

    let selectedSection = 'basic';
    let expandedGroups: string[] = ['alphabet'];

    const sections = [
        { id: 'basic', label: 'Basic Keys' },
        { id: 'function', label: 'Function Keys' },
        { id: 'media', label: 'Media Keys' },
        { id: 'mouse', label: 'Mouse' }
    ];

    const keyGroups = [
        { id: 'alphabet', label: 'Alphabet' },
        { id: 'numbers', label: 'Numbers' },
        { id: 'special', label: 'Special Characters' }
    ];

    // Group basic keys
    const alphabetKeys = NORMAL_KEY.filter(([name]) => /^[A-Z]$/.test(String(name)));
    const numberKeys = NORMAL_KEY.filter(([name]) => /^[0-9]$/.test(String(name)));
    const specialKeys = NORMAL_KEY.filter(([name]) => !/^[A-Za-z0-9]$/.test(String(name)));

    function getKeysForGroup(group: string) {
        switch(group) {
            case 'alphabet': return alphabetKeys;
            case 'numbers': return numberKeys;
            case 'special': return specialKeys;
            default: return [];
        }
    }

    function toggleGroup(groupId: string) {
        if (expandedGroups.includes(groupId)) {
            expandedGroups = expandedGroups.filter(id => id !== groupId);
        } else {
            expandedGroups = [...expandedGroups, groupId];
        }
    }
</script>

<style>
    .key-square {
        aspect-ratio: 1 / 1;
        width: 4rem;
        min-width: 4rem;
        max-width: 4rem;
        min-height: 4rem;
        max-height: 4rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>

<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
>
  {#snippet body(x, y)}
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
    <!-- Section Tabs - Large and full width -->
    <div class="flex flex-col}">
        {#each sections as section}
            <button
            class="px-8 py-4 font-semibold rounded-4xl text-xl transition-colors duration-500 flex-1 h-full {selectedSection === section.id ? ($darkMode ? 'border-white text-white bg-gray-800 rounded-4xl' : 'border-blue-600 text-blue-600 bg-blue-50 rounded-4xl') : ($darkMode ? 'border-transparent text-gray-400 hover:text-white hover:border-gray-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}"
            on:click={() => selectedSection = section.id}
            >
                {section.label}
            </button>
        {/each}
    </div>

    <!-- Content based on selected section -->
    <div class="rounded-xl shadow p-6 flex-1 flex flex-col mt-4">
        {#if selectedSection === 'basic'}
            <!-- Scrollable container -->
            <div class="flex-1 flex flex-col overflow-y-auto">
                {#each keyGroups as group}
                    <div class="mb-4">
                        <!-- Collapsible Panel Header -->
                        <button
                            class="w-full flex items-center justify-between p-3 {$darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'} rounded-lg transition-colors"
                            on:click={() => toggleGroup(group.id)}
                        >
                            <span class="text-base font-semibold">{group.label}</span>
                            <svg 
                                class="w-5 h-5 transition-transform duration-200 {expandedGroups.includes(group.id) ? 'rotate-180' : ''}"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
                        
                        <!-- Collapsible Panel Content -->
                        {#if expandedGroups.includes(group.id)}
                            <div class="mt-3 p-3 border {$darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg">
                                <div class="flex flex-wrap gap-3">
                                    {#each getKeysForGroup(group.id) as [name, code]}
                                        <button
                                            class="key-square rounded-lg font-bold border {$darkMode ? 'border-gray-600 bg-black text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'} transition-colors text-base"
                                        >{name}</button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else if selectedSection === 'function'}
            <h3 class="text-lg font-medium mb-4 flex-shrink-0 {$darkMode ? 'text-white' : 'text-gray-900'}">Function Keys</h3>
            <div class="flex-1 overflow-y-auto">
                <div class="flex flex-wrap gap-3">
                    {#each ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'] as key}
                        <button
                            class="key-square rounded-lg font-bold border {$darkMode ? 'border-gray-600 bg-black text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'} transition-colors text-base"
                        >{key}</button>
                    {/each}
                </div>
            </div>
        {:else if selectedSection === 'media'}
            <h3 class="text-lg font-medium mb-4 flex-shrink-0 {$darkMode ? 'text-white' : 'text-gray-900'}">{t('media.mediaKeys', currentLanguage)}</h3>
            <div class="flex-1 overflow-y-auto">
                <div class="flex flex-wrap gap-3">
                    {#each ['Play/Pause', 'Stop', 'Previous', 'Next', 'Volume Up', 'Volume Down', 'Mute'] as key}
                        <button
                            class="key-square rounded-lg font-bold border {$darkMode ? 'border-gray-600 bg-black text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'} transition-colors text-base"
                        >{key}</button>
                    {/each}
                </div>
            </div>
        {:else if selectedSection === 'mouse'}
            <h3 class="text-lg font-medium mb-4 flex-shrink-0 {$darkMode ? 'text-white' : 'text-gray-900'}">Mouse Functions</h3>
            <div class="flex-1 overflow-y-auto">
                <div class="flex flex-wrap gap-3">
                    {#each ['Left Click', 'Right Click', 'Middle Click', 'Mouse Up', 'Mouse Down', 'Mouse Left', 'Mouse Right'] as key}
                        <button
                            class="key-square rounded-lg font-bold border {$darkMode ? 'border-gray-600 bg-black text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'} transition-colors text-base"
                        >{key}</button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>