<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import type { ComponentType } from 'svelte';

  interface KeyMode {
    id: string;
    name: string;
    description: string;
    icon: ComponentType;
    features: string[];
  }

  interface Props {
    onSelectMode: (modeId: string) => void;
    keyModes: KeyMode[];
  }

  let { onSelectMode, keyModes }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div class="flex items-center justify-between mb-6">
  <div>
    <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
      {t('advancedkey.title', currentLanguage)}
    </h2>
    <p class="text-gray-600 dark:text-gray-300 mt-2">
      {t('advancedkey.subtitle', currentLanguage)}
    </p>
  </div>
</div>

<!-- Getting Started Section -->
<div
  class="rounded-xl p-6 border mb-4 glassmorphism-card"
  style="background: {'color-mix(in srgb, var(--theme-color-primary) 5%, #f9fafb) dark:color-mix(in srgb, var(--theme-color-primary) 8%, #111827)'};
                border-color: {'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e7eb) dark:color-mix(in srgb, var(--theme-color-primary) 15%, #374151)'};"
>
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
    {t('advancedkey.gettingStarted', currentLanguage)}
  </h3>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
    <div class="flex items-start gap-3">
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary glassmorphism-button"
      >
        1
      </div>
      <div>
        <div class="font-medium text-gray-900 dark:text-white">
          {t('advancedkey.step1Title', currentLanguage)}
        </div>
        <div class="text-gray-600 dark:text-gray-300">
          {t('advancedkey.step1Desc', currentLanguage)}
        </div>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary glassmorphism-button"
      >
        2
      </div>
      <div>
        <div class="font-medium text-gray-900 dark:text-white">
          {t('advancedkey.step2Title', currentLanguage)}
        </div>
        <div class="text-gray-600 dark:text-gray-300">
          {t('advancedkey.step2Desc', currentLanguage)}
        </div>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary glassmorphism-button"
      >
        3
      </div>
      <div>
        <div class="font-medium text-gray-900 dark:text-white">
          {t('advancedkey.step3Title', currentLanguage)}
        </div>
        <div class="text-gray-600 dark:text-gray-300">
          {t('advancedkey.step3Desc', currentLanguage)}
        </div>
      </div>
    </div>
  </div>
</div>

<div class="grid grid-cols-4 gap-6">
  {#each keyModes as mode}
    {@const Icon = mode.icon}
    <div class="group relative w-full">
      <button
        class="w-full h-full p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-left group-hover:scale-105 flex flex-col bg-white dark:bg-black border-gray-300 dark:border-gray-600 hover:border-primary-500 glassmorphism-card"
        onclick={() => onSelectMode(mode.id)}
      >
        <!-- Mode Header -->
        <div class="flex items-center gap-4 mb-4">
          <div class="flex items-center justify-center w-10 h-10">
            <Icon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3
              class="text-xl font-bold transition-colors text-gray-900 dark:text-white hover:text-primary-500"
            >
              {mode.name}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {mode.description}
            </p>
          </div>
        </div>
        <div class="space-y-2 flex-1">
          {#each mode.features as feature}
            <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
              <span>{feature}</span>
            </div>
          {/each}
        </div>
        <!-- Action Arrow -->
        <div class="absolute top-6 right-6 text-gray-400 transition-colors duration-300 ease-in">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </div>
      </button>
    </div>
  {/each}
</div>

<div class="glassmorphism mt-4 text-center text-gray-600 dark:text-gray-300">
  <p class="text-sm">
    {t('advancedkey.infoDesc', currentLanguage)}
  </p>
</div>
