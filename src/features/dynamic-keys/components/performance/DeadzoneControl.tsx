/**
 * Port of `components/performance/DeadzoneControl.svelte` for the null-bind performance tab
 * (props as in Svelte, distances in mm). The Performance page owns its own port.
 */
import { useT } from '../../../../lib/i18n';
import styles from './DeadzoneControl.module.css';

export interface DeadzoneControlProps {
  readonly upperDeadzone: number;
  readonly lowerDeadzone: number;
  readonly maxTravelDistance: number;
  readonly onUpperChange: (value: number) => void;
  readonly onLowerChange: (value: number) => void;
}

const css = (name: string): string => styles[name] ?? '';

export function DeadzoneControl({
  upperDeadzone,
  lowerDeadzone,
  maxTravelDistance,
  onUpperChange,
  onLowerChange,
}: DeadzoneControlProps) {
  const t = useT();
  const percent = (mm: number) => `${(mm / maxTravelDistance) * 100}%`;

  return (
    <div
      className={`border-t dark:border-white border-gray-200 pt-4 ${css('deadzone-container')} glassmorphism-card`}
    >
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        {t('performance.keyTravelDeadzones')}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t('performance.keyTravelDeadzonesDesc')}
      </p>

      <div>
        <div className="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
          <div>{`Start: ${upperDeadzone.toFixed(3)}mm`}</div>
          <div>{`Bottom: ${lowerDeadzone.toFixed(3)}mm`}</div>
        </div>

        <div className="relative mb-4" style={{ height: '24px' }}>
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute h-full rounded-l-full ${css('deadzone-pattern')}`}
              style={{ left: '0%', width: percent(upperDeadzone) }}
            ></div>
            <div
              className="absolute h-full"
              style={{
                background:
                  'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)',
                left: percent(upperDeadzone),
                width: percent(lowerDeadzone - upperDeadzone),
              }}
            ></div>
            <div
              className={`absolute h-full rounded-r-full ${css('deadzone-pattern')}`}
              style={{
                left: percent(lowerDeadzone),
                width: percent(maxTravelDistance - lowerDeadzone),
              }}
            ></div>
          </div>

          <input
            type="range"
            aria-label="Start deadzone"
            min="0.005"
            max={maxTravelDistance}
            step="0.005"
            value={upperDeadzone}
            onChange={event => {
              let value = Math.round(Number(event.currentTarget.value) * 1000) / 1000;
              if (value > lowerDeadzone - 0.1) value = lowerDeadzone - 0.1;
              onUpperChange(value);
            }}
            className={`absolute top-0 w-full h-full appearance-none bg-transparent ${css('deadzone-slider')} ${css('start-handle')}`}
          />

          <input
            type="range"
            aria-label="Bottom deadzone"
            min="0.005"
            max={maxTravelDistance}
            step="0.005"
            value={lowerDeadzone}
            onChange={event => {
              let value = Math.round(Number(event.currentTarget.value) * 1000) / 1000;
              if (value < upperDeadzone + 0.1) value = upperDeadzone + 0.1;
              if (value > maxTravelDistance) value = maxTravelDistance;
              onLowerChange(value);
            }}
            className={`absolute top-0 w-full h-full appearance-none bg-transparent ${css('deadzone-slider')} ${css('bottom-handle')}`}
          />
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Start:</span>
            <input
              type="number"
              aria-label="Start deadzone (mm)"
              min="0.005"
              max={lowerDeadzone - 0.1}
              step="0.005"
              value={upperDeadzone}
              onChange={event => {
                let value = Number(event.currentTarget.value);
                if (value < 0.005) value = 0.005;
                if (value > lowerDeadzone - 0.1) value = lowerDeadzone - 0.1;
                onUpperChange(value);
              }}
              className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Bottom:</span>
            <input
              type="number"
              aria-label="Bottom deadzone (mm)"
              min={upperDeadzone + 0.1}
              max={maxTravelDistance}
              step="0.005"
              value={lowerDeadzone}
              onChange={event => {
                let value = Number(event.currentTarget.value);
                if (value < upperDeadzone + 0.1) value = upperDeadzone + 0.1;
                if (value > maxTravelDistance) value = maxTravelDistance;
                onLowerChange(value);
              }}
              className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
