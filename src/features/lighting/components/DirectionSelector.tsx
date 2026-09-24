import { useRef, type PointerEvent } from 'react';
import {
  dialArcPath,
  dialArrowPath,
  dialIndicator,
  directionFromInput,
  directionFromPointer,
  directionLabel,
} from '../model/direction';
import styles from './DirectionSelector.module.css';

export interface DirectionSelectorProps {
  /** Degrees, see `model/direction`. */
  direction: number;
  onDirectionChange: (value: number) => void;
  /** Accessible name of the degree input (not shown). */
  ariaLabel?: string;
}

/** Circular direction dial with a degree input (port of DirectionSelector.svelte). */
export function DirectionSelector({
  direction,
  onDirectionChange,
  ariaLabel = 'Direction',
}: DirectionSelectorProps) {
  // Only the pointer handlers read it; nothing renders from it.
  const dragging = useRef(false);

  function updateDirectionFromEvent(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    onDirectionChange(
      directionFromPointer(event.clientX - rect.left - centerX, event.clientY - rect.top - centerY)
    );
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    dragging.current = true;
    updateDirectionFromEvent(event);
    if (event.target instanceof Element) event.target.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (dragging.current) updateDirectionFromEvent(event);
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    dragging.current = false;
    if (event.target instanceof Element) event.target.releasePointerCapture(event.pointerId);
  }

  const arc = dialArcPath(direction);
  const indicator = dialIndicator(direction);

  return (
    <div className="flex items-center gap-3">
      {/* Compact circular dial */}
      <svg
        className={`w-16 h-16 ${styles['dial'] ?? ''}`}
        viewBox="0 0 64 64"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Background ring */}
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Active arc */}
        {arc !== null && (
          <path
            d={arc}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
          />
        )}

        {/* Direction indicator */}
        <circle
          cx={indicator.x}
          cy={indicator.y}
          r="4"
          fill="currentColor"
          className="text-primary"
        />

        {/* Center arrow */}
        <g transform="translate(32, 32)">
          <path
            d={dialArrowPath(direction)}
            fill="currentColor"
            className="text-gray-600 dark:text-gray-400"
          />
        </g>
      </svg>

      {/* Degree display and input */}
      <div className="min-w-[4rem]">
        <input
          type="number"
          min="0"
          max="360"
          value={direction}
          onChange={event => {
            onDirectionChange(directionFromInput(event.currentTarget.value));
          }}
          className="w-full px-2 py-1 text-xl font-semibold text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all glassmorphism-button"
          aria-label={ariaLabel}
        />
        <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-0.5">
          {directionLabel(direction)}
        </div>
      </div>
    </div>
  );
}
