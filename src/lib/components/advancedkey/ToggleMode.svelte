<script lang="ts">
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import {
    globalConfigurations,
    updateGlobalConfiguration,
    resetGlobalConfiguration,
  } from '$lib/types/AdvancedKeyShared';
  import type { ToggleConfiguration } from '$lib/types/AdvancedKeyShared';
  import {
    advancedKeys,
    dynamicKeys,
    keymap,
    rgbBaseConfig,
    rgbConfigs,
  } from '$lib/stores/ControllerStore.svelte';
  import * as ekc from 'emi-keyboard-controller';
  import { selectedLayer } from '$lib/stores/SelectedLayerStore.svelte';

  import ToggleHeader from '$lib/components/advancedkey/toggle/ToggleHeader.svelte';
  import ToggleSelectedKeyInfo from '$lib/components/advancedkey/toggle/ToggleSelectedKeyInfo.svelte';
  import ToggleActionSelector from '$lib/components/advancedkey/toggle/ToggleActionSelector.svelte';
  import ToggleModeSelector from '$lib/components/advancedkey/toggle/ToggleModeSelector.svelte';
  import ToggleStateControl from '$lib/components/advancedkey/toggle/ToggleStateControl.svelte';
  import TogglePreview from '$lib/components/advancedkey/toggle/TogglePreview.svelte';
  import ToggleInfoPanel from '$lib/components/advancedkey/toggle/ToggleInfoPanel.svelte';
  import ToggleConfiguredKeys from '$lib/components/advancedkey/toggle/ToggleConfiguredKeys.svelte';
  import ToggleNoKeySelected from '$lib/components/advancedkey/toggle/ToggleNoKeySelected.svelte';

  interface Props {
    onBack: () => void;
  }

  let { onBack }: Props = $props();

  let currentSelectedIndex = $derived($selectedKeys.length > 0 ? $selectedKeys[0] : null);
  let selectedToggleAction = $state(0x39); // CAPS LOCK
  let toggleMode = $state('press');
  let toggleState = $state(false);
  let toggleDeletingKeys = $state(new Set<string>());
  let toggleNewlyAddedKeys = $state(new Set<string>());

  const configuredToggleKeys = $derived(
    Object.entries($globalConfigurations).filter(([_, config]) => config.type === 'toggle')
  );

  function getCurrentToggleConfiguration(): ToggleConfiguration | null {
    if (currentSelectedIndex === null) return null;
    const keyId = `${currentSelectedIndex}`;
    const config = $globalConfigurations[keyId];
    if (config && config.type === 'toggle') {
      return config as ToggleConfiguration;
    }
    return {
      type: 'toggle',
      toggleAction: selectedToggleAction,
      toggleMode: toggleMode,
      toggleState: toggleState,
    };
  }

  function updateToggleConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;
    const config: ToggleConfiguration = {
      type: 'toggle',
      toggleAction: selectedToggleAction,
      toggleMode: toggleMode,
      toggleState: toggleState,
    };
    updateGlobalConfiguration(keyId, config);
  }

  function deleteToggleKey(keyId: string): void {
    toggleDeletingKeys.add(keyId);
    toggleDeletingKeys = new Set(toggleDeletingKeys);

    setTimeout(() => {
      resetGlobalConfiguration(keyId);
      toggleDeletingKeys.delete(keyId);
      toggleDeletingKeys = new Set(toggleDeletingKeys);
    }, 500);
  }

  function resetAllToggleKeys(): void {
    const keysToDelete = [...configuredToggleKeys.map(([keyId]) => keyId)];

    keysToDelete.forEach(keyId => {
      toggleDeletingKeys.add(keyId);
    });
    toggleDeletingKeys = new Set(toggleDeletingKeys);

    setTimeout(() => {
      keysToDelete.forEach(keyId => {
        resetGlobalConfiguration(keyId);
      });
      toggleDeletingKeys.clear();
      toggleDeletingKeys = new Set(toggleDeletingKeys);
    }, 500);
  }

  function applyToggleConfiguration(): void {
    if (currentSelectedIndex === null) return;
    const keyId = `${currentSelectedIndex}`;

    const isNewKey =
      !$globalConfigurations[keyId] || $globalConfigurations[keyId].type !== 'toggle';

    updateToggleConfiguration();

    if (isNewKey) {
      toggleNewlyAddedKeys.add(keyId);
      toggleNewlyAddedKeys = new Set(toggleNewlyAddedKeys);
      setTimeout(() => {
        toggleNewlyAddedKeys.delete(keyId);
        toggleNewlyAddedKeys = new Set(toggleNewlyAddedKeys);
      }, 600);
    }

    let dynamic_key = new ekc.DynamicKeyToggleKey();
    dynamic_key.type = ekc.DynamicKeyType.DynamicKeyToggleKey;
    dynamic_key.bindings[0] = selectedToggleAction;
    dynamic_key.target_keys_location[0] = new ekc.KeyLocation();
    dynamic_key.target_keys_location[0].id = currentSelectedIndex;
    dynamic_key.target_keys_location[0].layer = $selectedLayer - 1;
    let dynamic_key_index = $dynamicKeys.findIndex(
      item => item.type == ekc.DynamicKeyType.DynamicKeyNone
    );
    $dynamicKeys[dynamic_key_index] = dynamic_key;
    $dynamicKeys = $dynamicKeys;
    $keymap[$selectedLayer - 1][currentSelectedIndex] =
      ekc.Keycode.DynamicKey | (dynamic_key_index << 8);
    keyboardConnectionState.controller?.set_dynamic_keys($dynamicKeys);
    keyboardConnectionState.controller?.send_keymap_packet(
      [currentSelectedIndex],
      $selectedLayer - 1,
      $keymap[$selectedLayer - 1][currentSelectedIndex]
    );
    keyboardConnectionState.controller?.send_dynamic_key_packet(dynamic_key_index, dynamic_key);
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
      const keyId = `${currentSelectedIndex}`;
      const config = $globalConfigurations[keyId];
      if (config && config.type === 'toggle') {
        selectedToggleAction = config.toggleAction || 0x39; // CAPS LOCK
        toggleMode = config.toggleMode || 'press';
        toggleState = config.toggleState || false;
      } else {
        selectedToggleAction = 0x39; // CAPS LOCK
        toggleMode = 'press';
        toggleState = false;
      }
    }
  });
