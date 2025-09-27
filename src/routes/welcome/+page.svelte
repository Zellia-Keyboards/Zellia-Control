<script lang="ts">
  import { keyboardAPI, type KeyboardModel } from '$lib/keyboardAPI.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let currentLanguage = $state($language);
  let isConnecting = $state(false);
  let showDemoDropdown = $state(false);
  let isEnteringDemo = $state(false);

  async function handleConnect() {
    isConnecting = true;
    const success = await keyboardAPI.connect();
    isConnecting = false;
    
    if (success) {
      goto('/remap'); // Redirect to main configurator
    }
  }

  async function handleDemoMode(model: KeyboardModel) {
    isEnteringDemo = true;
    showDemoDropdown = false;
    keyboardAPI.enterDemoMode(model);
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    goto('/remap'); // Redirect to configurator
  }

  function toggleDemoDropdown() {
    showDemoDropdown = !showDemoDropdown;
  }

  onMount(() => {
    // If already connected, redirect to configurator
    if (keyboardAPI.shouldShowConfigurator) {
      goto('/remap');
    }
  });
</script>

<svelte:head>
  <title>{t('welcome.title', currentLanguage)} - Zellia Control</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-8">
  <!-- Main welcome card -->
  <div class="w-full max-w-2xl mx-auto text-center">
    <!-- Logo -->
    <div class="mb-8">
      <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('welcome.title', currentLanguage)}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {t('welcome.subtitle', currentLanguage)}
      </p>
    </div>

    <!-- Horizontal Action Buttons -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Connect button -->
      <div class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} transition-all duration-200 hover:shadow-lg">
        <div class="text-center mb-4">
          <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('welcome.connectKeyboard', currentLanguage)}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('welcome.connectDescription', currentLanguage)}
          </p>
        </div>
        
        <button
          class="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode ? 'glassmorphism-button' : ''}"
          onclick={handleConnect}
          disabled={isConnecting || isEnteringDemo}
        >
          {#if isConnecting}
            <div class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {t('welcome.connecting', currentLanguage)}
            </div>
          {:else}
            {t('welcome.getStarted', currentLanguage)}
          {/if}
        </button>
      </div>

      <!-- Demo mode card with dropdown -->
      <div class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''} transition-all duration-200 hover:shadow-lg relative">
        <div class="text-center mb-4">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('welcome.tryDemo', currentLanguage)}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('welcome.demoDescription', currentLanguage)}
          </p>
        </div>
        
        <button
          class="w-full px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode ? 'glassmorphism-button' : ''} flex items-center justify-center gap-2"
          onclick={toggleDemoDropdown}
          disabled={isConnecting || isEnteringDemo}
        >
          {#if isEnteringDemo}
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {t('demo.entering', currentLanguage)}
          {:else}
            {t('demo.selectKeyboard', currentLanguage)}
            <svg class="w-4 h-4 transition-transform duration-200" class:rotate-180={showDemoDropdown} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          {/if}
        </button>

        <!-- Demo dropdown -->
        {#if showDemoDropdown}
          <div class="absolute top-full left-6 right-6 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
            <div class="p-2">
              <button
                class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 group"
                onclick={() => handleDemoMode('zellia60he')}
              >
                <div class="flex items-center gap-3">
                  
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">Zellia 60HE</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{t('demo.zellia60.description', currentLanguage)}</div>
                  </div>
                </div>
              </button>
              
              <button
                class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 group"
                onclick={() => handleDemoMode('zellia80he')}
              >
                <div class="flex items-center gap-3">
                  
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">Zellia 80HE</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{t('demo.zellia80.description', currentLanguage)}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>