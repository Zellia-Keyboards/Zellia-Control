<script lang="ts">
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { keyboardAPI,keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
  } from '$lib/types/AdvancedKeyShared';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys, dyanmicKeys, rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import Layer from '../remap/Layer.svelte';
  import DynamicMode from './DynamicMode.svelte';

  import NullBindHeader from '$lib/components/advancedkey/nullbind/NullBindHeader.svelte';
  import NullBindKeySelection from '$lib/components/advancedkey/nullbind/NullBindKeySelection.svelte';
  import NullBindSelectedKeysInfo from '$lib/components/advancedkey/nullbind/NullBindSelectedKeysInfo.svelte';
  import NullBindBehaviorSelector from '$lib/components/advancedkey/nullbind/NullBindBehaviorSelector.svelte';
  import NullBindBottomOutControl from '$lib/components/advancedkey/nullbind/NullBindBottomOutControl.svelte';
  import NullBindBottomOutSlider from '$lib/components/advancedkey/nullbind/NullBindBottomOutSlider.svelte';
  import NullBindPerformanceTab from '$lib/components/advancedkey/nullbind/NullBindPerformanceTab.svelte';
  import NullBindKeyTesterTab from '$lib/components/advancedkey/nullbind/NullBindKeyTesterTab.svelte';
  import NullBindConfiguredKeys from '$lib/components/advancedkey/nullbind/NullBindConfiguredKeys.svelte';

  interface Props {
    onBack: () => void;
  }

  let { onBack }: Props = $props();

  let behavior = $state(0);
  let bottomOutPoint = $state(0);
  let actuationPoint = $state(1.5);
  let localSelectedKeys = $state<number[]>([]);
  let activeTab = $state<'performance' | 'key-tester'>('performance');
  let rtDown = $state(0);
  let rtUp = $state(0);
  let continuous = $state(false);
  let nullBindDeletingPairs = $state<Set<string>>(new Set());
  let nullBindNewlyAddedPairs = $state<Set<string>>(new Set());
  let uiBottomOutPoint = $state(4.0);
  let uiActuationPoint = $state(1.5);

  const SWITCH_DISTANCE = 4.0;
  const NULL_BIND_BEHAVIOR_METADATA = $derived([
    {
      behavior: 0,
      name: t('advancedkey.lastInputBehavior', $language),
      description: t('advancedkey.lastInputBehaviorDesc', $language),
    },
    {
      behavior: 1,
      name: t('advancedkey.absolutePriority1Behavior', $language),
      description: t('advancedkey.absolutePriority1BehaviorDesc', $language),
    },
    {
      behavior: 2,
      name: t('advancedkey.absolutePriority2Behavior', $language),
      description: t('advancedkey.absolutePriority2BehaviorDesc', $language),
    },
    {
      behavior: 3,
      name: t('advancedkey.neutralBehavior', $language),
      description: t('advancedkey.neutralBehaviorDesc', $language),
    },
    {
      behavior: 4,
      name: t('advancedkey.distanceBehavior', $language),
      description: t('advancedkey.distanceBehaviorDesc', $language),
    },
  ]);

  const configuredNullBindKeys = $derived(() => {
    const nullBindConfigs = Object.entries($globalConfigurations).filter(
      ([_, config]) => config.type === 'null-bind'
    );
    const uniquePairs = new Map();

    nullBindConfigs.forEach(([keyId, config]) => {
      const nullBindConfig = config as any;
      const pairKey = [...nullBindConfig.pairedKeys].sort().join('-');

      if (!uniquePairs.has(pairKey)) {
        uniquePairs.set(pairKey, [keyId, config]);
      }
    });

    return Array.from(uniquePairs.values());
  });

  const canConfigureNullBind = $derived(localSelectedKeys.length === 2);

  function updateNullBindConfiguration(): void {
    if (localSelectedKeys.length !== 2) return;

    const key1Label = getNullBindKeyLabel(localSelectedKeys[0]);
    const key2Label = getNullBindKeyLabel(localSelectedKeys[1]);

    localSelectedKeys.forEach(keyIndex => {
      const keyId = keyIndex.toString();
      const config: any = {
        type: 'null-bind',
        behavior: behavior,
        bottomOutPoint: bottomOutPoint,
        actuationPoint: actuationPoint,
        pairedKeys: [key1Label, key2Label],
        rtDown: rtDown,
        rtUp: rtUp,
        continuous: continuous,
      };

      updateGlobalConfiguration(keyId, config);
    });
  }

  function deleteNullBindPair(pairKeys: [string, string]): void {
    const pairId = `${pairKeys[0]}-${pairKeys[1]}`;

    nullBindDeletingPairs = new Set([...nullBindDeletingPairs, pairId]);

    setTimeout(() => {
      Object.entries($globalConfigurations).forEach(([keyId, config]) => {
        if (config.type === 'null-bind') {
          const nullConfig = config as any;
          if (
            (nullConfig.pairedKeys[0] === pairKeys[0] &&
              nullConfig.pairedKeys[1] === pairKeys[1]) ||
            (nullConfig.pairedKeys[0] === pairKeys[1] && nullConfig.pairedKeys[1] === pairKeys[0])
          ) {
            resetGlobalConfiguration(keyId);
          }
        }
      });

      nullBindDeletingPairs = new Set([...nullBindDeletingPairs].filter(id => id !== pairId));
    }, 300);
  }

  function applyNullBindConfiguration(): void {
    updateNullBindConfiguration();

    if (localSelectedKeys.length === 2) {
      const key1Label = getNullBindKeyLabel(localSelectedKeys[0]);
      const key2Label = getNullBindKeyLabel(localSelectedKeys[1]);

      const pairId1 = `${key1Label}-${key2Label}`;
      const pairId2 = `${key2Label}-${key1Label}`;
      const sortedPairId = [key1Label, key2Label].sort().join('-');

      nullBindNewlyAddedPairs = new Set([
        ...nullBindNewlyAddedPairs,
        pairId1,
        pairId2,
        sortedPairId,
      ]);

      setTimeout(() => {
        nullBindNewlyAddedPairs = new Set(
          [...nullBindNewlyAddedPairs].filter(
            id => id !== pairId1 && id !== pairId2 && id !== sortedPairId
          )
        );
      }, 500);
      let dynamic_key = new ekc.DynamicKeyMutex();
      dynamic_key.type = ekc.DynamicKeyType.DynamicKeyMutex;
      //dynamic_key.bindings[0] = ;
      //dynamic_key.bindings[1] = ;
      //dynamic_key.bindings[2] = ;
      //dynamic_key.bindings[3] = ;
      dynamic_key.target_keys_location[0].id = localSelectedKeys[0];
      dynamic_key.target_keys_location[0].layer = $selectedLayer;
      dynamic_key.target_keys_location[1].id = localSelectedKeys[1];
      dynamic_key.target_keys_location[1].layer = $selectedLayer;
      dynamic_key.key_id[0] = localSelectedKeys[0];
      dynamic_key.key_id[1] = localSelectedKeys[1];
      dynamic_key.mode = behavior;

    }

    // Clear selection
    localSelectedKeys = [];
  }

  function getNullBindKeyLabel(keyIndex: number): string {
    const controller = keyboardAPI.state.controller;
    if (!controller) return 'Unknown';

    try {
      const layoutJson = controller.get_layout_json();
      const layout = JSON.parse(layoutJson);
      const keys = layout;

      if (keys && keys[keyIndex]) {
        const key = keys[keyIndex];
        const label =
          key.labels?.[4] ||
          key.labels?.[0] ||
          key.labels?.find((l: string) => l && l.trim() !== '');
        return label || 'Unknown';
      }
    } catch (e) {
      console.error('Error getting key label:', e);
    }

    return 'Unknown';
  }

  function getNullBindBehaviorName(behaviorValue: number): string {
    const metadata = NULL_BIND_BEHAVIOR_METADATA.find(m => m.behavior === behaviorValue);
    return metadata ? metadata.name : 'Unknown';
  }

  function updateNullBindBottomOut(enabled: boolean): void {
    bottomOutPoint = enabled ? 4.0 : 0;
    if (enabled) {
      uiBottomOutPoint = 4.0;
    }
  }

  function updateNullBindRapidTrigger(enabled: boolean): void {
    if (enabled) {
      rtDown = 0.1;
      rtUp = 0;
      continuous = false;
    } else {
      rtDown = 0;
      rtUp = 0;
      continuous = false;
    }
  }

  function commitNullBindBottomOutPoint(): void {
    bottomOutPoint = uiBottomOutPoint;
  }

  function commitNullBindActuationPoint(): void {
    actuationPoint = uiActuationPoint;
  }

  $effect(() => {
    localSelectedKeys = $selectedKeys.slice(0, 2);
  });

  $effect(() => {
    if (bottomOutPoint > 0) {
      uiBottomOutPoint = bottomOutPoint;
    }
  });

  $effect(() => {
    uiActuationPoint = actuationPoint;
  });

  $effect(() => {
    if (localSelectedKeys.length === 2) {
      const firstKeyIndex = localSelectedKeys[0];
      const keyId = firstKeyIndex.toString();
      const existingConfig = $globalConfigurations[keyId] as any | undefined;

      if (existingConfig && existingConfig.type === 'null-bind') {
        behavior = existingConfig.behavior;
        bottomOutPoint = existingConfig.bottomOutPoint;
        actuationPoint = existingConfig.actuationPoint;
        uiActuationPoint = existingConfig.actuationPoint;
        if (existingConfig.bottomOutPoint > 0) {
          uiBottomOutPoint = existingConfig.bottomOutPoint;
        }
        rtDown = existingConfig.rtDown;
        rtUp = existingConfig.rtUp;
        continuous = existingConfig.continuous;
      }
    }
  });
