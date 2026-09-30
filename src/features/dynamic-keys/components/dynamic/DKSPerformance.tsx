/**
 * Port of `advancedkey/dynamic/Performance.svelte`: the selected keys' actuation and deactivation
 * points. They load from the first selected key's advanced key (the Svelte tab read top-level
 * fields of the nested config and showed NaN) and are written only when changed, to every
 * selected key in normal mode ("DKS forces normal mode"), through `setAdvancedKeys`. The Svelte
 * tab rewrote the selected keys as soon as it opened.
 */
import { Info } from 'lucide-react';
import { KeyMode } from 'emi-keyboard-controller';
import { deviceSession, deviceStore, useDeviceConfig } from '../../../device';
import { fractionToMm, mmToFraction } from '../../../device/model/units';
import { useT } from '../../../../lib/i18n';
import { ActuationPointControl } from '../performance/ActuationPointControl';

const MAX_TRAVEL_DISTANCE_MM = 4.0;
/** Shown while no key's values are known (the Svelte initial state). */
const DEFAULT_ACTUATION_MM = 2.0;
const DEFAULT_DEACTIVATION_MM = 1.5;

export interface DKSPerformanceProps {
  readonly selectedKeys: readonly number[];
}

export function DKSPerformance({ selectedKeys }: DKSPerformanceProps) {
  const t = useT();
  const config = useDeviceConfig();
  const [first] = selectedKeys;
  const key = first === undefined ? undefined : config?.advancedKeys[first];
  const actuationPoint = key ? fractionToMm(key.activation) : DEFAULT_ACTUATION_MM;
  const deactivationPoint = key ? fractionToMm(key.deactivation) : DEFAULT_DEACTIVATION_MM;

  function apply(activationMm: number, deactivationMm: number): void {
    const current =
      first === undefined ? undefined : deviceStore.getState().config?.advancedKeys[first];
    if (!current) return;
    deviceSession.setAdvancedKeys(selectedKeys, {
      ...current,
      mode: KeyMode.KeyAnalogNormalMode,
      activation: mmToFraction(activationMm),
      deactivation: mmToFraction(deactivationMm),
    });
  }

  return (
    <div className="rounded-lg border p-6 bg-white dark:bg-black border-gray-200 dark:border-gray-700 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('advancedkey.performanceSettings')}
      </h3>

      <div className="space-y-4">
        <ActuationPointControl
          actuationPoint={actuationPoint}
          deactivationPoint={deactivationPoint}
          keysSelected={selectedKeys.length}
          maxTravelDistance={MAX_TRAVEL_DISTANCE_MM}
          onActuationChange={value => {
            apply(value, deactivationPoint);
          }}
          onDeactivationChange={value => {
            apply(actuationPoint, value);
          }}
        />

        {/* The Svelte inline colours carry a `dark:` suffix, which makes them invalid CSS. */}
        <div
          className="flex items-start gap-3 p-4 border rounded-lg glassmorphism-card"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--theme-color-primary) 5%, #f0f9ff) dark:color-mix(in srgb, var(--theme-color-primary) 8%, #111827)',
            borderColor:
              'color-mix(in srgb, var(--theme-color-primary) 15%, #bfdbfe) dark:color-mix(in srgb, var(--theme-color-primary) 20%, #4b5563)',
          }}
        >
          <Info />
          <div>
            <p
              className="text-sm font-medium"
              style={{
                color: 'color-mix(in srgb, var(--theme-color-primary) 85%, black) dark:white',
              }}
            >
              {t('advancedkey.rapidTriggerDisabled')}
            </p>
            <p
              className="text-sm"
              style={{
                color: 'color-mix(in srgb, var(--theme-color-primary) 75%, black) dark:#d1d5db',
              }}
            >
              {t('advancedkey.rapidTriggerDisabledDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
