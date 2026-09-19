import { useState, type ChangeEvent } from 'react';
import { cx } from '../class-names';
import styles from './MaxTravelDistanceControl.module.css';

export interface MaxTravelDistanceControlProps {
  /** Switch travel in mm (1.0–4.0); only bounds the sliders. */
  maxTravelDistance: number;
  onMaxTravelChange: (value: number) => void;
  /** Called after every input so the page can clamp its values to the travel. */
  onClampValues?: (maxDistance: number) => void;
}

/** The "switch travel" badge next to the Performance title (port of MaxTravelDistanceControl). */
export function MaxTravelDistanceControl({
  maxTravelDistance,
  onMaxTravelChange,
  onClampValues,
}: MaxTravelDistanceControlProps) {
  const [inputValue, setInputValue] = useState(String(maxTravelDistance));
  // Sync the local input when the travel changes from the parent (the Svelte `$effect`).
  const [syncedTravel, setSyncedTravel] = useState(maxTravelDistance);
  if (!Object.is(syncedTravel, maxTravelDistance)) {
    setSyncedTravel(maxTravelDistance);
    setInputValue(String(maxTravelDistance));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    // Filter to only allow digits and one decimal point (1.0-4.0 range)
    const filteredValue = event.currentTarget.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*?)\..*/g, '$1');
    setInputValue(filteredValue);

    let value = filteredValue ? Number(filteredValue) : 4.0;
    // A lone "." is no number: treat it like an empty input (Svelte let NaN through).
    if (Number.isNaN(value)) value = 4.0;

    // Clamp values to valid range
    if (value < 1.0) value = 1.0;
    if (value > 4.0) value = 4.0;

    onMaxTravelChange(value);
    onClampValues?.(value);
  }

  return (
    <div className={cx(styles['travel-badge'], 'group relative glassmorphism-card')}>
      <div className="flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4" />
        </svg>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          className={styles['travel-input']}
          aria-label="Switch Travel Distance"
        />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">mm</span>
      </div>
      {/* Tooltip */}
      <div className={styles['travel-tooltip']}>Switch Travel Distance</div>
    </div>
  );
}