</script>

<NullBindHeader {onBack} onApply={applyNullBindConfiguration} canApply={canConfigureNullBind} />

{#if !canConfigureNullBind}
  <NullBindKeySelection
    {localSelectedKeys}
    getKeyLabel={getNullBindKeyLabel}
    onRemoveKey={index => {
      const keyIndexToRemove = localSelectedKeys[index];
      if (keyIndexToRemove !== undefined) {
        localSelectedKeys = localSelectedKeys.filter((_, i) => i !== index);
      }
    }}
  />
{/if}

{#if canConfigureNullBind}
  <div class="flex-1 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex w-full gap-8">
        <div class="flex w-72 flex-col gap-4">
          <NullBindSelectedKeysInfo {localSelectedKeys} getKeyLabel={getNullBindKeyLabel} />

          <NullBindBehaviorSelector
            {behavior}
            behaviorMetadata={NULL_BIND_BEHAVIOR_METADATA}
            onBehaviorSelect={b => (behavior = b)}
          />

          <NullBindBottomOutControl {bottomOutPoint} onBottomOutToggle={updateNullBindBottomOut} />

          <NullBindBottomOutSlider
            {bottomOutPoint}
            {actuationPoint}
            {uiBottomOutPoint}
            switchDistance={SWITCH_DISTANCE}
            onBottomOutPointChange={value => (uiBottomOutPoint = value)}
            onCommitBottomOutPoint={commitNullBindBottomOutPoint}
          />
        </div>

        <div class="flex flex-1 flex-col">
          <div class="border-gray-200 dark:border-white border-b">
            <nav class="-mb-px flex space-x-8">
              <button
                class="py-2 px-1 border-b-2 font-medium text-sm transition-colors hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 {activeTab ===
                'performance'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-500 dark:text-gray-400'}"
                onclick={() => (activeTab = 'performance')}
              >
                {t('advancedkey.performance', $language)}
              </button>
              <button
                class="py-2 px-1 border-b-2 font-medium text-sm transition-colors hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 {activeTab ===
                'key-tester'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-500 dark:text-gray-400'}"
                onclick={() => (activeTab = 'key-tester')}
              >
                {t('advancedkey.keyTester', $language)}
              </button>
            </nav>
          </div>

          <div class="flex-1 mt-6">
            {#if activeTab === 'performance'}
              <NullBindPerformanceTab
                {rtDown}
                {actuationPoint}
                {uiActuationPoint}
                {bottomOutPoint}
                switchDistance={SWITCH_DISTANCE}
                onRapidTriggerToggle={updateNullBindRapidTrigger}
                onActuationPointChange={value => (uiActuationPoint = value)}
                onCommitActuationPoint={commitNullBindActuationPoint}
              />
            {:else if activeTab === 'key-tester'}
              <NullBindKeyTesterTab
                {localSelectedKeys}
                getKeyLabel={getNullBindKeyLabel}
                {behavior}
                {bottomOutPoint}
                {rtDown}
                getBehaviorName={getNullBindBehaviorName}
              />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if configuredNullBindKeys().length > 0}
  <NullBindConfiguredKeys
    configuredKeys={configuredNullBindKeys()}
    deletingPairs={nullBindDeletingPairs}
    newlyAddedPairs={nullBindNewlyAddedPairs}
    onDeletePair={deleteNullBindPair}
    getBehaviorName={getNullBindBehaviorName}
  />
{/if}
