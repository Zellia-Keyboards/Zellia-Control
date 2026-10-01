/** Port of `advancedkey/dynamic/BottomOutPointConfig.svelte` (2.0–4.0 mm, bound to the draft). */
import { useT } from '../../../../lib/i18n';
import styles from './BottomOutPointConfig.module.css';

export interface BottomOutPointConfigProps {
  readonly bottomOutPointValue: number;
  readonly onChange: (value: number) => void;
}

export function BottomOutPointConfig({ bottomOutPointValue, onChange }: BottomOutPointConfigProps) {
  const t = useT();
  return (
    <div className="rounded-lg border p-6 glassmorphism-card">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('advancedkey.bottomOutPoint')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('advancedkey.bottomOutPointDesc')}
      </p>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label
            htmlFor="bottom-out-slider"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t('advancedkey.distance')}
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {`${bottomOutPointValue.toFixed(1)}mm`}
          </span>
        </div>
        <input
          id="bottom-out-slider"
          type="range"
          min="2.0"
          max="4.0"
          step="0.1"
          value={bottomOutPointValue}
          onChange={event => {
            onChange(Number(event.currentTarget.value));
          }}
          className={styles['bottom-out-slider']}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>2.0mm</span>
          <span>4.0mm</span>
        </div>
      </div>
    </div>
  );
}
