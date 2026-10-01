import { cx } from '../../../lib/class-names';
import { useT } from '../../../lib/i18n';
import styles from './DeadzoneControl.module.css';

export interface DeadzoneControlProps {
  /** Start of the active range, mm from the top. */
  upperDeadzone: number;
  /** Bottom-out point, mm from the top. */
  lowerDeadzone: number;
  /** Switch travel in mm: the sliders' range. */
  maxTravelDistance: number;
  onUpperChange: (value: number) => void;
  onLowerChange: (value: number) => void;
}

const NUMBER_INPUT_CLASS =
  'w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white border-gray-300 text-gray-900';

/**
 * Rapid trigger start and bottom deadzones on one dual-thumb slider, with number inputs (port of
 * DeadzoneControl.svelte). The start stays 0.1 mm above the bottom.
 */
export function DeadzoneControl({
  upperDeadzone,
  lowerDeadzone,
  maxTravelDistance,
  onUpperChange,
  onLowerChange,
}: DeadzoneControlProps) {
  const t = useT();
  return (
    <div
      className={cx(
        'border-t dark:border-white border-gray-200 pt-4',
        styles['deadzone-container'],
        'glassmorphism-card'
      )}
    >
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        {t('performance.keyTravelDeadzones')}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {t('performance.keyTravelDeadzonesDesc')}
      </p>

      {/* Single bar with dual handles */}
      <div>
        <div className="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500 mb-2">
          <div>{`Start: ${upperDeadzone.toFixed(3)}mm`}</div>
          <div>{`Bottom: ${lowerDeadzone.toFixed(3)}mm`}</div>
        </div>

        {/* Dual-handle slider with visual feedback */}
        <div className="relative mb-4" style={{ height: '24px' }}>
          {/* Background track with deadzone visualization */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            {/* Deadzone before start (left side) */}
            <div
              className={cx('absolute h-full rounded-l-full', styles['deadzone-pattern'])}
              style={{ left: '0%', width: `${(upperDeadzone / maxTravelDistance) * 100}%` }}
            ></div>

            {/* Active range highlight */}
            <div
              className="absolute h-full"
              style={{
                background:
                  'linear-gradient(135deg, var(--theme-color-primary) 0%, color-mix(in srgb, var(--theme-color-primary) 80%, black) 100%)',
                left: `${(upperDeadzone / maxTravelDistance) * 100}%`,
                width: `${((lowerDeadzone - upperDeadzone) / maxTravelDistance) * 100}%`,
              }}
            ></div>

            {/* Deadzone after bottom (right side) */}
            <div
              className={cx('absolute h-full rounded-r-full', styles['deadzone-pattern'])}
              style={{
                left: `${(lowerDeadzone / maxTravelDistance) * 100}%`,
                width: `${((maxTravelDistance - lowerDeadzone) / maxTravelDistance) * 100}%`,
              }}
            ></div>
          </div>

          {/* Start deadzone slider (upper handle) */}
          <input
            type="range"
            min="0.005"
            max={maxTravelDistance}
            step="0.005"
            value={upperDeadzone}
            onChange={event => {
              let value = Math.round(Number(event.currentTarget.value) * 1000) / 1000;
              if (value > lowerDeadzone - 0.1) value = lowerDeadzone - 0.1;
              onUpperChange(value);
            }}
            className={cx(
              'absolute top-0 w-full h-full appearance-none bg-transparent',
              styles['deadzone-slider'],
              styles['start-handle']
            )}
            aria-label="Start"
          />

          {/* Bottom deadzone slider (lower handle) */}
          <input
            type="range"
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
            className={cx(
              'absolute top-0 w-full h-full appearance-none bg-transparent',
              styles['deadzone-slider'],
              styles['bottom-handle']
            )}
            aria-label="Bottom"
          />
        </div>

        {/* Direct inputs */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Start:</span>
            <input
              type="number"
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
              className={NUMBER_INPUT_CLASS}
              aria-label="Start"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Bottom:</span>
            <input
              type="number"
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
              className={NUMBER_INPUT_CLASS}
              aria-label="Bottom"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
