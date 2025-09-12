<script lang="ts">
  import { keyboardConnection, type KeyboardModel } from '$lib/KeyboardConnectionStore.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let currentLanguage = $state($language);
  let selectedModel: KeyboardModel | null = $state(null);
  let isEntering = $state(false);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  function selectModel(model: KeyboardModel) {
    selectedModel = model;
  }

  async function enterDemoMode() {
    if (!selectedModel) return;
    
    isEntering = true;
    keyboardConnection.enterDemoMode(selectedModel);
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    goto('/remap'); // Redirect to configurator
  }

  function goBack() {
    goto('/welcome');
  }

  onMount(() => {
    // If already connected, redirect to configurator
    if (keyboardConnection.shouldShowConfigurator) {
      goto('/remap');
    }
  });
</script>

<svelte:head>
  <title>{t('demo.title', currentLanguage)} - Zellia Control</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-8">
  <div class="w-full max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <button
        class="mb-4 inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        onclick={goBack}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        {t('demo.backToWelcome', currentLanguage)}
      </button>
      
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('demo.selectKeyboard', currentLanguage)}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {t('demo.selectDescription', currentLanguage)}
      </p>
    </div>

    <!-- Keyboard selection cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Zellia 60HE -->
      <button
        class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-left transition-all duration-200 hover:shadow-lg {selectedModel === 'zellia60he' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-800'} {$glassmorphismMode ? 'glassmorphism-card' : ''}"
        onclick={() => selectModel('zellia60he')}
      >
        <!-- Selection indicator -->
        {#if selectedModel === 'zellia60he'}
          <div class="flex justify-end mb-2">
            <div class="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        {/if}

        <!-- Keyboard visual -->
        <div class="w-full h-20 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center relative">
          <div class="text-xs font-mono text-gray-500 dark:text-gray-400">60% Layout</div>
          <div class="absolute bottom-1 right-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
            61 keys
          </div>
        </div>

        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Zellia 60HE
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {t('demo.zellia60.description', currentLanguage)}
        </p>
        
        <!-- Features -->
        <div class="flex flex-wrap gap-2">
          <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
            {t('demo.features.compact', currentLanguage)}
          </span>
          <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs font-medium">
            {t('demo.features.hallEffect', currentLanguage)}
          </span>
        </div>
      </button>

      <!-- Zellia 80HE -->
      <button
        class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-left transition-all duration-200 hover:shadow-lg {selectedModel === 'zellia80he' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-800'} {$glassmorphismMode ? 'glassmorphism-card' : ''}"
        onclick={() => selectModel('zellia80he')}
      >
        <!-- Selection indicator -->
        {#if selectedModel === 'zellia80he'}
          <div class="flex justify-end mb-2">
            <div class="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        {/if}

        <!-- Keyboard visual -->
        <div class="w-full h-20 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center relative">
          <div class="text-xs font-mono text-gray-500 dark:text-gray-400">TKL Layout</div>
          <div class="absolute bottom-1 right-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
            87 keys
          </div>
        </div>

        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Zellia 80HE
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {t('demo.zellia80.description', currentLanguage)}
        </p>
        
        <!-- Features -->
        <div class="flex flex-wrap gap-2">
          <span class="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
            {t('demo.features.fullFunction', currentLanguage)}
          </span>
          <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs font-medium">
            {t('demo.features.hallEffect', currentLanguage)}
          </span>
        </div>
      </button>
    </div>

    <!-- Continue button -->
    <div class="flex justify-center">
      <button
        class="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode ? 'glassmorphism-button' : ''}"
        onclick={enterDemoMode}
        disabled={!selectedModel || isEntering}
      >
        {#if isEntering}
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {t('demo.entering', currentLanguage)}
          </div>
        {:else}
          {t('demo.continue', currentLanguage)}
        {/if}
      </button>
    </div>

    <!-- Info note -->
    <div class="mt-6 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        {t('demo.note', currentLanguage)}
      </p>
    </div>
  </div>
</div>