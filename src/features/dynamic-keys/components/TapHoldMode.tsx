/**
 * Tap-hold editor (port of `advancedkey/TapHoldMode.svelte`): a mod-tap on the first selected key
 * of the selected layer. Apply writes it with `applyDynamicKey` (D6, D15); the hold delay is
 * UI-only (D5); the configured list and its deletes are the keyboard's mod-taps.
 */
import { useState } from 'react';
import { KeycodePicker, NoKeySelected } from '../../../components/ui';
import {
  deviceSession,
  deviceStore,
  useDeviceConfig,
  type DeviceConfig,
  type KeyLocation,
} from '../../device';
import { useSelectedKeys, useSelectedLayer } from '../../keyboard';
import { ACTION_CATEGORIES } from '../../keycodes';
import { removeDynamicKeyAt, removeDynamicKeysOfKind } from '../commands';
import { useLoadedDraft } from '../hooks/use-loaded-draft';
import { useTimeouts } from '../hooks/use-timeouts';
import {
  configuredKeys,
  dynamicKeyOfKindAt,
  dynamicKeySignature,
  locationKey,
  type ConfiguredKey,
} from '../model/configured-keys';
import {
  TAP_HOLD_DRAFT,
  loadTapHoldDraft,
  modTapDraft,
  type TapHoldDraft,
} from '../model/editor-drafts';
import { keyIndexName } from '../model/key-names';
import { uiFields, uiFieldsStore, useUiFields, type UiFieldsState } from '../store/ui-fields';
import { NO_KEYS, withKey, withKeys, withoutKey } from './shared/key-sets';
import { TapHoldConfiguredKeys } from './tap-hold/TapHoldConfiguredKeys';
import {
  TapHoldHeader,
  TapHoldInfoPanel,
  TapHoldPreview,
  TapHoldSelectedKeyInfo,
  TapHoldTimingConfig,
} from './tap-hold/TapHoldParts';

const DELETE_ANIMATION_MS = 500;
const ADDED_ANIMATION_MS = 600;

/** What the editor loads from: the key, its mod-tap and its remembered hold delay. */
function tapHoldSource(
  config: DeviceConfig | null,
  tapHold: UiFieldsState['tapHold'],
  target: KeyLocation | null
) {
  const modTap = dynamicKeyOfKindAt(config, target, 'modTap');
  const fields = target ? tapHold[locationKey(target)] : undefined;
  return {
    modTap,
    fields,
    deps: [target && locationKey(target), dynamicKeySignature(modTap?.dynamicKey ?? null), fields],
  };
}

export interface TapHoldModeProps {
  readonly onBack: () => void;
}

