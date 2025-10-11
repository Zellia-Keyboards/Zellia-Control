<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { slide } from 'svelte/transition';

  interface Props {
    selectedToggleAction: string;
    onActionSelect: (action: string) => void;
  }

  let { selectedToggleAction, onActionSelect }: Props = $props();

  let currentLanguage = $derived($language);

  // Expandable section state - only 4 sections
  let expandedSections: Record<string, boolean> = $state({
    Basic: true,
    Layer: false,
    System: false,
    Mouse: false,
  });

  // Toggle action categories - only 4 sections matching remap pages
  const toggleCategories = $derived([
    {
      name: 'Basic',
      actions: keyActions.filter(action => action.category === 'Basic'),
    },
    {
      name: 'Layer',
      actions: keyActions.filter(action => action.category === 'Layer'),
    },
    {
      name: 'System',
      actions: keyActions.filter(action => action.category === 'System'),
    },
    {
      name: 'Mouse',
      actions: keyActions.filter(action => action.category === 'Mouse'),
    },
  ]);
</script>

<div
  class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 sm:p-6 bg-white dark:bg-gray-900 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.toggleAction', currentLanguage)}
  </h3>

  <div class="space-y-2">
    {#each toggleCategories as category}
      <div
        class="border rounded-lg {$glassmorphismMode
          ? 'glassmorphism-card'
          : 'border-primary-200 dark:border-primary-700'}"
      >
        <button
          class="w-full px-4 py-3 flex items-center justify-between {$glassmorphismMode
            ? 'glassmorphism-button'
            : 'hover:bg-primary-100 dark:hover:bg-primary-900'} rounded-lg transition-colors"
          onclick={() => (expandedSections[category.name] = !expandedSections[category.name])}
        >
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {category.name}
          </h4>
          <svg
            class="w-4 h-4 transition-transform {expandedSections[category.name]
              ? 'rotate-180'
              : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {#if expandedSections[category.name]}
          <div class="px-4 pb-4 pt-2" transition:slide={{ duration: 300, axis: 'y' }}>
            <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {#each category.actions as action}
                <button
                  class="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1 whitespace-pre-line leading-tight {selectedToggleAction ===
                  action.keycode
                    ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                    : 'bg-white dark:bg-black text-gray-700 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'} {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                  onclick={() => onActionSelect(action.keycode)}
                  title={action.name}
                >
                  {action.name}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