</script>

<ToggleHeader
  {onBack}
  onApply={applyToggleConfiguration}
  onResetAll={resetAllToggleKeys}
  canApply={currentSelectedIndex !== null}
/>

<div class="p-4 sm:p-6 -mx-8">
  {#if currentSelectedIndex !== null}
    <div class="max-w-7xl mx-auto">
      <ToggleSelectedKeyInfo {currentKeyName} {currentSelectedIndex} {toggleState} />

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 space-y-6">
          <ToggleActionSelector
            {selectedToggleAction}
            onActionSelect={action => (selectedToggleAction = action)}
          />

          <ToggleModeSelector {toggleMode} onModeSelect={mode => (toggleMode = mode)} />

          <ToggleStateControl {toggleState} onStateToggle={() => (toggleState = !toggleState)} />
        </div>

        <div class="xl:col-span-1 space-y-6">
          <TogglePreview
            {currentKeyName}
            {selectedToggleAction}
            {toggleMode}
            {toggleState}
          />
          <ToggleInfoPanel {selectedToggleAction} {toggleMode} />

          {#if configuredToggleKeys.length > 0}
            <ToggleConfiguredKeys
              configuredKeys={configuredToggleKeys}
              deletingKeys={toggleDeletingKeys}
              newlyAddedKeys={toggleNewlyAddedKeys}
              onDeleteKey={deleteToggleKey}
            />
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <ToggleNoKeySelected />
  {/if}
</div>
