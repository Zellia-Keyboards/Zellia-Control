<script lang="ts">
  import { slide } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { advancedKeys, dyanmicKeys, rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import { keyboardLayout } from '$lib/stores/LayoutStore.svelte';
  import { keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import * as ekc from 'emi-keyboard-controller';

  let currentLanguage = $derived($language);
  let showDemoDropdown = $state(false);
  let isEnteringDemo = $state(false);

  async function handleConnect() {
    const success = await keyboardAPI.connect();
    const layout = keyboardConnectionState.controller?.get_layout_json() as string;
    keyboardLayout.set(layout || '[]');
    advancedKeys.set(keyboardConnectionState.controller?.get_advanced_keys() as ekc.IAdvancedKey[]);
    rgbConfigs.set(keyboardConnectionState.controller?.get_rgb_configs() as ekc.IRGBConfig[]);
    rgbBaseConfig.set(
      keyboardConnectionState.controller?.get_rgb_base_config() as ekc.IRGBBaseConfig
    );
    dyanmicKeys.set(
      keyboardConnectionState.controller?.get_dynamic_keys() as ekc.IDynamicKey[]
    )
  }

  async function enterDemo(model: 'zellia60he' | 'zellia80he') {
    isEnteringDemo = true;
    showDemoDropdown = false;

    await new Promise(resolve => setTimeout(resolve, 300));
    keyboardAPI.enterDemoMode(model);

    setTimeout(() => {
      isEnteringDemo = false;
    }, 800);
  }
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <div class="w-full max-w-2xl mx-auto">
    <!-- Connection Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Connect Physical Device -->
      <div
        class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''} transition-all duration-200 hover:shadow-lg flex flex-col"
      >
        <div class="text-center mb-4 flex-1">
          <div
            class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mx-auto mb-3"
          >
            <svg
              class="w-6 h-6 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
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
          class="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}"
          onclick={handleConnect}
          disabled={keyboardAPI.state.connectionStatus === 'connecting' || isEnteringDemo}
        >
          {#if keyboardAPI.state.connectionStatus === 'connecting'}
            <div class="flex items-center justify-center gap-2">
              <svg
                class="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {t('welcome.connecting', currentLanguage)}
            </div>
          {:else}
            {t('welcome.getStarted', currentLanguage)}
          {/if}
        </button>
      </div>

      <!-- Demo Mode -->
      <div
        class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''} transition-all duration-200 hover:shadow-lg relative flex flex-col"
      >
        <div class="text-center mb-4 flex-1">
          <div
            class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center mx-auto mb-3"
          >
            <svg
              class="w-6 h-6 text-primary-600 dark:text-primary-400"
              viewBox="0 0 512 512"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m354.2,247.4l-135.1-92.4c-4.2-3.1-15.4-3.1-16.3,8.6v184.8c1,11.7 12.4,11.9 16.3,8.6l135.1-92.4c3.5-2.1 8.3-10.7 0-17.2zm-130.5,81.3v-145.4l106.1,72.7-106.1,72.7z"
              />
              <path
                d="M256,11C120.9,11,11,120.9,11,256s109.9,245,245,245s245-109.9,245-245S391.1,11,256,11z M256,480.1    C132.4,480.1,31.9,379.6,31.9,256S132.4,31.9,256,31.9S480.1,132.4,480.1,256S379.6,480.1,256,480.1z"
              />
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
          class="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''} flex items-center justify-center gap-2"
          onclick={() => (showDemoDropdown = !showDemoDropdown)}
          disabled={keyboardAPI.state.connectionStatus === 'connecting' || isEnteringDemo}
        >
          {#if isEnteringDemo}
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('demo.entering', currentLanguage)}
          {:else}
            {t('demo.selectKeyboard', currentLanguage)}
            <svg
              class="w-4 h-4 transition-transform duration-200"
              class:rotate-180={showDemoDropdown}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          {/if}
        </button>

        <!-- Demo Dropdown -->
        {#if showDemoDropdown && !isEnteringDemo}
          <div
            class="absolute top-full left-6 right-6 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 {$glassmorphismMode
              ? 'glassmorphism-card'
              : ''}"
            transition:slide={{ duration: 300, axis: 'y' }}
          >
            <div class="p-2">
              <button
                class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={isEnteringDemo}
                onclick={() => enterDemo('zellia60he')}
              >
                <div class="flex items-center gap-3">
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">Zellia 60HE</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {t('demo.zellia60.description', currentLanguage)}
                    </div>
                  </div>
                </div>
              </button>

              <button
                class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={isEnteringDemo}
                onclick={() => enterDemo('zellia80he')}
              >
                <div class="flex items-center gap-3">
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">Zellia 80HE</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {t('demo.zellia80.description', currentLanguage)}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Connection Error Display -->
    {#if keyboardAPI.state.error}
      <div
        class="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
      >
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div class="text-sm font-medium text-red-800 dark:text-red-200">Connection Failed</div>
            <div class="text-sm text-red-600 dark:text-red-300">{keyboardAPI.state.error}</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- USB HID Warning -->
    <div
      class="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {t('ui.usbHubWarning', currentLanguage)}
        </div>
      </div>
    </div>
  </div>
</div>
