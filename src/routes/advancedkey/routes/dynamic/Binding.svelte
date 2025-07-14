<script lang="ts">
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import type { KeyAction } from '$lib/AdvancedKeyShared';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

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
  class="rounded-lg border p-6 {$glassmorphismMode ? 'glassmorphism-card' : ''}"
  style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, ${$darkMode
    ? 'black'
    : 'white'});
		   border-color: {$darkMode
    ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)'
    : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};"
>
  <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">
    {t('advancedkey.keycodeSelectionTitle', currentLanguage)}
  </h3>
  {#if selectedBindingIndex !== null}
    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
      {t('advancedkey.selectKeycodeForBinding', currentLanguage).replace(
        '{0}',
        String(selectedBindingIndex + 1)
      )}
    </p>
  {:else}
    <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
      {t('advancedkey.clickOnBinding', currentLanguage)}
    </p>
  {/if}

  <div class="space-y-4">
    {#each actionCategories as category}
      <div>
        <h4 class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2">
          {category.name}
        </h4>
        <div class="grid grid-cols-10 gap-2">
          {#each category.actions as action}
            <button
              class="aspect-square w-15 h-15 text-xs rounded-md border transition-all {$glassmorphismMode
                ? 'glassmorphism-button'
                : ''}"
              style={selectedBindingIndex !== null
                ? `background-color: ${$darkMode ? '#111827' : 'white'}; 
								   border-color: ${$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #4b5563)' : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e5e5)'}; 
								   color: ${$darkMode ? '#d1d5db' : '#374151'};`
                : `background-color: color-mix(in srgb, var(--theme-color-primary) 3%, ${$darkMode ? 'black' : '#f3f4f6'}); 
								   border-color: color-mix(in srgb, var(--theme-color-primary) 8%, ${$darkMode ? '#374151' : '#e5e5e5'}); 
								   color: color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? '#6b7280' : '#9ca3af'});
								   cursor: not-allowed;`}
              onmouseover={e => {
                if (selectedBindingIndex !== null) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    `color-mix(in srgb, var(--theme-color-primary) 15%, ${$darkMode ? 'black' : 'white'})`;
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-color-primary)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--theme-color-primary)';
                }
              }}
              onmouseout={e => {
                if (selectedBindingIndex !== null) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode
                    ? '#111827'
                    : 'white';
                  (e.currentTarget as HTMLElement).style.borderColor = $darkMode
                    ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #4b5563)'
                    : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e5e5)';
                  (e.currentTarget as HTMLElement).style.color = $darkMode ? '#d1d5db' : '#374151';
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
