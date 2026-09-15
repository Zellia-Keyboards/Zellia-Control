/**
 * Dynamic keystroke (DKS) editor (port of `advancedkey/DynamicMode.svelte` and the page's
 * `dksCurrentSelected` wiring): four bindings with a four-stage slider each on the first selected
 * key of the selected layer (D14). Apply encodes the bitmaps with the DKS codec and writes the
 * stroke with `applyDynamicKey`; Reset removes the key's DKS and loads the preset (§8).
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { NoKeySelected } from '../../../components/ui';
import {
  deviceSession,
  deviceStore,
  useDeviceConfig,
  type DeviceConfig,
  type KeyLocation,
  type Keycode,
} from '../../device';
import { useSelectedKeys, useSelectedLayer } from '../../keyboard';
import { useT, type TranslationKey } from '../../../lib/i18n';
import { removeDynamicKeyAt } from '../commands';
import { useLoadedDraft } from '../hooks/use-loaded-draft';
import { useTimeouts } from '../hooks/use-timeouts';
import {
  configuredKeys,
  dynamicKeyOfKindAt,
  dynamicKeySignature,
  locationKey,
  type ConfiguredKey,
} from '../model/configured-keys';
import { DKS_RESET_PRESET, type DksEditorState } from '../model/defaults';
import {
  canStartDrag,
  clickNode,
  commitDrag,
  deleteInterval,
  dragInterval,
  type DksBitmap,
} from '../model/dks-bitmap';
import { loadDksEditor, strokeDraft } from '../model/editor-drafts';
import { UNKNOWN_KEY_NAME } from '../model/key-names';
import { BottomOutPointConfig } from './dynamic/BottomOutPointConfig';
import { ConfiguredDKSList } from './dynamic/ConfiguredDKSList';
import { DKSBindingRow } from './dynamic/DKSBindingRow';
import {
  DKSBinding,
  DKSHeader,
  DKSKeyTester,
  DKSPhaseHeader,
  SelectedKeyInfo,
} from './dynamic/DKSParts';
import { DKSPerformance } from './dynamic/DKSPerformance';
import { NO_KEYS, withKey, withoutKey } from './shared/key-sets';
import styles from './DynamicMode.module.css';

const ADDED_ANIMATION_MS = 500;
const SECTION_DELAY_MS = 100;

type Bitmaps = DksEditorState['bitmaps'];

/** The editor state plus the preview bitmaps drawn while a grip is dragged. */
interface DksDraft {
  readonly editor: DksEditorState;
  readonly preview: Bitmaps;
}

function draftOf(editor: DksEditorState): DksDraft {
  return { editor, preview: editor.bitmaps };
}

function replaceAt(bitmaps: Bitmaps, index: number, bitmap: DksBitmap): Bitmaps {
  const [b0, b1, b2, b3] = bitmaps;
  return [
    index === 0 ? bitmap : b0,
    index === 1 ? bitmap : b1,
    index === 2 ? bitmap : b2,
    index === 3 ? bitmap : b3,
  ];
}

function bitmapAt(bitmaps: Bitmaps, index: number): DksBitmap {
  const bitmap = bitmaps[index];
  if (!bitmap) throw new RangeError(`DKS binding index must be 0..3, got ${index}`);
  return bitmap;
}

/** Commits a binding's bitmap; every preview follows the committed bitmaps again. */
function commitBitmap(draft: DksDraft, index: number, bitmap: DksBitmap): DksDraft {
  return draftOf({ ...draft.editor, bitmaps: replaceAt(draft.editor.bitmaps, index, bitmap) });
}

/** What the editor loads from: the key and its DKS. */
function dksSource(config: DeviceConfig | null, target: KeyLocation | null) {
  const stroke = dynamicKeyOfKindAt(config, target, 'stroke');
  return {
    stroke,
    deps: [target && locationKey(target), dynamicKeySignature(stroke?.dynamicKey ?? null)],
  };
}

type Tab = 'bindings' | 'performance' | 'key-tester';

const TABS: readonly (readonly [Tab, TranslationKey])[] = [
  ['bindings', 'advancedkey.bindings'],
  ['performance', 'advancedkey.performance'],
  ['key-tester', 'advancedkey.keyTester'],
];

interface DragState {
  readonly bindingIndex: number;
  readonly nodeIndex: number;
  readonly startMouseX: number;
}

