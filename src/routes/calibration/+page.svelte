<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80HE from '$lib/NewZellia80HE.svelte';
  import NewZellia60HE from '$lib/NewZellia60HE.svelte';
  import Zellia80HE from '$lib/Zellia80HE.svelte';
  import { keyboardConnection } from '$lib/KeyboardConnectionStore.svelte';

  const CalibrationState = {
    Calibrating: 0,
    Finished: 1,
    Error: 2,
  };

  // TODO: the data structure should get from the bac
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

  // Dynamic keyboard component selection
  const currentKeyboard = $derived(() => {
    const selectedModel = keyboardConnection.state.selectedModel;
    if (selectedModel === 'zellia60he') {
      return { component: NewZellia60HE, isLegacy: false };
    } else if (selectedModel === 'zellia80he') {
      return { component: NewZellia80HE, isLegacy: false };
    }
    // Default fallback to legacy component
    return { component: Zellia80HE, isLegacy: true };
  });
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
      <!-- FIXME: need a better color scheme  -->
      <span
        class="transition-all duration-300 h-14 bg-gray-50 dark:bg-black border-gray-400 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white
          border-4 border-transparent
          data-[calibrating=true]:data-[state=0]:border-primary-500
          data-[calibrating=true]:data-[state=1]:border-green-500
          data-[calibrating=true]:data-[state=2]:border-red-500
          data-[calibrating=true]:data-[state=0]:bg-primary-50 dark:data-[calibrating=true]:data-[state=0]:bg-primary-900/20
          data-[calibrating=true]:data-[state=1]:bg-green-50 dark:data-[calibrating=true]:data-[state=1]:bg-green-900/20
          data-[calibrating=true]:data-[state=2]:bg-red-50 dark:data-[calibrating=true]:data-[state=2]:bg-red-900/20"
        data-state={calibrationData[y][x]}
        data-calibrating={isCalibrating}
      ></span>
    {/snippet}
  </svelte:component>
{/if}

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''} bg-primary-50 dark:bg-black text-black dark:text-white border-0 dark:border dark:border-gray-600 h-full flex flex-col"
>
  <!-- TODO: typo check -->
  <p class="text-primary-700 dark:text-primary-300 mb-2">
    After the axis is successfully calibrated, the corresonding light will turn blue
  </p>
  <p class="text-red-600 dark:text-red-400 mb-4">If the light is red, check the switch</p>

  <p class="text-lg font-semibold text-primary-800 dark:text-primary-200 mb-3">
    Calibration Method
  </p>
  <p class="mb-2">1. Install all switched well and tighten all screws.</p>
  <p class="mb-2">2. Click the Start Calibration button</p>
  <p class="mb-2">
    3. Press the buttons (to be calibrated) in sequence, and note that the buttons need to be
    pressed all the way.
  </p>
  <p class="mb-4">4. Click End Calibration button and the process ends.</p>
  <button
    class="bg-primary-600 hover:bg-primary-700 text-white border-2 border-primary-600 hover:border-primary-700 w-16 h-8 rounded transition-colors duration-200"
    onclick={() => {
      if (!isCalibrating) {
        calibrationData = fixedCalibrationData;
      }
      isCalibrating = !isCalibrating;
    }}
  >
    {#if !isCalibrating}
      Start
    {:else}
      Stop
    {/if}
  </button>
</div>
