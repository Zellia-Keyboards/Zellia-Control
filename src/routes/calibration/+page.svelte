<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { keyboardAPI } from '$lib/keyboardAPI.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';
  import { AlertTriangle, Play, Square, RotateCcw } from 'lucide-svelte';

  // Make currentLanguage reactive to language store changes
  let currentLanguage = $derived($language);

  const CalibrationState = {
    Calibrating: 0,
    Finished: 1,
    Error: 2,
  };

  // TODO: the data structure should get from the backend
  const fixedCalibrationData = [
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
    ],
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
    ],
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
    ],
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
    ],
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
    ],
    [
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      CalibrationState.Calibrating,
      // FIXME: just for test style
      CalibrationState.Finished,
      CalibrationState.Error,
    ],
  ];

  let calibrationData = $state(fixedCalibrationData);
  let isCalibrating = $state(false);

  // No manual key selection needed - keys are automatically detected when pressed during calibration
  function handleKeyClick(x: number, y: number) {
    console.log(`Key clicked at (${x}, ${y})`);
    // Key clicking not needed for calibration - physical key presses are detected automatically
  }

  function startCalibration() {
    if (!isCalibrating) {
      calibrationData = fixedCalibrationData;
    }
    isCalibrating = !isCalibrating;
  }

  function resetCalibration() {
    isCalibrating = false;
    calibrationData = fixedCalibrationData;
  }
</script>


<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow bg-primary-100 dark:bg-black border border-transparent dark:border-gray-600 text-black dark:text-white h-full flex flex-col {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''}"
>
  <!-- Header Section -->
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {t('calibration.title', currentLanguage)}
    </h2>
    <div class="flex gap-2 mb-2">
      <button
        class="px-4 py-2 rounded mr-1 transition-colors duration-200 text-white flex items-center gap-2 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        style="background-color: var(--theme-color-primary);"
        onmouseover={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor =
            'color-mix(in srgb, var(--theme-color-primary) 85%, black)')}
        onmouseout={e =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-color-primary)')}
        onclick={startCalibration}
      >
        {#if isCalibrating}
          <Square size={16} />
          {t('calibration.stop', currentLanguage)}
        {:else}
          <Play size={16} />
          {t('calibration.start', currentLanguage)}
        {/if}
      </button>
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border dark:border-white px-4 py-2 rounded transition-colors duration-200 flex items-center gap-2 {$glassmorphismMode
          ? 'glassmorphism-button'
          : ''}"
        onclick={resetCalibration}
      >
        <RotateCcw size={16} />
        {t('calibration.reset', currentLanguage)}
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div
    class="rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 flex-1 {$glassmorphismMode
      ? 'glassmorphism-card'
      : ''}"
  >
    <!-- Instructions Panel -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        {t('calibration.instructions', currentLanguage)}
      </h3>
      
      <!-- Status Display -->
      <div class="mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 {$glassmorphismMode
        ? 'glassmorphism-card'
        : ''}">
        <div class="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {t('calibration.calibrationStatus', currentLanguage)}:
        </div>
        <div class="font-medium text-gray-900 dark:text-white">
          {#if isCalibrating}
            {t('calibration.calibrationActive', currentLanguage)}
          {:else}
            {t('calibration.readyToCalibrate', currentLanguage)}
          {/if}
        </div>
      </div>

      <!-- Step-by-step Instructions -->
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}">1</div>
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-white mb-1">{t('calibration.startCalibrationStep', currentLanguage)}</div>
            <div>{t('calibration.clickStartButton', currentLanguage)}</div>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}">2</div>
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-white mb-1">{t('calibration.pressKeysStep', currentLanguage)}</div>
            <div>{t('calibration.pressKeysDesc', currentLanguage)}</div>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium {$glassmorphismMode
            ? 'glassmorphism-button'
            : ''}">3</div>
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-white mb-1">{t('calibration.automaticDetection', currentLanguage)}</div>
            <div>{t('calibration.automaticDetectionDesc', currentLanguage)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider for desktop -->
    <div class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"></div>

    <!-- Calibration Tips -->
    <div class="flex-1 min-w-[260px] flex flex-col">
      <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        {t('calibration.helpTitle', currentLanguage)}
      </h3>
      
      <!-- Warning Notice -->
      <div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 rounded-lg flex items-start gap-2 {$glassmorphismMode
        ? 'glassmorphism-card'
        : ''}">
        <AlertTriangle size={16} class="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-yellow-700 dark:text-yellow-300">
          <div class="font-medium mb-1">{t('calibration.calibrationProcess', currentLanguage)}</div>
          <div>{t('calibration.helpTip1', currentLanguage)}</div>
        </div>
      </div>

      <!-- Tips List -->
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex items-start gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
          <div>{t('calibration.helpTip2', currentLanguage)}</div>
        </div>
        
        <div class="flex items-start gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
          <div>{t('calibration.helpTip3', currentLanguage)}</div>
        </div>

        <!-- Legend -->
        <div class="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}">
          <div class="font-medium text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wide">{t('calibration.legend', currentLanguage)}</div>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded border border-blue-500 bg-blue-50 dark:bg-blue-900/20"></div>
              <span>{t('calibration.calibrating', currentLanguage)}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded border border-green-500 bg-green-50 dark:bg-green-900/20"></div>
              <span>{t('calibration.completed', currentLanguage)}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded border border-red-500 bg-red-50 dark:bg-red-900/20"></div>
              <span>{t('calibration.error', currentLanguage)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
