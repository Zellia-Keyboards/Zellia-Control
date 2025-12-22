<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface EffectOption {
    id: string;
    name: string;
    description: string;
    mode: 'global' | 'per-key';
  }

  interface Props {
    effects: EffectOption[];
    selectedEffect: string;
    title: string;
    badge: string;
    onSelectEffect: (effectId: string, mode: 'global' | 'per-key') => void;
  }

  let { effects, selectedEffect, title, badge, onSelectEffect }: Props = $props();
  let currentLanguage = $derived($language);
</script>

<div class="mb-3">
  <div class="flex items-center gap-2 mb-2">
    <h3 class="text-sm font-semibold text-black dark:text-white">
      {title}
    </h3>
    <span
      class="text-xs px-1.5 py-0.5 rounded {badge === 'allKeys'
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'}"
    >
      {badge === 'allKeys'
        ? t('lighting.allKeys', currentLanguage)
        : t('lighting.customizable', currentLanguage)}
    </span>
  </div>
  <div class="grid grid-cols-3 gap-2">
    {#each effects as effect}
      <button
        class="px-2 py-2 rounded-lg border-2 text-center transition-all duration-200 relative overflow-hidden {selectedEffect ===
        effect.id
          ? 'border-primary bg-primary/20 dark:bg-primary/30 shadow-lg'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'} {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={() => onSelectEffect(effect.id, effect.mode)}
      >
        {#if selectedEffect === effect.id}
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30"
          ></div>
        {/if}
        <div
          class="relative z-10 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis {selectedEffect === effect.id
            ? 'text-primary-700 dark:text-primary-200'
            : 'text-black dark:text-white'}"
        >
          {effect.name}
        </div>
      </button>
    {/each}
  </div>
</div>
