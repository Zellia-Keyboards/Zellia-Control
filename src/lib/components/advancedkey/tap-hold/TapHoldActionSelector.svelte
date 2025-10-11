<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { slide } from 'svelte/transition';

  interface Props {
    title: string;
    description: string;
    selectedAction: string;
    onActionSelect: (actionId: string) => void;
    highlightColor?: 'primary' | 'green';
  }

  let {
    title,
    description,
    selectedAction = $bindable(),
    onActionSelect,
    highlightColor = 'primary',
  }: Props = $props();

  let currentLanguage = $derived($language);

  // Expandable section state
  let expandedSections: Record<string, boolean> = $state({
    Basic: highlightColor === 'primary',
    Layer: false,
    System: false,
    Mouse: false,
  });

  // Action categories
  const actionCategories = $derived([
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

  const selectedButtonClass = $derived(
    highlightColor === 'green'
      ? 'bg-green-500 border-green-500 text-white'
      : 'bg-primary-500 border-primary-500 text-white'
  );
</script>

<div
  class="rounded-lg border p-4 sm:p-6 {$glassmorphismMode
    ? 'glassmorphism-card'
    : 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-800'}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {title}
  </h3>
  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    {description}
  </p>

  <div class="space-y-2">
    {#each actionCategories as category}
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
            <div
              class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2"
            >
              {#each category.actions as action}
                <button
                  class="aspect-square min-w-12 text-xs rounded-md border transition-all flex items-center justify-center p-1 whitespace-pre-line leading-tight {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : selectedAction === action.keycode
                      ? selectedButtonClass
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-primary-100 hover:border-primary-400 dark:hover:bg-gray-700'}"
                  onclick={() => {
                    selectedAction = action.keycode;
                    onActionSelect(action.keycode);
                  }}
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
