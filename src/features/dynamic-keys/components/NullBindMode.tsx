/**
 * Null-bind editor (port of `advancedkey/NullBindMode.svelte`): a mutex on the first two selected
 * keys of the selected layer. Apply sends the behavior's firmware mode plus the bottom-out flag
 * (D13) and each key's own binding; the other fields are UI-only (D5). The configured list and
 * its deletes are the keyboard's mutexes, one card per pair.
 */
import { useState } from 'react';
import {
  deviceSession,
  deviceStore,
  useDeviceConfig,
  type DeviceConfig,
  type KeyLocation,
} from '../../device';
import { useSelectedKeys, useSelectedLayer } from '../../keyboard';
import { useT } from '../../../lib/i18n';
import { removeDynamicKeyAt } from '../commands';
import { useLoadedDraft } from '../hooks/use-loaded-draft';
import { useTimeouts } from '../hooks/use-timeouts';
import {
  configuredMutexes,
  dynamicKeyOfKindAt,
  dynamicKeySignature,
  locationKey,
  ownBinding,
  type ConfiguredMutex,
} from '../model/configured-keys';
import {
  NULL_BIND_DRAFT,
  NULL_BIND_FIELD_DEFAULTS,
  NULL_BIND_SWITCH_DISTANCE_MM,
  loadNullBindDraft,
  mutexDraft,
  mutexFields,
  nullBindFieldsOnApply,
  withBottomOut,
  type NullBindDraft,
} from '../model/editor-drafts';
import { UNKNOWN_KEY_NAME } from '../model/key-names';
import { NULL_BIND_BEHAVIORS } from '../model/null-bind';
import { uiFields, useUiFields, type UiFieldsState } from '../store/ui-fields';
import { NullBindConfiguredKeys } from './nullbind/NullBindConfiguredKeys';
import {
  NullBindBehaviorSelector,
  NullBindBottomOutControl,
  NullBindBottomOutSlider,
  NullBindHeader,
  NullBindKeySelection,
  NullBindKeyTesterTab,
  NullBindSelectedKeysInfo,
  type KeyLabel,
} from './nullbind/NullBindParts';
import { NullBindPerformanceTab } from './nullbind/NullBindPerformanceTab';
import { NO_KEYS, withKey, withoutKey } from './shared/key-sets';

const DELETE_ANIMATION_MS = 300;
const ADDED_ANIMATION_MS = 500;

type Tab = 'performance' | 'key-tester';

/** The Svelte label lookup always fell back to "Unknown" (see `key-names.ts`). */
const getNullBindKeyLabel: KeyLabel = () => UNKNOWN_KEY_NAME;

/**
 * What the editor loads from: a pair whose first key runs a mutex loads it and the fields
 * remembered under the mutex's first key.
 */
function nullBindSource(
  config: DeviceConfig | null,
  nullBind: UiFieldsState['nullBind'],
  layer: number,
  pair: readonly number[]
) {
  const [first] = pair;
  const firstKey = pair.length === 2 && first !== undefined ? { layer, id: first } : null;
  const mutex = dynamicKeyOfKindAt(config, firstKey, 'mutex');
  const memoryKey = mutex?.dynamicKey.targets[0] ?? null;
  const fields = memoryKey ? nullBind[locationKey(memoryKey)] : undefined;
  return {
    mutex,
    fields,
    deps: [
      layer,
      pair.join(','),
      dynamicKeySignature(mutex?.dynamicKey ?? null),
      fields?.bottomOutMm,
    ],
  };
}

/** The editor's pair: the first two selected keys, until "Remove" drops one (Svelte local). */
interface LocalSelection {
  /** The selection this override was made for; a new selection resets it. */
  readonly source: readonly number[];
  readonly keys: readonly number[];
}

export interface NullBindModeProps {
  readonly onBack: () => void;
}

