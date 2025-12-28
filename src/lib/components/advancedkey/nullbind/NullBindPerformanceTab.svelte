<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
  } from '$lib/types/AdvancedKeyShared';
  import ActuationPointControl from '$lib/components/performance/ActuationPointControl.svelte';
  import RapidTriggerToggle from '$lib/components/performance/RapidTriggerToggle.svelte';
  import DeadzoneControl from '$lib/components/performance/DeadzoneControl.svelte';
  import SensitivityControl from '$lib/components/performance/SensitivityControl.svelte';

  let currentLanguage = $derived($language);

  // Performance settings state - loaded from nullbind configuration
  let rtDown = $state(0);
  let actuationPoint = $state(2.0);
  let deactivationPoint = $state(1.5);
  let sensitivityValue = $state(0.5);
  let separateSensitivity = $state(false);
  let pressSensitivity = $state(0.5);
  let releaseSensitivity = $state(0.5);
  let upperDeadzone = $state(0.5);
  let lowerDeadzone = $state(3.5);
  let maxTravelDistance = $state(4.0);

  // Derive rapid trigger enabled state
  let rapidTriggerEnabled = $derived(rtDown > 0);

  // Load existing settings from selected keys' nullbind configuration
  $effect(() => {
    if ($selectedKeys.length === 2) {
      const firstKeyIndex = $selectedKeys[0];
      const keyId = firstKeyIndex.toString();
      const existingConfig = $globalConfigurations[keyId] as any | undefined;

      if (existingConfig && existingConfig.type === 'null-bind') {
        rtDown = existingConfig.rtDown ?? 0;
        actuationPoint = existingConfig.actuationPoint ?? 2.0;
        deactivationPoint = existingConfig.deactivationPoint ?? 1.5;
        sensitivityValue = existingConfig.rtDown ?? 0.5;
        pressSensitivity = existingConfig.rtDown ?? 0.5;
        releaseSensitivity = existingConfig.rtUp ?? 0.5;
        upperDeadzone = existingConfig.upperDeadzone ?? 0.5;
        lowerDeadzone = existingConfig.lowerDeadzone ?? 3.5;
        separateSensitivity = (existingConfig.rtDown ?? 0) !== (existingConfig.rtUp ?? 0);
      }
    }
  });

  // Update settings when they change - save to both keys in the pair
  $effect(() => {
    if ($selectedKeys.length === 2) {
      for (const index of $selectedKeys) {
        const keyId = index.toString();
        const existingConfig = $globalConfigurations[keyId];

        if (existingConfig && existingConfig.type === 'null-bind') {
          updateGlobalConfiguration(keyId, {
            ...existingConfig,
            rtDown,
            rtUp: releaseSensitivity,
            actuationPoint,
            deactivationPoint,
            upperDeadzone,
            lowerDeadzone,
          });
        }
      }
    }
  });
</script>

<div
  class="rounded-xl shadow flex flex-col md:flex-row flex-1 glassmorphism-card"
  style="padding: calc(1.25rem * var(--ui-scale, 1)); gap: calc(1.25rem * var(--ui-scale, 1));"
>
  <!-- 1st Box: Actuation Point (slides up and out when RT enabled) -->
  <div class="actuation-point-container" class:slide-out={rapidTriggerEnabled}>
    <ActuationPointControl
      {actuationPoint}
      {deactivationPoint}
      keysSelected={$selectedKeys.length}
      {maxTravelDistance}
      onActuationChange={value => (actuationPoint = value)}
      onDeactivationChange={value => (deactivationPoint = value)}
    />
  </div>

  <!-- 2nd Box: Rapid Trigger Toggle + Deadzone -->
  <div class="flex-1 min-w-[260px] flex flex-col">
    <RapidTriggerToggle {rapidTriggerEnabled} onToggle={value => (rtDown = value ? 0.1 : 0)} />
    <div class="flex-1 rt-deadzone-container" class:show={rapidTriggerEnabled}>
      <DeadzoneControl
        {upperDeadzone}
        {lowerDeadzone}
        {maxTravelDistance}
        onUpperChange={value => (upperDeadzone = value)}
        onLowerChange={value => (lowerDeadzone = value)}
      />
    </div>
  </div>

  <!-- Divider for desktop (pre-rendered) -->
  <div
    class="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"
    style:opacity={rapidTriggerEnabled ? '1' : '0'}
  ></div>

  <!-- 3rd Box: Sensitivity Slider & Toggle (pre-rendered) -->
  <div
    class="flex-1 min-w-[260px]"
    style:opacity={rapidTriggerEnabled ? '1' : '0'}
    style:pointer-events={rapidTriggerEnabled ? 'auto' : 'none'}
    style="width: {rapidTriggerEnabled ? 'auto' : '0'}; min-width: {rapidTriggerEnabled
      ? '260px'
      : '0'}; max-width: {rapidTriggerEnabled ? 'none' : '0'}; overflow: hidden;"
  >
    <SensitivityControl
      {separateSensitivity}
      {sensitivityValue}
      {pressSensitivity}
      {releaseSensitivity}
      onToggleSeparate={value => (separateSensitivity = value)}
      onSensitivityChange={value => {
        sensitivityValue = value;
        pressSensitivity = value;
        rtDown = value;
      }}
      onPressChange={value => {
        pressSensitivity = value;
        rtDown = value;
      }}
      onReleaseChange={value => (releaseSensitivity = value)}
    />
  </div>
</div>

<style>
  :global(.nullbind-performance) {
    width: 100%;
  }

  /* Actuation point - slides up and out when RT enabled */
  .actuation-point-container {
    opacity: 1;
    transform: translateY(0);
    width: auto;
    max-width: 800px;
    min-width: 400px;

  }

  .actuation-point-container.slide-out {
    opacity: 0;
    transform: translateY(-20px);
    width: 0;
    max-width: 0;
    min-width: 0;
    pointer-events: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* RT deadzone container - slides up from bottom when RT enabled */
  .rt-deadzone-container {
    opacity: 0;
    pointer-events: none;
  }

  .rt-deadzone-container.show {
    opacity: 1;
    pointer-events: auto;
  }
</style>
