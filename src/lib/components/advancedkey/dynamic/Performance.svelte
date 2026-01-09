<script lang="ts">
  import { Info } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { advancedKeys } from '$lib/stores/ControllerStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import * as ekc from 'emi-keyboard-controller';
  import ActuationPointControl from '$lib/components/performance/ActuationPointControl.svelte';

  let currentLanguage = $derived($language);

  function mmToPercent(distance: number) {
    return distance / 4.0;
  }

  function percentToMm(distance: number) {
    return distance * 4.0;
  }

  // Performance settings state
  let actuationPoint = $state(2.0);
  let deactivationPoint = $state(1.5);
  let maxTravelDistance = $state(4.0);

  // Advanced key derived from state (normal mode, no rapid trigger for DKS)
  let advancedKey = $derived.by(() => {
    var k = new ekc.AdvancedKey();
    k.mode = ekc.KeyMode.KeyAnalogNormalMode; // DKS forces normal mode
    k.activation_value = mmToPercent(actuationPoint);
    k.deactivation_value = mmToPercent(deactivationPoint);
    k.trigger_distance = mmToPercent(0.5); // Default sensitivity
    k.release_distance = mmToPercent(0.5);
    k.upper_deadzone = mmToPercent(0.5);
    k.lower_deadzone = mmToPercent(4.0 - 3.5);
    return k;
  });

  // Load existing settings from selected key
  $effect(() => {
    if ($selectedKeys.length > 0) {
      let k = $advancedKeys[$selectedKeys[0]];
      actuationPoint = percentToMm(k.activation_value);
      deactivationPoint = percentToMm(k.deactivation_value);
    }
  });

  // Update settings when they change
  $effect(() => {
    if ($selectedKeys.length > 0) {
      advancedKeys.update(currentKeys => {
        const newKeys = [...currentKeys];
        for (const index of $selectedKeys) {
          if (index >= 0 && index < newKeys.length) {
            newKeys[index] = { ...advancedKey };
          }
        }
        return newKeys;
      });
    }
  });
</script>

<div
  class="rounded-lg border p-6 bg-white dark:bg-black border-gray-200 dark:border-gray-700 glassmorphism-card"
>
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
    {t('advancedkey.performanceSettings', currentLanguage)}
  </h3>

  <div class="space-y-4">
    <!-- Actuation Point Control -->
    <ActuationPointControl
      {actuationPoint}
      {deactivationPoint}
      keysSelected={$selectedKeys.length}
      {maxTravelDistance}
      onActuationChange={value => (actuationPoint = value)}
      onDeactivationChange={value => (deactivationPoint = value)}
    />

    <!-- Info about Rapid Trigger being disabled for DKS -->
    <div
      class="flex items-start gap-3 p-4 border rounded-lg glassmorphism-card"
      style="background-color: {'color-mix(in srgb, var(--theme-color-primary) 5%, #f0f9ff) dark:color-mix(in srgb, var(--theme-color-primary) 8%, #111827)'};
                 border-color: {'color-mix(in srgb, var(--theme-color-primary) 15%, #bfdbfe) dark:color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)'};"
    >
  <Info />
      <div>
        <p
          class="text-sm font-medium"
          style="color: {'color-mix(in srgb, var(--theme-color-primary) 85%, black) dark:white'};"
        >
          {t('advancedkey.rapidTriggerDisabled', currentLanguage)}
        </p>
        <p
          class="text-sm"
          style="color: {'color-mix(in srgb, var(--theme-color-primary) 75%, black) dark:#d1d5db'};"
        >
          {t('advancedkey.rapidTriggerDisabledDesc', currentLanguage)}
        </p>
      </div>
    </div>
  </div>
</div>
