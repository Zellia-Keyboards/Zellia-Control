<script lang="ts">
  import { glassmorphismMode } from '$lib/hooks/DarkModeStore.svelte';
  import type { KeyAction } from '$lib/configurator/AdvancedKeyShared';
  import { language, t } from '$lib/hooks/LanguageStore.svelte';

  let currentLanguage = $derived($language);

  interface Props {
    selectedKeycodes: string[];
    selectedBindingIndex: number | null;
    actionCategories: { name: string; actions: KeyAction[] }[];
  }

  let {
    selectedKeycodes = $bindable(),
    selectedBindingIndex = $bindable(),
    actionCategories,
  }: Props = $props();

  function selectKeycode(keycode: string): void {
    if (selectedBindingIndex !== null) {
      selectedKeycodes[selectedBindingIndex] = keycode; // Directly mutates the $state array [cite: 222, 223]
      selectedBindingIndex = null;
    }
  }
</script>

<div
  class="rounded-lg border p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.keycodeSelectionTitle', currentLanguage)}
  </h3>
  {#if selectedBindingIndex !== null}
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {t('advancedkey.selectKeycodeForBinding', currentLanguage).replace(
        '{0}',
        String(selectedBindingIndex + 1)
      )}
    </p>
  {:else}
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {t('advancedkey.clickOnBinding', currentLanguage)}
    </p>
  {/if}

  <div class="space-y-4">
    {#each actionCategories as category}
      <div>
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {category.name}
        </h4>
        <div class="grid grid-cols-10 gap-2">
          {#each category.actions as action}
            <button
              class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''}"
              style={selectedBindingIndex !== null
                ? `background-color: ${'white dark:#111827'}; 
								   border-color: ${'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e5e5) dark:color-mix(in srgb, var(--theme-color-primary) 15%, #4b5563)'}; 
								   color: ${'#374151 dark:#d1d5db'};`
                : `background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${'#f3f4f6 dark:black'}); 
								   border-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${'#e5e5e5 dark:#374151'}); 
								   color: color-mix(in srgb, var(--theme-color-primary) 15%, ${'#9ca3af dark:#6b7280'});
								   cursor: not-allowed;`}
              onmouseover={e => {
                if (selectedBindingIndex !== null) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    `color-mix(in srgb, var(--theme-color-primary) 15%, ${'white dark:black'})`;
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-color-primary)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)';
                }
              }}
              onmouseout={e => {
                if (selectedBindingIndex !== null) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'white dark:#111827';
                  (e.currentTarget as HTMLElement).style.borderColor =
                    'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e5e5) dark:color-mix(in srgb, var(--theme-color-primary) 15%, #4b5563)';
                  (e.currentTarget as HTMLElement).style.color = '#374151 dark:#d1d5db';
                }
              }}
              onclick={() => selectKeycode(action.id)}
              disabled={selectedBindingIndex === null}
              title={action.name}
            >
              {action.name}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
