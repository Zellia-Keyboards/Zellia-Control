<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import NewZellia60HE from '$lib/NewZellia60HE.svelte';
  import Zellia80HE from '$lib/Zellia80HE.svelte';
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { 
    Download, 
    CheckCircle, 
    AlertCircle, 
    RotateCcw,
    Clock,
    Sparkles,
    Shield,
    ArrowUpCircle,
    Wifi,
    FileText
  } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $derived($language);

  // Derived variable to determine which keyboard component to show
  let currentKeyboard = $derived(() => {
    const selectedModel = keyboardAPI.state.selectedModel;
    if (selectedModel === 'zellia60he') {
      return { component: NewZellia60HE, isLegacy: false };
    } else if (selectedModel === 'zellia80he') {
      return { component: NewZellia80He, isLegacy: false };
    }
    // Default fallback
    return { component: Zellia80HE, isLegacy: true };
  });

  // Simplified update state
  type UpdateStatus = 'idle' | 'checking' | 'available' | 'updating' | 'success' | 'error';

  let updateStatus = $state<UpdateStatus>('idle');
  let updateProgress = $state(0);
  let currentVersion = $state('1.2.3');
  let latestVersion = $state('1.2.4');
  let isConnected = $state(true);

  // Simple update functions
  async function checkForUpdates() {
    updateStatus = 'checking';
    
    // Simulate checking for updates
    setTimeout(() => {
      updateStatus = currentVersion !== latestVersion ? 'available' : 'idle';
    }, 2000);
  }

  async function startUpdate() {
    if (updateStatus !== 'available') return;
    
    updateStatus = 'updating';
    updateProgress = 0;
    
    // Simulate update process
    const updateInterval = setInterval(() => {
      updateProgress += Math.random() * 10;
      if (updateProgress >= 100) {
        updateProgress = 100;
        updateStatus = 'success';
        currentVersion = latestVersion;
        clearInterval(updateInterval);
        
        // Reset to idle after a few seconds
        setTimeout(() => {
          updateStatus = 'idle';
        }, 3000);
      }
    }, 500);
  }

  function getStatusIcon() {
    switch (updateStatus) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'updating':
      case 'checking':
        return Clock;
      case 'available':
        return ArrowUpCircle;
      default:
        return Sparkles;
    }
  }

  function getStatusColor() {
    switch (updateStatus) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'updating':
      case 'checking':
        return 'text-yellow-500';
      case 'available':
        return 'text-blue-500';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }

  function getStatusMessage() {
    switch (updateStatus) {
      case 'checking':
        return t('update.checking', currentLanguage);
      case 'available':
        return t('update.updateAvailable', currentLanguage);
      case 'updating':
        return t('update.updating', currentLanguage);
      case 'success':
        return t('update.updateComplete', currentLanguage);
      case 'error':
        return t('update.updateError', currentLanguage);
      default:
        return t('update.upToDate', currentLanguage);
    }
  }
</script>

