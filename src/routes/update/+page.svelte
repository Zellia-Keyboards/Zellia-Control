<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import { 
    Download, 
    CheckCircle, 
    AlertCircle, 
    Wifi, 
    Cpu, 
    Zap, 
    RotateCcw,
    AlertTriangle,
    Clock,
    Sparkles,
    Shield,
    Activity,
    ArrowUpCircle,
    Settings
  } from 'lucide-svelte';
  import { language, t, tPlaceholder } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  // MCU status states
  type MCUStatus = 'idle' | 'checking' | 'updating' | 'success' | 'error' | 'disconnected';

  // Master MCU state
  let masterMcuStatus = $state<MCUStatus>('idle');
  let masterMcuProgress = $state(0);
  let masterMcuCurrentVersion = $state('1.2.3');
  let masterMcuLatestVersion = $state('1.2.4');

  // Connected MCUs state - each MCU handles a group of keys
  let connectedMcus = $state([
    {
      id: 'mcu1',
      name: 'MCU1',
      description: 'Key group 1',
      uartPort: 'UART1',
      status: 'idle' as MCUStatus,
      progress: 0,
      currentVersion: '2.1.0',
      latestVersion: '2.1.2',
      icon: Activity,
      keyCount: 30
    },
    {
      id: 'mcu2', 
      name: 'MCU2',
      description: 'Key group 2',
      uartPort: 'UART2',
      status: 'idle' as MCUStatus,
      progress: 0,
      currentVersion: '2.1.0',
      latestVersion: '2.1.2',
      icon: Activity,
      keyCount: 30
    },
    {
      id: 'mcu3',
      name: 'MCU3',
      description: 'Key group 3',
      uartPort: 'UART3', 
      status: 'idle' as MCUStatus,
      progress: 0,
      currentVersion: '2.1.0',
      latestVersion: '2.1.2',
      icon: Activity,
      keyCount: 20
    }
  ]);

  let isUpdating = $state(false);
  let updateMode = $state<'single' | 'all'>('all');
  let showAdvancedOptions = $state(false);

  // Update functions - Master MCU handles everything
  async function updateAllFirmware() {
    if (isUpdating) return;
    
    isUpdating = true;
    
    // Step 1: Update master MCU first
    masterMcuStatus = 'updating';
    masterMcuProgress = 0;
    
    // Simulate master MCU update
    let masterComplete = false;
    const masterInterval = setInterval(() => {
      masterMcuProgress += Math.random() * 10;
      if (masterMcuProgress >= 100) {
        masterMcuProgress = 100;
        masterMcuStatus = 'success';
        masterMcuCurrentVersion = masterMcuLatestVersion;
        masterComplete = true;
        clearInterval(masterInterval);
      }
    }, 300);
    
    // Step 2: Once master is updated, it updates all connected MCUs
    const checkMasterComplete = setInterval(() => {
      if (masterComplete) {
        clearInterval(checkMasterComplete);
        
        // Master MCU now updates all connected MCUs via UART
        connectedMcus.forEach(mcu => {
          mcu.status = 'updating';
          mcu.progress = 0;
          
          const mcuInterval = setInterval(() => {
            mcu.progress += Math.random() * 8;
            if (mcu.progress >= 100) {
              mcu.progress = 100;
              mcu.status = 'success';
              mcu.currentVersion = mcu.latestVersion;
              clearInterval(mcuInterval);
              
              // Check if all are done
              if (connectedMcus.every(m => m.status === 'success')) {
                isUpdating = false;
              }
            }
          }, 400);
        });
      }
    }, 100);
  }

  function checkForUpdates() {
    masterMcuStatus = 'checking';
    connectedMcus.forEach(mcu => {
      mcu.status = 'checking';
    });

    // Simulate checking for updates
    setTimeout(() => {
      masterMcuStatus = 'idle';
      connectedMcus.forEach(mcu => {
        mcu.status = 'idle';
      });
    }, 2000);
  }

  function getStatusIcon(status: MCUStatus) {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'updating':
      case 'checking':
        return Clock;
      case 'disconnected':
        return AlertTriangle;
      default:
        return Cpu;
    }
  }

  function getStatusColor(status: MCUStatus) {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'error':
      case 'disconnected':
        return 'text-red-500';
      case 'updating':
      case 'checking':
        return 'text-yellow-500';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }

  function hasAvailableUpdates() {
    return masterMcuCurrentVersion !== masterMcuLatestVersion || 
           connectedMcus.some(mcu => mcu.currentVersion !== mcu.latestVersion);
  }

  function getAvailableUpdatesCount() {
    let count = 0;
    if (masterMcuCurrentVersion !== masterMcuLatestVersion) count++;
    count += connectedMcus.filter(mcu => mcu.currentVersion !== mcu.latestVersion).length;
    return count;
  }

  function getAllComponentsUpToDate() {
    return masterMcuCurrentVersion === masterMcuLatestVersion && 
           connectedMcus.every(mcu => mcu.currentVersion === mcu.latestVersion);
  }
