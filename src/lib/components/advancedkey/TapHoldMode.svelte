<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { keyboardAPI,keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
  } from '$lib/types/AdvancedKeyShared';

  import TapHoldSelectedKeyInfo from '$lib/components/advancedkey/tap-hold/TapHoldSelectedKeyInfo.svelte';
  import TapHoldActionSelector from '$lib/components/advancedkey/tap-hold/TapHoldActionSelector.svelte';
  import TapHoldTimingConfig from '$lib/components/advancedkey/tap-hold/TapHoldTimingConfig.svelte';
  import TapHoldPreview from '$lib/components/advancedkey/tap-hold/TapHoldPreview.svelte';
  import TapHoldInfoPanel from '$lib/components/advancedkey/tap-hold/TapHoldInfoPanel.svelte';
  import TapHoldConfiguredKeys from '$lib/components/advancedkey/tap-hold/TapHoldConfiguredKeys.svelte';
  import TapHoldNoKeySelected from '$lib/components/advancedkey/tap-hold/TapHoldNoKeySelected.svelte';
  import TapHoldHeader from '$lib/components/advancedkey/tap-hold/TapHoldHeader.svelte';
  import * as ekc from 'emi-keyboard-controller';
  import { advancedKeys, dyanmicKeys, rgbBaseConfig, rgbConfigs } from '$lib/stores/ControllerStore.svelte';
  import Layer from '../remap/Layer.svelte';
  import DynamicMode from './DynamicMode.svelte';

  interface Props {
    onBack: () => void;
  }

  let { onBack }: Props = $props();

  let currentLanguage = $derived($language);

  type TapHoldConfiguration = {
    type: 'tap-hold';
    tapAction: string;
    holdAction: string;
    holdDelay: number;
    tapTimeout: number;
  };

  let currentSelectedIndex = $derived($selectedKeys.length > 0 ? $selectedKeys[0] : null);
  let tapAction = $state('KC_ESC');
  let holdAction = $state('KC_LCTL');
  let holdDelay = $state(200);
  let tapTimeout = $state(150);
  let deletingKeys = $state(new Set<string>());
  let newlyAddedKeys = $state(new Set<string>());

  const configuredTapHoldKeys = $derived(
    Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'tap-hold')
  );

  function getCurrentKeyConfiguration(): TapHoldConfiguration | null {
    if (currentSelectedIndex === null) return null;
    const keyId = `${currentSelectedIndex}`;
    const config = $globalConfigurations[keyId];

    if (config && config.type === 'tap-hold') {
      return config as TapHoldConfiguration;
    }

    return {
      type: 'tap-hold',
      tapAction: tapAction,
      holdAction: holdAction,
      holdDelay: holdDelay,
      tapTimeout: tapTimeout,
    };
  }

  function updateConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;
    const config: TapHoldConfiguration = {
      type: 'tap-hold',
      tapAction: tapAction,
      holdAction: holdAction,
      holdDelay: holdDelay,
      tapTimeout: tapTimeout,
    };
    updateGlobalConfiguration(keyId, config);
  }

  function deleteKey(keyId: string): void {
    deletingKeys.add(keyId);
    deletingKeys = new Set(deletingKeys);

    setTimeout(() => {
      resetGlobalConfiguration(keyId);
      deletingKeys.delete(keyId);
      deletingKeys = new Set(deletingKeys);
    }, 500);
  }

  function resetAllConfigurations(): void {
    const keysToDelete = [...configuredTapHoldKeys.map(([keyId]) => keyId)];

    keysToDelete.forEach(keyId => {
      deletingKeys.add(keyId);
    });
    deletingKeys = new Set(deletingKeys);

    setTimeout(() => {
      keysToDelete.forEach(keyId => {
        resetGlobalConfiguration(keyId);
      });
      deletingKeys.clear();
      deletingKeys = new Set(deletingKeys);
    }, 500);
  }

  function applyConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;

    const isNewKey =
      !$globalConfigurations[keyId] || $globalConfigurations[keyId].type !== 'tap-hold';

    updateConfiguration();

    if (isNewKey) {
      newlyAddedKeys.add(keyId);
      newlyAddedKeys = new Set(newlyAddedKeys);
      setTimeout(() => {
        newlyAddedKeys.delete(keyId);
        newlyAddedKeys = new Set(newlyAddedKeys);
      }, 600);
    }
    let dynamic_key = new ekc.DynamicKeyModTap();
    //dynamic_key.bindings[0] = ; 
    //dynamic_key.bindings[0] = ; 
    dynamic_key.type = ekc.DynamicKeyType.DynamicKeyModTap;
    dynamic_key.duration = tapTimeout;
    dynamic_key.target_keys_location[0].id = currentSelectedIndex;
    dynamic_key.target_keys_location[0].layer = $selectedLayer;
    keyboardConnectionState.controller?.send_dynamic_key_packet(0, dynamic_key);
  }


  const currentKeyName = $derived.by(() => {
    if (currentSelectedIndex === null) return 'No key selected';
    const controller = keyboardAPI.state.controller;
    if (!controller) return 'Unknown';

    try {
      const layoutJson = controller.get_layout_json();
      const layout = JSON.parse(layoutJson);
      const keys = layout;

      if (keys && keys[currentSelectedIndex]) {
        const key = keys[currentSelectedIndex];
        if (key.labels && key.labels.length > 0) {
          const label = key.labels.find((l: string) => l && l.trim());
          if (label) return label;
        }
      }
    } catch (e) {
      console.error('Error getting key label:', e);
    }

    return `Key ${currentSelectedIndex}`;
  });

  $effect(() => {
    if (currentSelectedIndex !== null) {
      const config = getCurrentKeyConfiguration();
      if (config && $globalConfigurations[`${currentSelectedIndex}`]) {
        tapAction = config.tapAction || 'KC_ESC';
        holdAction = config.holdAction || 'KC_LCTL';
        holdDelay = config.holdDelay || 200;
        tapTimeout = config.tapTimeout || 150;
      }
    }
  });
</script>

<TapHoldHeader
  {currentSelectedIndex}
  {onBack}
  onApply={applyConfiguration}
  onResetAll={resetAllConfigurations}
/>

<div class="p-4 sm:p-6 -mx-8">
  {#if currentSelectedIndex !== null}
    <div class="max-w-7xl mx-auto">
      <TapHoldSelectedKeyInfo {currentKeyName} {currentSelectedIndex} />

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 space-y-6">
          <TapHoldActionSelector
            title="Tap Action"
            description="Select the action to perform when the key is tapped quickly"
            bind:selectedAction={tapAction}
            onActionSelect={action => (tapAction = action)}
            highlightColor="primary"
          />

          <TapHoldActionSelector
            title="Hold Action"
            description="Select the action to perform when the key is held down"
            bind:selectedAction={holdAction}
            onActionSelect={action => (holdAction = action)}
            highlightColor="green"
          />

          <TapHoldTimingConfig bind:holdDelay bind:tapTimeout />
        </div>

        <div class="xl:col-span-1 space-y-6">
          <TapHoldPreview {currentKeyName} {tapAction} {holdAction} {holdDelay} />
          <TapHoldInfoPanel {tapAction} {holdAction} {tapTimeout} {holdDelay} />
          <TapHoldConfiguredKeys {deletingKeys} {newlyAddedKeys} onDeleteKey={deleteKey} />
        </div>
      </div>
    </div>
  {:else}
    <TapHoldNoKeySelected />
  {/if}
</div>