export function NullBindMode({ onBack }: NullBindModeProps) {
  const t = useT();
  const selectedKeys = useSelectedKeys();
  const layer = useSelectedLayer() - 1;
  const config = useDeviceConfig();
  const nullBindFields = useUiFields(state => state.nullBind);
  const schedule = useTimeouts();

  const [localSelection, setLocalSelection] = useState<LocalSelection | null>(null);
  const localSelectedKeys =
    localSelection?.source === selectedKeys ? localSelection.keys : selectedKeys.slice(0, 2);
  const canConfigureNullBind = localSelectedKeys.length === 2;

  const source = nullBindSource(config, nullBindFields, layer, localSelectedKeys);
  const { draft, update } = useLoadedDraft<NullBindDraft>(
    source.deps,
    previous => loadNullBindDraft(source.mutex?.dynamicKey ?? null, source.fields, previous),
    () => NULL_BIND_DRAFT
  );
  // A configured pair shows its remembered values, other pairs the editor defaults.
  const pairFields = source.mutex
    ? mutexFields(source.mutex.dynamicKey, source.fields)
    : NULL_BIND_FIELD_DEFAULTS;
  const [activeTab, setActiveTab] = useState<Tab>('performance');
  const [deletingPairs, setDeletingPairs] = useState(NO_KEYS);
  const [newlyAddedPairs, setNewlyAddedPairs] = useState(NO_KEYS);

  const configuredPairs = configuredMutexes(config?.dynamicKeys ?? []);

  function getNullBindBehaviorName(behaviorValue: number): string {
    const metadata = NULL_BIND_BEHAVIORS.find(option => option.behavior === behaviorValue);
    return metadata ? t(metadata.nameKey) : 'Unknown';
  }

  function deleteNullBindPair(pair: ConfiguredMutex): void {
    const pairId = locationKey(pair.targets[0]);
    setDeletingPairs(pairs => withKey(pairs, pairId));
    schedule(
      () => {
        removeDynamicKeyAt(pair.targets[0], 'mutex');
        setDeletingPairs(pairs => withoutKey(pairs, pairId));
      },
      DELETE_ANIMATION_MS,
      { flushOnUnmount: true }
    );
  }

  function applyNullBindConfiguration(): void {
    const [first, second] = localSelectedKeys;
    if (first !== undefined && second !== undefined && localSelectedKeys.length === 2) {
      const targets: readonly [KeyLocation, KeyLocation] = [
        { layer, id: first },
        { layer, id: second },
      ];
      const bindings = [ownBinding(config, targets[0]), ownBinding(config, targets[1])] as const;
      const remembered = source.mutex ? pairFields : undefined;
      // null: no free slot; the editor keeps its state (the device layer logs the rejection).
      if (deviceSession.applyDynamicKey(mutexDraft(targets, bindings, draft)) === null) return;

      const applied = dynamicKeyOfKindAt(deviceStore.getState().config, targets[0], 'mutex');
      const memoryKey = applied?.dynamicKey.targets[0] ?? targets[0];
      uiFields.setNullBind(memoryKey, nullBindFieldsOnApply(draft, remembered));
      const pairId = locationKey(memoryKey);
      setNewlyAddedPairs(pairs => withKey(pairs, pairId));
      schedule(() => {
        setNewlyAddedPairs(pairs => withoutKey(pairs, pairId));
      }, ADDED_ANIMATION_MS);
    }

    // Clear selection
    setLocalSelection({ source: selectedKeys, keys: [] });
  }

  const tabClass = (tab: Tab) =>
    `py-2 px-1 border-b-2 font-medium text-sm transition-colors hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 ${
      activeTab === tab
        ? 'border-primary-500 text-primary-500'
        : 'border-transparent text-gray-500 dark:text-gray-400'
    }`;

  return (
    <>
      <NullBindHeader
        onBack={onBack}
        onApply={applyNullBindConfiguration}
        canApply={canConfigureNullBind}
      />

      {!canConfigureNullBind && (
        <NullBindKeySelection
          localSelectedKeys={localSelectedKeys}
          getKeyLabel={getNullBindKeyLabel}
          onRemoveKey={index => {
            if (localSelectedKeys[index] !== undefined) {
              setLocalSelection({
                source: selectedKeys,
                keys: localSelectedKeys.filter((_, i) => i !== index),
              });
            }
          }}
        />
      )}

      {canConfigureNullBind && (
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex w-full gap-8">
              <div className="flex w-72 flex-col gap-4">
                <NullBindSelectedKeysInfo
                  localSelectedKeys={localSelectedKeys}
                  getKeyLabel={getNullBindKeyLabel}
                />

                <NullBindBehaviorSelector
                  behavior={draft.behavior}
                  onBehaviorSelect={behavior => {
                    update(current => ({ ...current, behavior }));
                  }}
                />

                <NullBindBottomOutControl
                  bottomOutPoint={draft.bottomOutMm}
                  onBottomOutToggle={enabled => {
                    update(current => withBottomOut(current, enabled));
                  }}
                />

                <NullBindBottomOutSlider
                  bottomOutPoint={draft.bottomOutMm}
                  actuationPoint={pairFields.actuationMm}
                  uiBottomOutPoint={draft.uiBottomOutMm}
                  switchDistance={NULL_BIND_SWITCH_DISTANCE_MM}
                  onBottomOutPointChange={uiBottomOutMm => {
                    update(current => ({ ...current, uiBottomOutMm }));
                  }}
                  onCommitBottomOutPoint={() => {
                    update(current => ({ ...current, bottomOutMm: current.uiBottomOutMm }));
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col">
                <div className="border-gray-200 dark:border-white border-b">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      type="button"
                      aria-pressed={activeTab === 'performance'}
                      className={tabClass('performance')}
                      onClick={() => {
                        setActiveTab('performance');
                      }}
                    >
                      {t('advancedkey.performance')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeTab === 'key-tester'}
                      className={tabClass('key-tester')}
                      onClick={() => {
                        setActiveTab('key-tester');
                      }}
                    >
                      {t('advancedkey.keyTester')}
                    </button>
                  </nav>
                </div>

                <div className="flex-1 mt-6">
                  {activeTab === 'performance' ? (
                    <NullBindPerformanceTab selectedKeys={selectedKeys} layer={layer} />
                  ) : (
                    <NullBindKeyTesterTab
                      localSelectedKeys={localSelectedKeys}
                      getKeyLabel={getNullBindKeyLabel}
                      behavior={draft.behavior}
                      bottomOutPoint={draft.bottomOutMm}
                      rtDown={pairFields.rtDown}
                      getBehaviorName={getNullBindBehaviorName}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {configuredPairs.length > 0 && (
        <NullBindConfiguredKeys
          configuredPairs={configuredPairs}
          deletingPairs={deletingPairs}
          newlyAddedPairs={newlyAddedPairs}
          onDeletePair={deleteNullBindPair}
          getKeyLabel={getNullBindKeyLabel}
          getBehaviorName={getNullBindBehaviorName}
        />
      )}
    </>
  );
}