</script>

<NewZellia80He
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
</NewZellia80He>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-primary-50 dark:bg-black border border-gray-200 dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <!-- Header with Status Overview -->
  <div class="mb-8">
    <div class="flex items-start justify-between mb-6">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('update.title', currentLanguage)}
        </h2>
        <p class="text-gray-600 dark:text-gray-300">
          {t('update.subtitle', currentLanguage)}
        </p>
      </div>
      
      <button
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
        onclick={checkForUpdates}
        disabled={isUpdating}
      >
        <RotateCcw class="w-4 h-4 { (masterMcuStatus === 'checking' || connectedMcus.some(m => m.status === 'checking')) ? 'animate-spin' : '' }" />
        {t('update.checkUpdates', currentLanguage)}
      </button>
    </div>

    <!-- Quick Update Action -->
    {#if hasAvailableUpdates() && !isUpdating}
      <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold mb-1">{t('update.updatesAvailable', currentLanguage)}</h3>
            <p class="text-primary-100 text-sm">
              {getAvailableUpdatesCount()} {getAvailableUpdatesCount() > 1 ? t('update.componentsNeedUpdate', currentLanguage) : t('update.componentNeedsUpdate', currentLanguage)}
            </p>
          </div>
          <button
            class="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            onclick={updateAllFirmware}
          >
            <Download class="w-4 h-4" />
            {t('update.updateFirmware', currentLanguage)}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Components Grid -->
  <div class="grid gap-6">
    <!-- Master MCU -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden {$glassmorphismMode ? 'glassmorphism-card' : ''}">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Cpu class="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{t('update.masterMcu', currentLanguage)}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{t('update.masterMcuDesc', currentLanguage)}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm text-gray-600 dark:text-gray-400">{tPlaceholder('update.systemVersion', currentLanguage, masterMcuCurrentVersion, masterMcuLatestVersion)}</p>
              <div class="flex items-center gap-2 mt-1">
                <svelte:component this={getStatusIcon(masterMcuStatus)} class="w-4 h-4 {getStatusColor(masterMcuStatus)}" />
                <span class="text-sm font-medium {getStatusColor(masterMcuStatus)}">
                  {masterMcuStatus === 'idle' ? t('update.ready', currentLanguage) : 
                   masterMcuStatus === 'updating' ? t('update.updatingSystem', currentLanguage) :
                   masterMcuStatus === 'success' ? t('update.systemUpdated', currentLanguage) :
                   masterMcuStatus === 'checking' ? t('update.checking', currentLanguage) : t('update.error', currentLanguage)}
                </span>
              </div>
            </div>
            
            {#if hasAvailableUpdates() && masterMcuStatus !== 'updating' && !isUpdating}
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
                onclick={updateAllFirmware}
                disabled={isUpdating}
              >
                {t('update.updateSystem', currentLanguage)}
              </button>
            {/if}
          </div>
        </div>

        {#if masterMcuStatus === 'updating'}
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">{t('update.masterMcuProgress', currentLanguage)}</span>
              <span class="font-medium text-gray-900 dark:text-white">{Math.round(masterMcuProgress)}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                class="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style="width: {masterMcuProgress}%"
              ></div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {t('update.connectedMcuNote', currentLanguage)}
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Connected MCUs -->
    <div class="grid md:grid-cols-3 gap-4">
      {#each connectedMcus as mcu}
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svelte:component this={mcu.icon} class="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white">{mcu.name}</h4>
                <p class="text-xs text-gray-600 dark:text-gray-400">{mcu.uartPort}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-1">
              <svelte:component this={getStatusIcon(mcu.status)} class="w-4 h-4 {getStatusColor(mcu.status)}" />
            </div>
          </div>

          <div class="space-y-2 mb-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Current</span>
              <span class="font-medium text-gray-900 dark:text-white">v{mcu.currentVersion}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Latest</span>
              <span class="font-medium text-gray-900 dark:text-white">v{mcu.latestVersion}</span>
            </div>
          </div>

          {#if mcu.status === 'updating'}
            <div class="space-y-2 mb-4">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">{t('update.beingUpdatedByMaster', currentLanguage)}</span>
                <span class="font-medium text-gray-900 dark:text-white">{Math.round(mcu.progress)}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  class="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                  style="width: {mcu.progress}%"
                ></div>
              </div>
            </div>
          {/if}

          {#if mcu.status === 'success'}
            <div class="w-full px-3 py-2 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-center">
              ✓ {t('update.updatedByMaster', currentLanguage)}
            </div>
          {:else if mcu.currentVersion === mcu.latestVersion}
            <div class="w-full px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-center">
              {t('update.latestVersion', currentLanguage)}
            </div>
          {:else}
            <div class="w-full px-3 py-2 text-sm font-medium rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-center">
              {t('update.awaitingMasterUpdate', currentLanguage)}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Advanced Options -->
    {#if showAdvancedOptions}
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 {$glassmorphismMode ? 'glassmorphism-card' : ''}">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('update.advancedOptions', currentLanguage)}</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <button
            class="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={isUpdating}
          >
            <div class="flex items-center gap-3 mb-2">
              <Settings class="w-5 h-5 text-orange-500" />
              <span class="font-medium text-gray-900 dark:text-white">{t('update.forceUpdate', currentLanguage)}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {t('update.forceUpdateDesc', currentLanguage)}
            </p>
          </button>
          
          <button
            class="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={isUpdating}
          >
            <div class="flex items-center gap-3 mb-2">
              <Zap class="w-5 h-5 text-yellow-500" />
              <span class="font-medium text-gray-900 dark:text-white">{t('update.bootloaderMode', currentLanguage)}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {t('update.bootloaderModeDesc', currentLanguage)}
            </p>
          </button>
        </div>
      </div>
    {/if}

    <!-- Advanced Options Toggle -->
    <button
      class="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      onclick={() => showAdvancedOptions = !showAdvancedOptions}
    >
      <Settings class="w-4 h-4" />
      {showAdvancedOptions ? t('update.hideAdvancedOptions', currentLanguage) : t('update.showAdvancedOptions', currentLanguage)}
      <svg 
        class="w-4 h-4 transition-transform duration-200"
        class:rotate-180={showAdvancedOptions}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7" />
      </svg>
    </button>
  </div>

  <!-- Global Update Status -->
  {#if isUpdating}
    <div class="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <div class="flex items-center gap-3">
        <div class="animate-spin">
          <Clock class="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h4 class="font-medium text-blue-900 dark:text-blue-100">{t('update.updateInProgress', currentLanguage)}</h4>
          <p class="text-sm text-blue-700 dark:text-blue-300">{t('update.keepConnected', currentLanguage)}</p>
        </div>
      </div>
    </div>
  {/if}
</div>