export interface DynamicModeProps {
  readonly onBack: () => void;
}

export function DynamicMode({ onBack }: DynamicModeProps) {
  const t = useT();
  const selectedKeys = useSelectedKeys();
  const layer = useSelectedLayer() - 1;
  const config = useDeviceConfig();
  const schedule = useTimeouts();

  const [firstKey] = selectedKeys;
  // Svelte `dksCurrentSelected`: [layer, key] of the first selected key (the layer was always 0).
  const currentSelected: readonly [number, number] | null =
    firstKey === undefined ? null : [layer, firstKey];
  const target: KeyLocation | null = firstKey === undefined ? null : { layer, id: firstKey };
  const currentKeyName = currentSelected ? UNKNOWN_KEY_NAME : 'No key selected';

  const source = dksSource(config, target);
  const { draft, update, adopt } = useLoadedDraft<DksDraft>(
    source.deps,
    () => draftOf(loadDksEditor(source.stroke?.dynamicKey ?? null)),
    () => draftOf(loadDksEditor(null))
  );
  const { editor, preview } = draft;
  const [selectedBindingIndex, setSelectedBindingIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('bindings');
  const [newlyAddedKeys, setNewlyAddedKeys] = useState(NO_KEYS);

  // Grip drags follow the mouse over the whole document (Svelte global listeners).
  const drag = useRef<DragState | null>(null);
  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const state = drag.current;
      if (!state) return;
      const deltaX = event.clientX - state.startMouseX;
      const { bindingIndex, nodeIndex } = state;
      update(current => ({
        ...current,
        preview: replaceAt(
          current.preview,
          bindingIndex,
          dragInterval(
            bitmapAt(current.editor.bitmaps, bindingIndex),
            bitmapAt(current.preview, bindingIndex),
            nodeIndex,
            deltaX
          )
        ),
      }));
    };
    const handleMouseUp = () => {
      const state = drag.current;
      drag.current = null;
      if (!state) return;
      update(current =>
        commitBitmap(
          current,
          state.bindingIndex,
          commitDrag(bitmapAt(current.preview, state.bindingIndex))
        )
      );
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [update]);

  const dksConfiguredList = configuredKeys(config?.dynamicKeys ?? [], 'stroke');
  const hasConfiguredKeys = dksConfiguredList.length > 0;
  // Shown 100 ms after the first DKS appears, hidden at once when the last one goes.
  const [sectionShown, setSectionShown] = useState(false);
  if (!hasConfiguredKeys && sectionShown) setSectionShown(false);
  useEffect(() => {
    if (!hasConfiguredKeys || sectionShown) return;
    const timer = setTimeout(() => {
      setSectionShown(true);
    }, SECTION_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hasConfiguredKeys, sectionShown]);

  function handleNodeClick(bindingIndex: number, nodeIndex: number): void {
    update(current => {
      const committed = bitmapAt(current.editor.bitmaps, bindingIndex);
      const next = clickNode(committed, bitmapAt(current.preview, bindingIndex), nodeIndex);
      return next === committed ? current : commitBitmap(current, bindingIndex, next);
    });
  }

  function handleIntervalClick(bindingIndex: number, start: number): void {
    update(current =>
      commitBitmap(
        current,
        bindingIndex,
        deleteInterval(bitmapAt(current.preview, bindingIndex), start)
      )
    );
  }

  function handleGripMouseDown(event: MouseEvent, bindingIndex: number, nodeIndex: number): void {
    if (!canStartDrag(bitmapAt(preview, bindingIndex), nodeIndex)) return;
    drag.current = { bindingIndex, nodeIndex, startMouseX: event.clientX };
    event.preventDefault();
  }

  function setBinding(bindingIndex: number, keycode: Keycode): void {
    update(current => {
      const [b0, b1, b2, b3] = current.editor.bindings;
      const bindings = [
        bindingIndex === 0 ? keycode : b0,
        bindingIndex === 1 ? keycode : b1,
        bindingIndex === 2 ? keycode : b2,
        bindingIndex === 3 ? keycode : b3,
      ] as const;
      return { ...current, editor: { ...current.editor, bindings } };
    });
  }

  function dksResetConfiguration(): void {
    if (!target) return;
    removeDynamicKeyAt(target, 'stroke');
    adopt(draftOf(DKS_RESET_PRESET), dksSource(deviceStore.getState().config, target).deps);
  }

  function dksApplyConfiguration(): void {
    if (!target) return;
    // null: no free slot; the editor keeps its values (the device layer logs the rejection).
    if (deviceSession.applyDynamicKey(strokeDraft(target, editor)) === null) return;
    // Keep showing the applied bitmaps (the device may store some of them normalized, PL-021).
    adopt(draft, dksSource(deviceStore.getState().config, target).deps);
    const keyId = locationKey(target);
    setNewlyAddedKeys(keys => withKey(keys, keyId));
    schedule(() => {
      setNewlyAddedKeys(keys => withoutKey(keys, keyId));
    }, ADDED_ANIMATION_MS);
  }

  function dksDeleteKey(entry: ConfiguredKey<'stroke'>): void {
    removeDynamicKeyAt(entry.target, 'stroke');
  }

  const selectedBinding =
    selectedBindingIndex === null ? null : (editor.bindings[selectedBindingIndex] ?? null);

  return (
    <>
      <DKSHeader
        onBack={onBack}
        onApply={dksApplyConfiguration}
        onReset={dksResetConfiguration}
        canApply={currentSelected !== null}
      />

      <div className="flex-1 p-6 overflow-y-auto -mx-8">
        {currentSelected ? (
          <div className="max-w-7xl mx-auto">
            <SelectedKeyInfo
              currentKeyName={currentKeyName}
              currentSelectedCoords={currentSelected}
            />

            <div className="flex gap-8">
              <div className="w-96 flex flex-col gap-4">
                <div className="rounded-lg border p-6 bg-primary-50 dark:bg-black dark:border-primary-200 border-[#e5e5e5] glassmorphism-card">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('advancedkey.configureDKSBindings')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('advancedkey.dksBindingInstructions')}
                  </p>

                  <DKSPhaseHeader />

                  <div className="space-y-2">
                    {editor.bindings.map((binding, bindingIndex) => (
                      <DKSBindingRow
                        key={bindingIndex}
                        bindingIndex={bindingIndex}
                        binding={binding}
                        uiBitmap={bitmapAt(preview, bindingIndex)}
                        selectedBindingIndex={selectedBindingIndex}
                        onSelectBinding={index => {
                          setSelectedBindingIndex(current => (current === index ? null : index));
                        }}
                        onNodeClick={handleNodeClick}
                        onIntervalClick={handleIntervalClick}
                        onGripMouseDown={handleGripMouseDown}
                      />
                    ))}
                  </div>
                </div>
                <BottomOutPointConfig
                  bottomOutPointValue={editor.bottomOutMm}
                  onChange={bottomOutMm => {
                    update(current => ({
                      ...current,
                      editor: { ...current.editor, bottomOutMm },
                    }));
                  }}
                />
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex border-b mb-6 dark:border-primary-200 border-[#e5e5e5]">
                  {TABS.map(([value, labelKey]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={activeTab === value}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === value
                          ? 'border-primary-500 text-primary-500'
                          : 'border-transparent text-gray-500 dark:text-gray-400'
                      }`}
                      onClick={() => {
                        setActiveTab(value);
                      }}
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>

                {activeTab === 'bindings' ? (
                  <DKSBinding
                    selectedBindingIndex={selectedBindingIndex}
                    selectedAction={selectedBinding}
                    onActionSelect={keycode => {
                      if (selectedBindingIndex !== null) setBinding(selectedBindingIndex, keycode);
                    }}
                    onDone={() => {
                      setSelectedBindingIndex(null);
                    }}
                  />
                ) : activeTab === 'performance' ? (
                  <DKSPerformance selectedKeys={selectedKeys} />
                ) : (
                  <DKSKeyTester currentKeyName={currentKeyName} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <NoKeySelected tipKey="advancedkey.tipDynamic" />
        )}
        {hasConfiguredKeys && sectionShown && (
          <div className={`${styles['animate-fade-in'] ?? ''} mt-6`}>
            <ConfiguredDKSList
              configuredDynamicKeys={dksConfiguredList}
              newlyAddedKeys={newlyAddedKeys}
              onDeleteKey={dksDeleteKey}
            />
          </div>
        )}
      </div>
    </>
  );
}
