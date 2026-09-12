/**
 * Toggle editor (port of `advancedkey/ToggleMode.svelte`): a toggle key on the first selected key
 * of the selected layer. Apply writes it with `applyDynamicKey` (D6); trigger and state are
 * UI-only (D5); the configured list and its deletes are the keyboard's toggle keys.
 */
import { useState } from 'react';
import { NoKeySelected } from '../../../components/ui';
import {
  deviceSession,
  deviceStore,
  useDeviceConfig,
  type DeviceConfig,
  type KeyLocation,
} from '../../device';
import { useSelectedKeys, useSelectedLayer } from '../../keyboard';
import { useT } from '../../../lib/i18n';
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
  TOGGLE_DRAFT,
  loadToggleDraft,
  toggleDraft,
  type ToggleDraft,
} from '../model/editor-drafts';
import { keyIndexName } from '../model/key-names';
import { uiFields, uiFieldsStore, useUiFields, type UiFieldsState } from '../store/ui-fields';
import { NO_KEYS, withKey, withKeys, withoutKey } from './shared/key-sets';
import { KeycodePicker } from './shared/KeycodePicker';
import { ToggleConfiguredKeys } from './toggle/ToggleConfiguredKeys';
import {
  ToggleHeader,
  ToggleInfoPanel,
  ToggleModeSelector,
  TogglePreview,
  ToggleSelectedKeyInfo,
  ToggleStateControl,
} from './toggle/ToggleParts';

const DELETE_ANIMATION_MS = 500;
const ADDED_ANIMATION_MS = 600;

/** What the editor loads from: the key, its toggle and its remembered trigger/state. */
function toggleSource(
  config: DeviceConfig | null,
  toggle: UiFieldsState['toggle'],
  target: KeyLocation | null
) {
  const found = dynamicKeyOfKindAt(config, target, 'toggle');
  const fields = target ? toggle[locationKey(target)] : undefined;
  return {
    toggle: found,
    fields,
    deps: [target && locationKey(target), dynamicKeySignature(found?.dynamicKey ?? null), fields],
  };
}

export interface ToggleModeProps {
  readonly onBack: () => void;
}

export function ToggleMode({ onBack }: ToggleModeProps) {
  const t = useT();
  const selectedKeys = useSelectedKeys();
  const layer = useSelectedLayer();
  const config = useDeviceConfig();
  const toggleFields = useUiFields(state => state.toggle);
  const schedule = useTimeouts();

  const currentSelectedIndex = selectedKeys[0] ?? null;
  const target: KeyLocation | null =
    currentSelectedIndex === null ? null : { layer: layer - 1, id: currentSelectedIndex };
  const source = toggleSource(config, toggleFields, target);
  const { draft, update, adopt } = useLoadedDraft<ToggleDraft>(
    source.deps,
    () => loadToggleDraft(source.toggle?.dynamicKey ?? null, source.fields),
    () => TOGGLE_DRAFT
  );
  const [toggleDeletingKeys, setToggleDeletingKeys] = useState(NO_KEYS);
  const [toggleNewlyAddedKeys, setToggleNewlyAddedKeys] = useState(NO_KEYS);

  const configuredToggleKeys = configuredKeys(config?.dynamicKeys ?? [], 'toggle');
  const currentKeyName =
    currentSelectedIndex === null ? 'No key selected' : keyIndexName(currentSelectedIndex);

  function deleteToggleKey(entry: ConfiguredKey<'toggle'>): void {
    const keyId = locationKey(entry.target);
    setToggleDeletingKeys(keys => withKey(keys, keyId));
    schedule(
      () => {
        removeDynamicKeyAt(entry.target, 'toggle');
        setToggleDeletingKeys(keys => withoutKey(keys, keyId));
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  function resetAllToggleKeys(): void {
    const keysToDelete = configuredToggleKeys.map(entry => locationKey(entry.target));
    setToggleDeletingKeys(keys => withKeys(keys, keysToDelete));
    schedule(
      () => {
        removeDynamicKeysOfKind('toggle');
        setToggleDeletingKeys(NO_KEYS);
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  function applyToggleConfiguration(): void {
    if (!target) return;
    const keyId = locationKey(target);
    const isNewKey = source.toggle === null;
    // null: no free slot; the editor keeps its values (the device layer logs the rejection).
    if (deviceSession.applyDynamicKey(toggleDraft(target, draft)) === null) return;
    uiFields.setToggle(target, { trigger: draft.trigger, state: draft.state });
    adopt(
      draft,
      toggleSource(deviceStore.getState().config, uiFieldsStore.getState().toggle, target).deps
    );
    if (isNewKey) {
      setToggleNewlyAddedKeys(keys => withKey(keys, keyId));
      schedule(() => {
        setToggleNewlyAddedKeys(keys => withoutKey(keys, keyId));
      }, ADDED_ANIMATION_MS);
    }
  }

  return (
    <>
      <ToggleHeader
        onBack={onBack}
        onApply={applyToggleConfiguration}
        onResetAll={resetAllToggleKeys}
        canApply={currentSelectedIndex !== null}
      />

      <div className="p-4 sm:p-6 -mx-8">
        {currentSelectedIndex !== null ? (
          <div className="max-w-7xl mx-auto">
            <ToggleSelectedKeyInfo
              currentKeyName={currentKeyName}
              currentSelectedIndex={currentSelectedIndex}
              toggleState={draft.state}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <KeycodePicker
                  title={t('advancedkey.toggleAction')}
                  selectedAction={draft.binding}
                  onActionSelect={binding => {
                    update(current => ({ ...current, binding }));
                  }}
                  defaultExpandedSection="Basic"
                />

                <ToggleModeSelector
                  toggleMode={draft.trigger}
                  onModeSelect={trigger => {
                    update(current => ({ ...current, trigger }));
                  }}
                />

                <ToggleStateControl
                  toggleState={draft.state}
                  onStateToggle={() => {
                    update(current => ({ ...current, state: !current.state }));
                  }}
                />
              </div>

              <div className="xl:col-span-1 space-y-6">
                <TogglePreview
                  currentKeyName={currentKeyName}
                  selectedToggleAction={draft.binding}
                  toggleMode={draft.trigger}
                  toggleState={draft.state}
                />
                <ToggleInfoPanel selectedToggleAction={draft.binding} toggleMode={draft.trigger} />

                {configuredToggleKeys.length > 0 && (
                  <ToggleConfiguredKeys
                    configuredKeys={configuredToggleKeys}
                    deletingKeys={toggleDeletingKeys}
                    newlyAddedKeys={toggleNewlyAddedKeys}
                    onDeleteKey={deleteToggleKey}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <NoKeySelected tipKey="advancedkey.toggleTip" />
        )}
      </div>
    </>
  );
}
