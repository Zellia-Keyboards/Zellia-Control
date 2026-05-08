<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyActions } from '$lib/types/AdvancedKeyShared';
  import { slide } from 'svelte/transition';
  import { ChevronDown } from 'lucide-svelte';
  import { Card } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils.js';

  interface Props {
    title?: string;
    description?: string;
    selectedAction: number;
    onActionSelect: (actionId: number) => void;
    highlightColor?: 'primary' | 'green';
    defaultExpandedSection?: string;
  }

  let {
    title,
    description,
    selectedAction = $bindable(),
    onActionSelect,
    highlightColor = 'primary',
    defaultExpandedSection = 'Basic',
  }: Props = $props();

  let currentLanguage = $derived($language);

  let expandedSections: Record<string, boolean> = $state({
    Basic: defaultExpandedSection === 'Basic',
    Layer: defaultExpandedSection === 'Layer',
    System: defaultExpandedSection === 'System',
    Mouse: defaultExpandedSection === 'Mouse',
  });

  const actionCategories = $derived([
    { name: 'Basic', actions: keyActions.filter(a => a.category === 'Basic') },
    { name: 'Layer', actions: keyActions.filter(a => a.category === 'Layer') },
    { name: 'System', actions: keyActions.filter(a => a.category === 'System') },
    { name: 'Mouse', actions: keyActions.filter(a => a.category === 'Mouse') },
  ]);

  const selectedButtonClass = $derived(
    highlightColor === 'green'
      ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
      : 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600'
  );
</script>

<Card class="p-4 sm:p-6 glassmorphism-card">
  {#if title}
    <h3 class="text-lg font-medium mb-4">{title}</h3>
  {/if}
  {#if description}
    <p class="text-sm text-muted-foreground mb-4">{description}</p>
  {/if}

  <div class="space-y-2">
    {#each actionCategories as category}
      <Card class="overflow-hidden glassmorphism-card p-0">
        <button
          class="w-full px-4 py-3 flex items-center justify-between glassmorphism-button transition-colors hover:bg-accent"
          onclick={() => (expandedSections[category.name] = !expandedSections[category.name])}
        >
          <h4 class="text-sm font-medium">{category.name}</h4>
          <ChevronDown
            class={cn(
              'size-4 transition-transform',
              expandedSections[category.name] && 'rotate-180'
            )}
          />
        </button>

        {#if expandedSections[category.name]}
          <div class="px-4 pb-4 pt-2" transition:slide={{ duration: 300, axis: 'y' }}>
            <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {#each category.actions as action}
                {@const numericKeycode =
                  typeof action.keycode === 'number' ? action.keycode : Number(action.keycode)}
                {@const active = selectedAction === numericKeycode}
                <Button
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  class={cn(
                    'aspect-square min-w-12 h-auto text-xs whitespace-pre-line leading-tight p-1',
                    $glassmorphismMode && 'glassmorphism-button',
                    active && selectedButtonClass
                  )}
                  onclick={() => {
                    selectedAction = numericKeycode;
                    onActionSelect(numericKeycode);
                  }}
                  title={action.name}
                >
                  {action.name}
                </Button>
              {/each}
            </div>
          </div>
        {/if}
      </Card>
    {/each}
  </div>
</Card>
