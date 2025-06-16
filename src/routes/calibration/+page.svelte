<script lang="ts">    import { darkMode } from "$lib/DarkModeStore.svelte";
    import NewZellia80He from "$lib/NewZellia80HE.svelte";
    import { Target, Play, RotateCcw, CheckCircle, AlertCircle, Info, X } from 'lucide-svelte';

    let CurrentSelected = $state<[number, number] | null>(null);
    let selectedKeyName = $state('');
    let calibrationStep = $state<'select' | 'rest-phase' | 'wait-for-press' | 'press-phase' | 'complete'>('select');

    let isCalibrating = $state(false);
    let calibrationProgress = $state(0);
    let isKeyPressed = $state(false);
    let calibrationMessage = $state('');
    let showPressButton = $state(false);
      // Notification state
    let showNotification = $state(false);
    let notificationMessage = $state('');
    let notificationTimeout: ReturnType<typeof setTimeout>;
    
    // Press phase function reference
    let pressPhaseFunction: (() => void) | null = null;
      // Dynamic calibration steps data
    function getCalibrationSteps() {
        return [
            {
                step: 1,
                title: 'Select Key',
                description: 'Click on the key you want to calibrate',
                icon: Target,
                status: CurrentSelected ? 'complete' : 'current'
            },
            {
                step: 2,
                title: 'Start Calibration',
                description: 'Begin the automatic calibration process',
                icon: Play,
                status: calibrationStep === 'complete' ? 'complete' : 
                       (calibrationStep === 'rest-phase' || calibrationStep === 'wait-for-press' || calibrationStep === 'press-phase') ? 'current' : 
                       CurrentSelected ? 'ready' : 'pending'
            },
            {
                step: 3,
                title: 'Test & Adjust',
                description: 'Fine-tune the actuation points',
                icon: CheckCircle,
                status: calibrationStep === 'complete' ? 'current' : 'pending'
            }
        ];
    }

    $effect(() => {
        if (CurrentSelected) {
            const keyPosition = `${CurrentSelected[0]},${CurrentSelected[1]}`;
            selectedKeyName = `Key ${keyPosition}`;
            calibrationStep = 'select';
        }
    });    function startCalibration() {
        if (!selectedKeyName) {
            return;
        }
        
        isCalibrating = true;
        calibrationStep = 'rest-phase';
        calibrationProgress = 0;
        calibrationMessage = 'Measuring key at rest position...';
        showPressButton = false;
          // Phase 1: Measure key at rest for 0.5 seconds
        let restValues: number[] = [];
        let pressedValues: number[] = [];
        
        // Simulate measuring at rest
        const restPhase = setInterval(() => {
            calibrationProgress = Math.min(calibrationProgress + 10, 50);
            // Simulate reading rest position with slight variation
            const restReading = 4.1 + (Math.random() - 0.5) * 0.05;
            restValues.push(restReading);
            
        }, 50); // 50ms intervals for 0.5 seconds = 10 readings
        
        setTimeout(() => {
            clearInterval(restPhase);
            
            // Wait phase - 1-2 seconds before showing press instruction
            calibrationStep = 'wait-for-press';
            calibrationMessage = 'Rest phase complete. Get ready...';
              setTimeout(() => {
                calibrationMessage = 'Now press and hold the selected key firmly!';
                showPressButton = true;
                
                // Store the pressed phase function for the button
                pressPhaseFunction = () => {
                    showPressButton = false;
                    calibrationStep = 'press-phase';
                    calibrationMessage = 'Measuring key pressed position...';
                      // Phase 2: Measure key pressed for 0.5 seconds
                    const pressedPhase = setInterval(() => {
                        calibrationProgress = Math.min(calibrationProgress + 10, 100);
                        // Simulate reading pressed position with slight variation
                        const pressedReading = 0.2 + (Math.random() - 0.5) * 0.1;
                        pressedValues.push(pressedReading);
                        isKeyPressed = true;
                        
                    }, 50); // 50ms intervals for 0.5 seconds = 10 readings
                    
                    setTimeout(() => {
                        clearInterval(pressedPhase);
                        
                        // Calculate averages
                        const avgRest = restValues.reduce((a, b) => a + b, 0) / restValues.length;
                        const avgPressed = pressedValues.reduce((a, b) => a + b, 0) / pressedValues.length;
                          // Calibration complete
                        isCalibrating = false;
                        isKeyPressed = false;
                        calibrationStep = 'complete';
                        calibrationMessage = `Calibration Complete! Rest: ${avgRest.toFixed(2)}mm, Pressed: ${avgPressed.toFixed(2)}mm, Travel: ${(avgRest - avgPressed).toFixed(2)}mm`;
                        
                    }, 500); // 0.5 seconds for pressed phase
                };
                
            }, 1500); // 1.5 seconds wait
            
        }, 500); // 0.5 seconds for rest phase
    }    function startPressPhase() {
        if (pressPhaseFunction) {
            pressPhaseFunction();
        }
    }function resetCalibration() {
        calibrationStep = 'select';
        CurrentSelected = null;
        selectedKeyName = '';
        calibrationProgress = 0;
        isCalibrating = false;
        isKeyPressed = false;
        calibrationMessage = '';
        showPressButton = false;
        dismissNotification();
    }

    function showSuccessNotification(message: string) {
        notificationMessage = message;
        showNotification = true;
        
        // Clear existing timeout
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
        
        // Auto-dismiss after 5 seconds
        notificationTimeout = setTimeout(() => {
            dismissNotification();
        }, 5000);
    }

    function dismissNotification() {
        showNotification = false;
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
    }

    function applyCalibration() {
        // Apply the calibration settings
        showSuccessNotification(`Calibration applied for ${selectedKeyName}`);
    }

    function getStepStatus(step: any) {
        if (step.status === 'complete') return 'bg-green-500';
        if (step.status === 'current') return 'bg-blue-500';
        if (step.status === 'ready') return 'bg-yellow-500';
        return 'bg-gray-400';
    }
