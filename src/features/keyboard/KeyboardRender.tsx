import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useModel } from '../device';
import { useKeyUnitSize } from './hooks/use-key-unit-size';
import { Key, type KeyPointerHandler } from './Key';
import { layoutVariantIndices, visibleKeys, type LayoutKey } from './model';
import { keySelection } from './store/key-selection';
import { useLayoutOptions } from './store/layout-options';
import styles from './KeyboardRender.module.css';

export interface KeyboardRenderProps {
  /**
   * Every key of the layout with the labels to display (all layout-group variants; the renderer
   * shows only the variants chosen in the Layout dropdown, like the Svelte component).
   */
  readonly keys: readonly LayoutKey[];
  /** Whether clicking/dragging over keys toggles their selection (default true). */
  readonly allowSelection?: boolean;
  /** Called after the user toggled `keyId`'s selection. */
  readonly onSelect?: (keyId: number) => void;
}

const NO_LAYOUT_GROUPS: readonly (readonly string[])[] = [];

/** Right or bottom edge of the furthest key, in key units. */
function extent(keys: readonly LayoutKey[], edge: (key: LayoutKey) => number): number {
  return keys.length > 0 ? Math.max(...keys.map(edge)) : 0;
}

/**
 * The on-screen keyboard (port of `KeyboardRender.svelte`): the visible layout variants,
 * positioned in key units, with key selection by left press and by dragging over keys.
 */
export function KeyboardRender({ keys, allowSelection = true, onSelect }: KeyboardRenderProps) {
  const usize = useKeyUnitSize();
  const layoutLabels = useModel()?.layoutLabels ?? NO_LAYOUT_GROUPS;
  const options = useLayoutOptions();

  const visible = useMemo(
    () => visibleKeys(keys, layoutVariantIndices(layoutLabels, options)),
    [keys, layoutLabels, options]
  );

  // Select-all covers every id up to the highest visible one.
  const totalKeys = Math.max(...new Set(visible.map(key => key.id)), 0) + 1;
  useEffect(() => {
    keySelection.setTotalKeys(totalKeys);
  }, [totalKeys]);

  // The latest callback, so the keycaps' handlers stay the same between renders.
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
  });

  const toggle = useCallback<KeyPointerHandler>(
    (event, keyId) => {
      if (event.buttons === 1 && allowSelection) {
        keySelection.toggleKey(keyId);
        onSelectRef.current?.(keyId);
      }
    },
    [allowSelection]
  );

  const width = `${extent(visible, key => key.x + key.width) * usize}px`;
  const height = `${extent(visible, key => key.y + key.height) * usize}px`;

  return (
    <div className={styles['grid-container']}>
      <div className={`${styles.keyboard} ${styles['no-select']}`} style={{ width, height }}>
        {visible.map(key => (
          <div key={key.id}>
            <Key
              layoutKey={key}
              usize={usize}
              allowSelection={allowSelection}
              onMouseDown={toggle}
              onMouseEnter={toggle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
