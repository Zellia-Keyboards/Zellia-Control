<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { ArrowRight } from 'lucide-svelte';
  import type { Component } from 'svelte';

  interface Props {
    option: {
      id: string;
      nameKey: string;
      descriptionKey: string;
      icon: Component;
      action: () => void;
      type: 'primary' | 'secondary' | 'danger';
      featureKeys: string[];
    };
  }

  let { option }: Props = $props();
  let currentLanguage = $derived($language);
  const IconComponent = option.icon;
</script>

<div class="group relative w-full">
  <button
    class="bg-white dark:bg-black w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''} {option.type === 'danger'
      ? 'hover:border-red-600 focus:border-red-600'
      : 'hover:border-primary-500 focus:border-primary-500 dark:hover:border-primary-400 dark:focus:border-primary-400'} border-gray-300 dark:border-gray-600"
    onclick={() => option.action()}
  >
    <!-- Option Header with Animated Icon -->
    <div class="flex items-center gap-4 mb-4">
      <div
        class="flex items-center justify-center w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
      >
        <IconComponent
          class="w-8 h-8 {option.type === 'danger'
            ? 'text-red-600'
            : 'text-primary-500 dark:text-primary-400'}"
        />
      </div>
      <div class="flex-1">
        <h3
          class="text-xl font-bold text-gray-800 dark:text-white transition-colors {option.type ===
          'danger'
            ? 'group-hover:text-red-600'
            : 'group-hover:text-primary-500 dark:group-hover:text-primary-400'}"
        >
          {t(option.nameKey, currentLanguage)}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {t(option.descriptionKey, currentLanguage)}
        </p>
      </div>
    </div>

    <div class="space-y-2 flex-1">
      {#each option.featureKeys as featureKey}
        <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <div
            class="w-1.5 h-1.5 rounded-full {option.type === 'danger'
              ? 'bg-red-600'
              : 'bg-primary-500 dark:bg-black'}"
          ></div>
          <span>{t(featureKey, currentLanguage)}</span>
        </div>
      {/each}
    </div>
  </button>
</div>
