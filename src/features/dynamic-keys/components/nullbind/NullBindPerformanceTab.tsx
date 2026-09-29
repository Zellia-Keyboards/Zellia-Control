/**
 * Port of `advancedkey/nullbind/NullBindPerformanceTab.svelte`. Its values are UI-only (D5): a
 * pair whose keys run a mutex loads them from, and writes every change back to, the mutex's
 * remembered fields; for other pairs they are local. The Svelte write-back ran as an effect that
 * re-triggered itself through the configuration store; here each change writes once.
 */
import {
  ActuationPointControl,
  DeadzoneControl,
  RapidTriggerToggle,
  SensitivityControl,
} from '../../../../components/ui';
import { deviceStore, useDeviceConfig, type DeviceConfig, type KeyLocation } from '../../../device';
import { useLoadedDraft } from '../../hooks/use-loaded-draft';
import { dynamicKeyOfKindAt, dynamicKeySignature, locationKey } from '../../model/configured-keys';
import {
  NULL_BIND_PERFORMANCE_DEFAULTS,
  loadNullBindPerformance,
  mutexFields,
  withPerformance,
  type NullBindPerformance,
} from '../../model/editor-drafts';
import { uiFields, uiFieldsStore, useUiFields, type UiFieldsState } from '../../store/ui-fields';
import styles from './NullBindPerformanceTab.module.css';

const MAX_TRAVEL_DISTANCE_MM = 4.0;

/** Loads when the keyboard selection is two keys and the first runs a mutex. */
function performanceSource(
  config: DeviceConfig | null,
  nullBind: UiFieldsState['nullBind'],
  selectedKeys: readonly number[],
  layer: number
) {
  const [first] = selectedKeys;
  const firstKey = selectedKeys.length === 2 && first !== undefined ? { layer, id: first } : null;
  const mutex = dynamicKeyOfKindAt(config, firstKey, 'mutex');
  const memoryKey = mutex?.dynamicKey.targets[0] ?? null;
  const fields = memoryKey ? nullBind[locationKey(memoryKey)] : undefined;
  return {
    mutex,
    fields,
    deps: [selectedKeys.join(','), layer, dynamicKeySignature(mutex?.dynamicKey ?? null), fields],
  };
}

export interface NullBindPerformanceTabProps {
  /** The keyboard selection (the Svelte tab read the selection store, not the editor's pair). */
  readonly selectedKeys: readonly number[];
  /** 0-based device layer. */
  readonly layer: number;
}

export function NullBindPerformanceTab({ selectedKeys, layer }: NullBindPerformanceTabProps) {
  const config = useDeviceConfig();
  const nullBind = useUiFields(state => state.nullBind);
  const source = performanceSource(config, nullBind, selectedKeys, layer);
  const {
    draft: performance,
    update,
    adopt,
  } = useLoadedDraft<NullBindPerformance>(
    source.deps,
    previous =>
      source.mutex
        ? loadNullBindPerformance(mutexFields(source.mutex.dynamicKey, source.fields))
        : previous,
    () => NULL_BIND_PERFORMANCE_DEFAULTS
  );
  const rapidTriggerEnabled = performance.rtDown > 0;

  /** Svelte write-back: each of the two selected keys that runs a mutex gets the values. */
  function persist(next: NullBindPerformance): void {
    if (selectedKeys.length !== 2) return;
    const current = deviceStore.getState().config;
    for (const id of selectedKeys) {
      const location: KeyLocation = { layer, id };
      const mutex = dynamicKeyOfKindAt(current, location, 'mutex')?.dynamicKey;
      const memoryKey = mutex?.targets[0];
      if (!mutex || !memoryKey) continue;
      const remembered = uiFieldsStore.getState().nullBind[locationKey(memoryKey)];
      uiFields.setNullBind(memoryKey, withPerformance(mutexFields(mutex, remembered), next));
    }
    // The tab already shows what it wrote.
    adopt(
      next,
      performanceSource(current, uiFieldsStore.getState().nullBind, selectedKeys, layer).deps
    );
  }

  function change(edit: (current: NullBindPerformance) => NullBindPerformance): void {
    const next = edit(performance);
    update(() => next);
    persist(next);
  }

  return (
    <div
      className="rounded-xl shadow flex flex-col md:flex-row flex-1 glassmorphism-card"
      style={{
        padding: 'calc(1.25rem * var(--ui-scale, 1))',
        gap: 'calc(1.25rem * var(--ui-scale, 1))',
      }}
    >
      <div
        className={`${styles['actuation-point-container'] ?? ''}${
          rapidTriggerEnabled ? ` ${styles['slide-out'] ?? ''}` : ''
        }`}
      >
        <ActuationPointControl
          actuationPoint={performance.actuationMm}
          deactivationPoint={performance.deactivationMm}
          keysSelected={selectedKeys.length}
          maxTravelDistance={MAX_TRAVEL_DISTANCE_MM}
          onActuationChange={actuationMm => {
            change(current => ({ ...current, actuationMm }));
          }}
          onDeactivationChange={deactivationMm => {
            change(current => ({ ...current, deactivationMm }));
          }}
        />
      </div>

      <div className="flex-1 min-w-[260px] flex flex-col">
        <RapidTriggerToggle
          rapidTriggerEnabled={rapidTriggerEnabled}
          onToggle={enabled => {
            change(current => ({ ...current, rtDown: enabled ? 0.1 : 0 }));
          }}
        />
        <div
          className={`flex-1 ${styles['rt-deadzone-container'] ?? ''}${
            rapidTriggerEnabled ? ` ${styles.show ?? ''}` : ''
          }`}
        >
          <DeadzoneControl
            upperDeadzone={performance.upperDeadzoneMm}
            lowerDeadzone={performance.lowerDeadzoneMm}
            maxTravelDistance={MAX_TRAVEL_DISTANCE_MM}
            onUpperChange={upperDeadzoneMm => {
              change(current => ({ ...current, upperDeadzoneMm }));
            }}
            onLowerChange={lowerDeadzoneMm => {
              change(current => ({ ...current, lowerDeadzoneMm }));
            }}
          />
        </div>
      </div>

      <div
        className="hidden md:block w-px bg-gray-200 dark:bg-white mx-2"
        style={{ opacity: rapidTriggerEnabled ? '1' : '0' }}
      ></div>

      <div
        className="flex-1 min-w-[260px]"
        style={{
          width: rapidTriggerEnabled ? 'auto' : '0',
          minWidth: rapidTriggerEnabled ? '260px' : '0',
          maxWidth: rapidTriggerEnabled ? 'none' : '0',
          overflow: 'hidden',
          opacity: rapidTriggerEnabled ? '1' : '0',
          pointerEvents: rapidTriggerEnabled ? 'auto' : 'none',
        }}
      >
        <SensitivityControl
          separateSensitivity={performance.separateSensitivity}
          sensitivityValue={performance.sensitivity}
          pressSensitivity={performance.pressSensitivity}
          releaseSensitivity={performance.releaseSensitivity}
          onToggleSeparate={separateSensitivity => {
            // Not one of the values the Svelte write-back watched.
            update(current => ({ ...current, separateSensitivity }));
          }}
          onSensitivityChange={value => {
            change(current => ({
              ...current,
              sensitivity: value,
              pressSensitivity: value,
              rtDown: value,
            }));
          }}
          onPressChange={value => {
            change(current => ({ ...current, pressSensitivity: value, rtDown: value }));
          }}
          onReleaseChange={releaseSensitivity => {
            change(current => ({ ...current, releaseSensitivity }));
          }}
        />
      </div>
    </div>
  );
}
