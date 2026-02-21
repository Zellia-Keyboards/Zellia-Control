<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  export type ModeType = 'base' | 'sub';

  interface ModeOption {
    value: number;
    label: string;
  }

  interface Props {
    modes: ModeOption[];
    selectedMode: number;
    onModeChange: (value: number) => void;
    label?: string;
  }

  let { modes, selectedMode, onModeChange, label }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div>
  {#if label}
    <span class="block text-xs text-gray-600 dark:text-gray-300 mb-1.5">{label}</span>
  {/if}
  <div class="grid grid-cols-2 gap-2">
    {#each modes as mode}
      <button
        class="px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 relative overflow-hidden {selectedMode ===
        mode.value
          ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} glassmorphism-button"
        onclick={() => onModeChange(mode.value)}
      >
        {#if selectedMode === mode.value}
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"
          ></div>
        {/if}
        <div
          class="relative z-10 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis {selectedMode ===
          mode.value
            ? 'text-primary-700 dark:text-primary-200'
            : 'text-black dark:text-white'}"
        >
          {mode.label}
        </div>
      </button>
    {/each}
  </div>
</div>
