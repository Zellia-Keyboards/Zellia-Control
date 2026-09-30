/**
 * Port of `components/performance/ActuationPointControl.svelte` for the null-bind and DKS
 * performance tabs (props as in Svelte, distances in mm). The Performance page owns its own port
 * (features/performance); see the integration notes.
 */
import { AlertTriangle } from 'lucide-react';
import { useT } from '../../../../lib/i18n';
import styles from './ActuationPointControl.module.css';

export interface ActuationPointControlProps {
  readonly actuationPoint: number;
  readonly deactivationPoint: number;
  readonly keysSelected: number;
  readonly maxTravelDistance: number;
  readonly onActuationChange: (value: number) => void;
  readonly onDeactivationChange: (value: number) => void;
}

const css = (name: string): string => styles[name] ?? '';

export function ActuationPointControl({
  actuationPoint,
  deactivationPoint,
  keysSelected,
  maxTravelDistance,
  onActuationChange,
  onDeactivationChange,
}: ActuationPointControlProps) {
  const t = useT();
  const percent = (mm: number) => `${(mm / maxTravelDistance) * 100}%`;

  return (
    <div className="flex-1 min-w-[240px] flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('performance.actuationPoint')}
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {t('performance.actuationPointDesc')}
      </p>
      <div className="mb-2 flex-1">
        {actuationPoint < 0.3 && (
          <div className="mb-3 p-2 bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200 border rounded-md text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            {t('performance.sensitivityWarning')}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
            <div>Deactivation: {deactivationPoint.toFixed(3)}mm</div>
            <div>Actuation: {actuationPoint.toFixed(3)}mm</div>
          </div>

          <div className="relative mb-4" style={{ height: '24px' }}>
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute h-full rounded-l-full ${css('deadzone-pattern')}`}
                style={{ left: '0%', width: percent(deactivationPoint) }}
              ></div>
              <div
                className="absolute h-full"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  left: percent(deactivationPoint),
                  width: percent(actuationPoint - deactivationPoint),
                }}
              ></div>
              <div
                className="absolute h-full rounded-r-full"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  left: percent(actuationPoint),
                  width: percent(maxTravelDistance - actuationPoint),
                }}
              ></div>
            </div>

            <input
              type="range"
              aria-label="Deactivation point"
              min="0.005"
              max={maxTravelDistance}
              step="0.005"
              value={deactivationPoint}
              onChange={event => {
                let value = Number(event.currentTarget.value);
                if (value > actuationPoint - 0.1) value = actuationPoint - 0.1;
                onDeactivationChange(value);
              }}
              className={`absolute top-0 w-full h-full appearance-none bg-transparent ${css('actuation-slider')} ${css('deactivation-handle')}`}
            />

            <input
              type="range"
              aria-label="Actuation point"
              min="0.005"
              max={maxTravelDistance}
              step="0.005"
              value={actuationPoint}
              onChange={event => {
                let value = Number(event.currentTarget.value);
                if (value < deactivationPoint + 0.1) value = deactivationPoint + 0.1;
                if (value > maxTravelDistance) value = maxTravelDistance;
                onActuationChange(value);
              }}
              className={`absolute top-0 w-full h-full appearance-none bg-transparent ${css('actuation-slider')} ${css('actuation-handle')}`}
            />
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Deactivation:</span>
              <input
                type="number"
                aria-label="Deactivation point (mm)"
                min="0.005"
                max={actuationPoint - 0.1}
                step="0.005"
                value={deactivationPoint}
                onChange={event => {
                  let value = Number(event.currentTarget.value);
                  if (value < 0.005) value = 0.005;
                  if (value > actuationPoint - 0.1) value = actuationPoint - 0.1;
                  onDeactivationChange(value);
                }}
                className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Actuation:</span>
              <input
                type="number"
                aria-label="Actuation point (mm)"
                min={deactivationPoint + 0.1}
                max={maxTravelDistance}
                step="0.005"
                value={actuationPoint}
                onChange={event => {
                  let value = Number(event.currentTarget.value);
                  if (value < deactivationPoint + 0.1) value = deactivationPoint + 0.1;
                  if (value > maxTravelDistance) value = maxTravelDistance;
                  onActuationChange(value);
                }}
                className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-base text-gray-900 dark:text-white font-medium">
          {keysSelected} {t('performance.keysSelected')}
        </div>
      </div>
    </div>
  );
}
