<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  interface Props {
    behavior: number;
    onBehaviorSelect: (behavior: number) => void;
    behaviorMetadata: Array<{
      behavior: number;
      name: string;
      description: string;
    }>;
  }

  let { behavior, onBehaviorSelect, behaviorMetadata }: Props = $props();

  let currentLanguage = $derived($language);
</script>

<div class="flex flex-col">
  <p class="text-sm font-semibold leading-none tracking-tight text-gray-900 dark:text-white">
    {t('advancedkey.configureNullBindBehavior', currentLanguage)}
  </p>
  <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
    {t('advancedkey.selectHowToResolveKeyEvents', currentLanguage)}
  </p>

  <div class="mt-3 grid gap-1">
    {#each behaviorMetadata as behaviorMeta}
      <button
        class="relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 glassmorphism-button {behavior === behaviorMeta.behavior
          ? 'bg-primary-100 dark:bg-primary-900 text-primary-500 border border-primary-400 dark:border-primary-600'
          : 'text-gray-700 dark:text-white'}"
        onclick={() => onBehaviorSelect(behaviorMeta.behavior)}
      >
        <span class="absolute left-2 flex size-3.5 items-center justify-center">
          <div class="size-3 rounded-full border-2 border-current flex items-center justify-center">
            {#if behavior === behaviorMeta.behavior}
              <div class="size-1.5 rounded-full bg-current"></div>
            {/if}
          </div>
        </span>
        {behaviorMeta.name}
        <span class="inline-flex flex-1 justify-end">
          <div class="group relative">
            <svg class="size-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div
              class="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-900 dark:bg-black text-white dark:border dark:border-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
            >
              {behaviorMeta.description}
            </div>
          </div>
        </span>
      </button>
    {/each}
  </div>
</div>