export function TapHoldMode({ onBack }: TapHoldModeProps) {
  const selectedKeys = useSelectedKeys();
  const layer = useSelectedLayer();
  const config = useDeviceConfig();
  const tapHoldFields = useUiFields(state => state.tapHold);
  const schedule = useTimeouts();

  const currentSelectedIndex = selectedKeys[0] ?? null;
  const target: KeyLocation | null =
    currentSelectedIndex === null ? null : { layer: layer - 1, id: currentSelectedIndex };
  const source = tapHoldSource(config, tapHoldFields, target);
  const { draft, update, adopt } = useLoadedDraft<TapHoldDraft>(
    source.deps,
    previous => loadTapHoldDraft(source.modTap?.dynamicKey ?? null, source.fields, previous),
    () => TAP_HOLD_DRAFT
  );
  const [deletingKeys, setDeletingKeys] = useState(NO_KEYS);
  const [newlyAddedKeys, setNewlyAddedKeys] = useState(NO_KEYS);

  const configuredTapHoldKeys = configuredKeys(config?.dynamicKeys ?? [], 'modTap');
  const currentKeyName =
    currentSelectedIndex === null ? 'No key selected' : keyIndexName(currentSelectedIndex);

  function deleteKey(entry: ConfiguredKey<'modTap'>): void {
    const keyId = locationKey(entry.target);
    setDeletingKeys(keys => withKey(keys, keyId));
    schedule(
      () => {
        removeDynamicKeyAt(entry.target, 'modTap');
        setDeletingKeys(keys => withoutKey(keys, keyId));
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  function resetAllConfigurations(): void {
    const keysToDelete = configuredTapHoldKeys.map(entry => locationKey(entry.target));
    setDeletingKeys(keys => withKeys(keys, keysToDelete));
    schedule(
      () => {
        removeDynamicKeysOfKind('modTap');
        setDeletingKeys(NO_KEYS);
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  function applyConfiguration(): void {
    if (!target) return;
    const keyId = locationKey(target);
    const isNewKey = source.modTap === null;
    // null: no free slot; the editor keeps its values (the device layer logs the rejection).
    if (deviceSession.applyDynamicKey(modTapDraft(target, draft)) === null) return;
    uiFields.setTapHold(target, { holdDelayMs: draft.holdDelayMs });
    adopt(
      draft,
      tapHoldSource(deviceStore.getState().config, uiFieldsStore.getState().tapHold, target).deps
    );
    if (isNewKey) {
      setNewlyAddedKeys(keys => withKey(keys, keyId));
      schedule(() => {
        setNewlyAddedKeys(keys => withoutKey(keys, keyId));
      }, ADDED_ANIMATION_MS);
    }
  }

  return (
    <>
      <TapHoldHeader
        currentSelectedIndex={currentSelectedIndex}
        onBack={onBack}
        onApply={applyConfiguration}
        onResetAll={resetAllConfigurations}
      />

      <div className="p-4 sm:p-6 -mx-8">
        {currentSelectedIndex !== null ? (
          <div className="max-w-7xl mx-auto">
            <TapHoldSelectedKeyInfo
              currentKeyName={currentKeyName}
              currentSelectedIndex={currentSelectedIndex}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <KeycodePicker
                  categories={ACTION_CATEGORIES}
                  title="Tap Action"
                  description="Select the action to perform when the key is tapped quickly"
                  selectedAction={draft.tap}
                  onActionSelect={tap => {
                    update(current => ({ ...current, tap }));
                  }}
                  defaultExpandedSection="Basic"
                />

                <KeycodePicker
                  categories={ACTION_CATEGORIES}
                  title="Hold Action"
                  description="Select the action to perform when the key is held down"
                  selectedAction={draft.hold}
                  onActionSelect={hold => {
                    update(current => ({ ...current, hold }));
                  }}
                  defaultExpandedSection="Basic"
                />

                <TapHoldTimingConfig
                  holdDelay={draft.holdDelayMs}
                  tapTimeout={draft.tapTimeoutMs}
                  onHoldDelayChange={holdDelayMs => {
                    update(current => ({ ...current, holdDelayMs }));
                  }}
                  onTapTimeoutChange={tapTimeoutMs => {
                    update(current => ({ ...current, tapTimeoutMs }));
                  }}
                />
              </div>

              <div className="xl:col-span-1 space-y-6">
                <TapHoldPreview
                  currentKeyName={currentKeyName}
                  tapAction={draft.tap}
                  holdAction={draft.hold}
                  holdDelay={draft.holdDelayMs}
                />
                <TapHoldInfoPanel
                  tapAction={draft.tap}
                  holdAction={draft.hold}
                  tapTimeout={draft.tapTimeoutMs}
                  holdDelay={draft.holdDelayMs}
                />
                <TapHoldConfiguredKeys
                  configuredKeys={configuredTapHoldKeys}
                  deletingKeys={deletingKeys}
                  newlyAddedKeys={newlyAddedKeys}
                  onDeleteKey={deleteKey}
                />
              </div>
            </div>
          </div>
        ) : (
          <NoKeySelected tipKey="advancedkey.tapHoldTip" />
        )}
      </div>
    </>
  );
}