</script>


<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey={CurrentSelected}
>
  {#snippet body(x, y)}
{/snippet}
</NewZellia80He>

<!-- Success Notification -->
{#if showNotification}
  <div class="fixed top-4 left-1/2 z-50 notification-enter" style="transform: translateX(-50%);">
    <div class="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-80">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <span class="flex-1 font-medium">{notificationMessage}</span>
      <button 
        onclick={dismissNotification}
        class="flex-shrink-0 p-1 hover:bg-green-600 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
{/if}

<style>
  .notification-enter {
    animation: slideInFromTop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideInFromTop {
    0% {
      transform: translateX(-50%) translateY(-100px) scale(0.9);
      opacity: 0;
    }
    100% {
      transform: translateX(-50%) translateY(0) scale(1);
      opacity: 1;
    }
  }
</style>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-3xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">Calibration</h2>
      <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2">Calibrate individual keys for optimal performance</p>
    </div>
  </div>

  <!-- Calibration Steps -->
  <div class="mb-6 rounded-xl p-6 border"
       style="background: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 8%, #111827)' : 'color-mix(in srgb, var(--theme-color-primary) 5%, #f9fafb)'};
              border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 15%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 10%, #e5e7eb)'};">    <h3 class="text-lg font-semibold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Calibration Process</h3>
    <div class="flex items-center justify-between">
        {#each getCalibrationSteps() as step, index}
          <div class="flex items-center flex-1">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white {getStepStatus(step)}">
                <svelte:component this={step.icon} class="w-5 h-5" />
              </div>
              <div class="text-center">
                <div class="font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{step.title}</div>
                <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">{step.description}</div>
              </div>
            </div>
            {#if index < getCalibrationSteps().length - 1}
              <div class="w-12 h-0.5 bg-gray-300 dark:bg-gray-600 mx-4"></div>
            {/if}
          </div>
        {/each}
      
    </div>
  </div>  <div class="space-y-6 flex-1">
    <!-- Calibration Status and Controls Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left: Calibration Status with Selected Key Info -->
      <div class="p-6 rounded-xl border"
           style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'}); 
                  border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};">
        <h3 class="text-xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Calibration Status</h3>
        
        <!-- Selected Key Info -->
        {#if selectedKeyName}
          <div class="flex items-center gap-3 mb-4 p-3 rounded-lg {$darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                 style="background-color: var(--theme-color-primary);">
              <Target class="w-5 h-5" />
            </div>
            <div class="flex-1">
              <div class="font-semibold {$darkMode ? 'text-white' : 'text-gray-900'}">{selectedKeyName}</div>
              <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">Position: {CurrentSelected?.[0]}, {CurrentSelected?.[1]}</div>
            </div>
            <div class="text-xs {$darkMode ? 'text-gray-400' : 'text-gray-500'} px-2 py-1 rounded {$darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}">
              Selected
            </div>
          </div>
        {/if}

        <!-- Status Messages -->
        {#if calibrationStep === 'select'}
          <div class="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
            <AlertCircle class="w-5 h-5" />
            <span>Ready to calibrate - Select a key to begin</span>
          </div>
        {:else if calibrationStep === 'rest-phase'}
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <Play class="w-5 h-5" />
              <span>Phase 1: Measuring rest position</span>
            </div>
            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
              📏 Keep the key unpressed during this phase
            </div>
          </div>
        {:else if calibrationStep === 'wait-for-press'}
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-orange-600 dark:text-orange-400">
              <AlertCircle class="w-5 h-5" />
              <span>Get ready to press the key</span>
            </div>
            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
              ⏳ Waiting for press instruction...
            </div>
          </div>
        {:else if calibrationStep === 'press-phase'}
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Target class="w-5 h-5" />
              <span>Phase 2: Measuring pressed position</span>
            </div>
            <div class="text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">
              🔽 Hold the key pressed firmly
            </div>
          </div>
        {:else if calibrationStep === 'complete'}
          <div class="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle class="w-5 h-5" />
            <span>Calibration complete for {selectedKeyName}</span>
          </div>
        {/if}
        
        {#if !selectedKeyName}
          <div class="text-center py-8">
            <Target class="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'}">Click on a key above to start calibration</p>
          </div>
        {/if}
      </div>      <!-- Right: Controls -->
      <div class="p-6 rounded-xl border"
           style="background-color: color-mix(in srgb, var(--theme-color-primary) 5%, {$darkMode ? 'black' : 'white'}); 
                  border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};">
        <h3 class="text-xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Controls</h3>        {#if calibrationStep === 'rest-phase' || calibrationStep === 'press-phase'}
          <div class="mb-4">
            <div class="flex justify-between text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2">
              <span>
                {#if calibrationStep === 'rest-phase'}
                  Phase 1: Measuring key at rest...
                {:else}
                  Phase 2: Measuring key pressed...
                {/if}
              </span>
              <span>{calibrationProgress}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div class="h-2 rounded-full transition-all duration-300"
                   style="background-color: var(--theme-color-primary); width: {calibrationProgress}%"></div>
            </div>
          </div>
        {/if}        <!-- Calibration Message -->
        {#if calibrationMessage}
          <div class="mb-2 p-2 {$darkMode
            ? 'bg-blue-900 border-blue-600 text-blue-200'
            : 'bg-blue-50 border-blue-300 text-blue-700'} border rounded-md text-xs flex items-center gap-2">
            {calibrationMessage}
          </div>
        {/if}

        <!-- Press Key Button -->
        {#if showPressButton}
          <button
            class="w-full px-4 py-3 rounded-lg font-semibold text-white mb-3 animate-pulse"
            style="background-color: #dc2626;"
            onclick={startPressPhase}
          >
            <Target class="w-4 h-4 inline mr-2" />
            Press Key Now!
          </button>
        {/if}

        <div class="space-y-3">          <button
            class="w-full px-4 py-3 rounded-lg font-semibold transition-colors {selectedKeyName && !isCalibrating ? 'text-white' : 'text-gray-400 cursor-not-allowed'}"
            style="background-color: {selectedKeyName && !isCalibrating ? 'var(--theme-color-primary)' : '#6b7280'};"            onclick={startCalibration}
            disabled={!selectedKeyName || isCalibrating || showPressButton}
          >
            {#if isCalibrating}
              <Play class="w-4 h-4 inline mr-2" />
              Calibrating...
            {:else}
              <Play class="w-4 h-4 inline mr-2" />
              Start Calibration
            {/if}
          </button>

          <button
            class="w-full px-4 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            onclick={resetCalibration}
          >
            <RotateCcw class="w-4 h-4 inline mr-2" />
            Reset
          </button>

          {#if selectedKeyName && calibrationStep === 'complete'}
            <button
              class="w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors"
              style="background-color: var(--theme-color-primary);"
              onclick={applyCalibration}
            >
              <CheckCircle class="w-4 h-4 inline mr-2" />
              Apply Calibration
            </button>          {/if}
        </div>
      </div>
    </div><!-- Help Info -->
      <div class="mb-2 p-2 {$darkMode
        ? 'bg-blue-900 border-blue-600 text-blue-200'
        : 'bg-blue-50 border-blue-300 text-blue-700'} border rounded-md text-xs flex items-start gap-2">
        <Info class="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-medium mb-1">Calibration Tips:</p>          <ul class="space-y-1">
            <li>• Ensure the key is completely at rest during the first phase</li>
            <li>• Press the key firmly and consistently during the second phase</li>
            <li>• Avoid touching other keys during calibration</li>
          </ul>        </div>
      </div>
  </div>
</div>