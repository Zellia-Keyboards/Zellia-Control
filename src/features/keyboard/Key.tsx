import { memo, type CSSProperties, type MouseEvent } from 'react';
import type { LayoutKey } from './model';
import { useIsKeySelected } from './store/key-selection';
import styles from './Key.module.css';

/** The keycap shows label slots 0..8: the KLE 3×3 legend grid. */
const LABEL_CELLS = 9;

const LABEL_GRID_STYLE: CSSProperties = { width: '100%', height: '100%' };

/** Pointer handler of a keycap, called with the key's id. */
export type KeyPointerHandler = (event: MouseEvent<HTMLButtonElement>, keyId: number) => void;

export interface KeyProps {
  readonly layoutKey: LayoutKey;
  /** Pixels per key unit. */
  readonly usize: number;
  readonly allowSelection: boolean;
  readonly onMouseDown: KeyPointerHandler;
  readonly onMouseEnter: KeyPointerHandler;
}

/**
 * One keycap (port of `Key.svelte`). It subscribes to its own selection state, so selecting a key
 * re-renders that keycap only.
 */
function KeyCap({ layoutKey, usize, allowSelection, onMouseDown, onMouseEnter }: KeyProps) {
  const { id, x, y, width, height, rotationAngle, rotationX, rotationY, labels } = layoutKey;
  const selected = useIsKeySelected(id);

  const keyStyle: CSSProperties = {
    position: 'absolute',
    left: `${x * usize}px`,
    top: `${y * usize}px`,
    width: `${width * usize}px`,
    height: `${height * usize}px`,
    transformOrigin: `${rotationX * usize}px ${rotationY * usize}px`,
    transform: `rotate(${rotationAngle}deg)`,
    transition: 'all 0.3s ease-out',
  };

  let className = 'keycap';
  if (selected && allowSelection) className += ' selected';
  if (!allowSelection) className += ' selection-disabled';

  return (
    <div className={styles['key-container']} style={keyStyle}>
      <button
        type="button"
        className={className}
        data-key-id={id}
        aria-pressed={allowSelection ? selected : undefined}
        onMouseDown={event => {
          onMouseDown(event, id);
        }}
        onMouseEnter={event => {
          onMouseEnter(event, id);
        }}
      >
        <div className={styles['label-grid']} style={LABEL_GRID_STYLE}>
          {labels.slice(0, LABEL_CELLS).map((label, cell) =>
            label ? (
              <span key={cell} className={`label-cell-${cell}`}>
                {label}
              </span>
            ) : null
          )}
        </div>
      </button>
    </div>
  );
}

function sameLabels(a: readonly string[], b: readonly string[]): boolean {
  return a === b || (a.length === b.length && a.every((label, slot) => label === b[slot]));
}

function sameLayoutKey(a: LayoutKey, b: LayoutKey): boolean {
  return (
    a === b ||
    (a.id === b.id &&
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      a.rotationAngle === b.rotationAngle &&
      a.rotationX === b.rotationX &&
      a.rotationY === b.rotationY &&
      sameLabels(a.labels, b.labels))
  );
}

/** Keys whose geometry and labels are unchanged skip rendering, even as new objects. */
export const Key = memo(
  KeyCap,
  (previous, next) =>
    previous.usize === next.usize &&
    previous.allowSelection === next.allowSelection &&
    previous.onMouseDown === next.onMouseDown &&
    previous.onMouseEnter === next.onMouseEnter &&
    sameLayoutKey(previous.layoutKey, next.layoutKey)
);
