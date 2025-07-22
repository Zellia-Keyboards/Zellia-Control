<script lang="ts">
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';

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
</script>

<NewZellia80He
  currentSelectedKey={null}
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
>
  {#snippet body(x, y)}
    <!-- FIXME: need a better color scheme  -->
    <span
      class="transition-all duration-300 h-14 {$darkMode
        ? 'bg-black border-gray-700'
        : 'bg-gray-50 border-gray-400'} rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white
        border-4 border-transparent
        data-[calibrating=true]:data-[state=0]:border-yellow-500
        data-[calibrating=true]:data-[state=1]:border-green-500
        data-[calibrating=true]:data-[state=2]:border-red-500"
      data-state={calibrationData[y][x]}
      data-calibrating={isCalibrating}
    ></span>
  {/snippet}
</NewZellia80He>

<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$glassmorphismMode
    ? 'glassmorphism-card'
    : ''} {$darkMode ? 'border border-gray-600 text-white' : 'text-black'} h-full flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>
  <!-- TODO: typo check -->
  <p>After the axis is successfully calibrated, the corresonding light will turn blue</p>
  <p>If the light is red, check the switch</p>

  <p>Calibration Method</p>
  <p>1. Install all switched well and tighten all screws.</p>
  <p>2. Click the Start Calibration button</p>
  <p>
    3. Press the buttons (to be calibrated) in sequence, and note that the buttons need to be
    pressed all the way.
  </p>
  <p>4. Click End Calibration button and the process ends.</p>
  <button
    class="text-white border-2 w-16 h-8"
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

<style>
</style>