{#if currentKeyboard().isLegacy}
  <svelte:component this={currentKeyboard().component}
    values={[]}
    onClick={(x, y, event) => {
      console.log(`Key clicked at (${x}, ${y})`, event);
    }}
  />
{:else}
  <svelte:component this={currentKeyboard().component}
    currentSelectedKey={null}
    onClick={(x, y, event) => {
      console.log(`Key clicked at (${x}, ${y})`, event);
    }}
  >
    {#snippet body(x, y)}
      <div
        class="hover:scale-90 transition-all duration-300 h-14 bg-gray-50 dark:bg-black border border-gray-400 dark:border-gray-700 data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
      ></div>
    {/snippet}
  </svelte:component>
{/if}

<div class="rounded-2xl shadow p-4 mt-2 mb-4 grow bg-primary-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode ? 'glassmorphism-card' : ''}">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">
        {t('update.title', currentLanguage)}
      </h2>
      <p class="text-xs text-gray-600 dark:text-gray-300">
        {t('update.subtitle', currentLanguage)}
      </p>
    </div>
    
    <!-- Connection Status -->
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
      <Wifi class="w-3 h-3 {isConnected ? 'text-green-500' : 'text-red-500'}" />
      <span class="text-xs font-medium">
        {isConnected ? t('update.connected', currentLanguage) : t('update.disconnected', currentLanguage)}
      </span>
    </div>
  </div>

  <!-- Main Content - Single Row -->
  <div class="flex-1 grid grid-cols-12 gap-4">
    
    <!-- Left Section - Update Status (5 columns) -->
    <div class="col-span-5">
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-full {$glassmorphismMode ? 'glassmorphism-card' : ''}">
        
        <div class="grid grid-cols-12 gap-4 h-full">
          <!-- Status Icon & Version (6 columns) -->
          <div class="col-span-6 flex flex-col justify-center items-center">
            <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-2 {$glassmorphismMode ? 'glassmorphism-button' : ''}">
              <svelte:component this={getStatusIcon()} class="w-6 h-6 text-primary-600 dark:text-primary-400 {updateStatus === 'checking' || updateStatus === 'updating' ? 'animate-spin' : ''}" />
            </div>
            
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white text-center mb-2">
              {t('update.firmwareVersion', currentLanguage)}
            </h3>
            
            <div class="flex items-center gap-2">
              <div class="text-center">
                <p class="text-xs text-gray-600 dark:text-gray-400">{t('update.current', currentLanguage)}</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">v{currentVersion}</p>
              </div>
              
              {#if updateStatus === 'available' || updateStatus === 'success'}
                <ArrowUpCircle class="w-3 h-3 text-gray-400" />
                <div class="text-center">
                  <p class="text-xs text-gray-600 dark:text-gray-400">{t('update.latest', currentLanguage)}</p>
                  <p class="text-sm font-bold text-primary-600 dark:text-primary-400">v{latestVersion}</p>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Status & Actions (6 columns) -->
          <div class="col-span-6 flex flex-col justify-center">
            <div class="flex items-center justify-center gap-2 mb-3">
              <svelte:component this={getStatusIcon()} class="w-4 h-4 {getStatusColor()}" />
              <span class="text-sm font-medium {getStatusColor()}">
                {getStatusMessage()}
              </span>
            </div>
            
            <!-- Progress Bar (only shown during update) -->
            {#if updateStatus === 'updating'}
              <div class="mb-3">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-600 dark:text-gray-400">{t('update.progress', currentLanguage)}</span>
                  <span class="font-medium text-gray-900 dark:text-white">{Math.round(updateProgress)}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
                  <div 
                    class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                    style="width: {updateProgress}%"
                  ></div>
                </div>
              </div>
            {/if}

            <!-- Action Buttons -->
            <div class="flex flex-col gap-2 mb-3">
              {#if updateStatus === 'available'}
                <button
                  class="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl {$glassmorphismMode ? 'glassmorphism-button' : ''}"
                  onclick={startUpdate}
                  disabled={!isConnected}
                >
                  <Download class="w-3 h-3" />
                  {t('update.updateNow', currentLanguage)}
                </button>
              {/if}
              
              <button
                class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
                onclick={checkForUpdates}
                disabled={updateStatus === 'updating' || updateStatus === 'checking' || !isConnected}
              >
                <RotateCcw class="w-3 h-3 {updateStatus === 'checking' ? 'animate-spin' : ''}" />
                {t('update.checkForUpdates', currentLanguage)}
              </button>
            </div>

            <!-- Status Messages -->
            {#if updateStatus === 'updating'}
              <div class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg {$glassmorphismMode ? 'glassmorphism-card' : ''}">
                <div class="flex items-center gap-2">
                  <Shield class="w-3 h-3 text-blue-500" />
                  <h4 class="text-xs font-medium text-blue-900 dark:text-blue-100">{t('update.importantNote', currentLanguage)}</h4>
                </div>
              </div>
            {:else if updateStatus === 'success'}
              <div class="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg {$glassmorphismMode ? 'glassmorphism-card' : ''}">
                <div class="flex items-center gap-2">
                  <CheckCircle class="w-3 h-3 text-green-500" />
                  <h4 class="text-xs font-medium text-green-900 dark:text-green-100">{t('update.success', currentLanguage)}</h4>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Right Section - Changelog (7 columns) -->
    <div class="col-span-7">
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-full {$glassmorphismMode ? 'glassmorphism-card' : ''}">
        <div class="flex items-center gap-2 mb-4">
          <FileText class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {t('update.whatsNew', currentLanguage)}
          </h3>
        </div>
        
        <!-- Changelog Content - This will be populated by your fetching system -->
        <div class="h-full overflow-y-auto space-y-3">
          <!-- Placeholder for dynamic changelog content -->
          <div class="text-center py-8">
            <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 {$glassmorphismMode ? 'glassmorphism-button' : ''}">
              <FileText class="w-6 h-6 text-gray-400" />
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('update.loadingChangelog', currentLanguage)}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              {t('update.changelogDesc', currentLanguage)}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>