<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import type { ComponentType } from 'svelte';

  interface DirectionOption {
    id: string;
    name: string;
    icon: ComponentType;
  }

  interface Props {
    directions: DirectionOption[];
    selectedDirection: string;
    onDirectionChange: (direction: string) => void;
  }

  let { directions, selectedDirection, onDirectionChange }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1.5"
    >{t('lighting.direction', currentLanguage)}</label
  >
  <div class="grid grid-cols-4 gap-2">
    {#each directions as dir}
      <button
        class="aspect-square p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative overflow-hidden {selectedDirection ===
        dir.id
          ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={() => onDirectionChange(dir.id)}
      >
        {#if selectedDirection === dir.id}
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"
          ></div>
        {/if}
        <svelte:component
          this={dir.icon}
          class="relative z-10 w-6 h-6 {selectedDirection === dir.id
            ? 'text-primary-700 dark:text-primary-200'
            : 'text-black dark:text-white'}"
        />
        <div
          class="relative z-10 text-xs font-medium text-center {selectedDirection === dir.id
            ? 'text-primary-700 dark:text-primary-200'
            : 'text-black dark:text-white'}"
        >
          {dir.name}
        </div>
      </button>
    {/each}
  </div>
</div>
