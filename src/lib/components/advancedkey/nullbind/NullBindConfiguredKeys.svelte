<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import type { KeyConfiguration } from '$lib/types/AdvancedKeyShared';

  interface Props {
    configuredKeys: [string, KeyConfiguration][];
    deletingPairs: Set<string>;
    newlyAddedPairs: Set<string>;
    onDeletePair: (pairKeys: [string, string]) => void;
    getBehaviorName: (behaviorValue: number) => string;
  }

  let { configuredKeys, deletingPairs, newlyAddedPairs, onDeletePair, getBehaviorName }: Props =
    $props();

  let currentLanguage = $derived($language);
</script>

<div class="border-t p-6 bg-primary-100 dark:bg-black">
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {t('advancedkey.configuredNullBindKeys', currentLanguage)}
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400"
          >{configuredKeys.length}
          {configuredKeys.length === 1
            ? t('advancedkey.pair', currentLanguage)
            : t('advancedkey.pairs', currentLanguage)}</span
        >
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each configuredKeys as [keyId, config]}
        {@const keyIndex = parseInt(keyId)}
        {@const keyName = (() => {
          // This would need to be passed as a prop or computed differently
          // For now, we'll use a placeholder
          return `Key ${keyIndex}`;
        })()}
        {@const nullBindConfig = config as any}
        {@const pairId = `${nullBindConfig.pairedKeys[0]}-${nullBindConfig.pairedKeys[1]}`}
        {@const isDeleting = deletingPairs.has(pairId)}
        {@const isNewlyAdded = newlyAddedPairs.has(pairId)}
        <div
          class="group relative overflow-hidden rounded-xl border border-primary-600 bg-gradient-to-br from-primary-800 to-primary-900 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 {isDeleting
            ? 'opacity-0 scale-95 pointer-events-none'
            : isNewlyAdded
              ? 'opacity-100 scale-100 animate-fade-in'
              : 'opacity-100 scale-100 hover:scale-[1.02] hover:-translate-y-1'}"
        >
          <!-- Header with key pair -->
          <div class="p-4 border-b border-primary-600">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center gap-3 flex-1">
                <div
                  class="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                >
                  {nullBindConfig.pairedKeys[0]}
                </div>
                <div class="flex items-center gap-1 text-primary-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <div
                  class="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-mono font-bold text-sm {$glassmorphismMode
                    ? 'glassmorphism-button'
                    : ''}"
                >
                  {nullBindConfig.pairedKeys[1]}
                </div>
              </div>
              <button
                class="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors ml-3 {$glassmorphismMode
                  ? 'glassmorphism-button'
                  : ''}"
                onclick={() => onDeletePair(nullBindConfig.pairedKeys)}
                title={t('advancedkey.deletePair', currentLanguage)}
                aria-label={t('advancedkey.deletePair', currentLanguage)}
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-3">
            <!-- Behavior -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300"
                  >{t('advancedkey.behavior', currentLanguage)}</span
                >
              </div>
              <span class="text-sm font-semibold text-primary-500">
                {getBehaviorName(nullBindConfig.behavior)}
              </span>
            </div>

            <!-- Features -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full flex items-center justify-center {nullBindConfig.bottomOutPoint >
                  0
                    ? 'bg-primary-500'
                    : 'bg-gray-500'}"
                >
                  <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-gray-500 dark:text-gray-400"
                    >{t('advancedkey.bottomOut', currentLanguage)}</span
                  >
                  <span
                    class="text-xs font-medium {nullBindConfig.bottomOutPoint > 0
                      ? 'text-primary-500'
                      : 'text-gray-500 dark:text-gray-400'}"
                  >
                    {nullBindConfig.bottomOutPoint > 0
                      ? t('advancedkey.on', currentLanguage)
                      : t('advancedkey.off', currentLanguage)}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full flex items-center justify-center {nullBindConfig.rtDown >
                  0
                    ? 'bg-primary-500'
                    : 'bg-gray-500'}"
                >
                  <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-gray-500 dark:text-gray-400"
                    >{t('advancedkey.rapidTrigger', currentLanguage)}</span
                  >
                  <span
                    class="text-xs font-medium {nullBindConfig.rtDown > 0
                      ? 'text-primary-500'
                      : 'text-gray-500 dark:text-gray-400'}"
                  >
                    {nullBindConfig.rtDown > 0
                      ? t('advancedkey.on', currentLanguage)
                      : t('advancedkey.off', currentLanguage)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Technical details -->
            <div class="pt-2 border-t border-primary-700 dark:border-gray-300 space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-500 dark:text-gray-400">Actuation</span>
                <span class="text-gray-700 dark:text-gray-300"
                  >{nullBindConfig.actuationPoint.toFixed(1)}{t('units.mm', currentLanguage)}</span
                >
              </div>
              {#if nullBindConfig.bottomOutPoint > 0}
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500 dark:text-gray-400">Bottom Out</span>
                  <span class="text-gray-700 dark:text-gray-300"
                    >{nullBindConfig.bottomOutPoint.toFixed(1)}{t(
                      'units.mm',
                      currentLanguage
                    )}</span
                  >
                </div>
              {/if}
              {#if nullBindConfig.rtDown > 0}
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500 dark:text-gray-400">RT Sensitivity</span>
                  <span class="text-gray-700 dark:text-gray-300"
                    >{nullBindConfig.rtDown.toFixed(2)}{t('units.mm', currentLanguage)}</span
                  >
                </div>
              {/if}
            </div>
          </div>

          <!-- Hover effect overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          ></div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fade-in 0.4s ease-out;
  }

  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
