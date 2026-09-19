import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceSession, deviceStore, type AdvancedKeyConfig } from '../../device';
import { keySelectionStore } from '../../keyboard';
import {
  INITIAL_BRUSH,
  brushConfig,
  brushFromKey,
  withSettings,
  type PerformanceBrush,
  type PerformanceSettings,
} from '../model/settings';

export type SettingsUpdate = (settings: PerformanceSettings) => PerformanceSettings;

interface BrushState {
  readonly brush: PerformanceBrush;
  /** Whether a key has been loaded since the page opened. */
  readonly loaded: boolean;
}

/** The first selected key the keyboard has (the selection is ascending, as in Svelte). */
function firstSelectedKey(selected: readonly number[]): AdvancedKeyConfig | undefined {
  const advancedKeys = deviceStore.getState().config?.advancedKeys ?? [];
  for (const id of selected) {
    const key = advancedKeys[id];
    if (key) return key;
  }
  return undefined;
}

function loadIfFirstSelection(state: BrushState, selected: readonly number[]): BrushState {
  if (state.loaded) return state;
  const key = firstSelectedKey(selected);
  return key ? { brush: brushFromKey(key), loaded: true } : state;
}

/** Writes the brush to every selected key the keyboard has (unchanged keys send nothing). */
function applyBrush(brush: PerformanceBrush, selected: readonly number[]): void {
  const keyCount = deviceStore.getState().config?.advancedKeys.length ?? 0;
  const keyIds = selected.filter(id => id < keyCount);
  if (keyIds.length > 0) deviceSession.setAdvancedKeys(keyIds, brushConfig(brush));
}

/**
 * The Performance page's settings brush: the Svelte page's selection `$effect`, with D12 and §1.4.
 *
 * - The first time keys are selected while the page is open (or when it opens with keys
 *   selected), every value of the first selected key is loaded.
 * - Every settings change and every selection change writes the settings to all selected keys,
 *   so keys added to the selection take the brush. The brush stays loaded after deselect-all.
 * - Only selection changes count: switching layers (or any other key-selection state) never
 *   writes, and device reloads do not change the brush.
 */
export function usePerformanceBrush(): readonly [
  PerformanceSettings,
  (update: SettingsUpdate) => void,
] {
  const [state, setState] = useState<BrushState>(() =>
    loadIfFirstSelection(
      { brush: INITIAL_BRUSH, loaded: false },
      keySelectionStore.getState().selected
    )
  );
  // The latest state for the store subscription and event handlers, which run outside render.
  const stateRef = useRef(state);

  const commit = useCallback((next: BrushState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const updateSettings = useCallback(
    (update: SettingsUpdate) => {
      const current = stateRef.current;
      const brush = withSettings(current.brush, update(current.brush.settings));
      if (brush === current.brush) return;
      commit({ ...current, brush });
      applyBrush(brush, keySelectionStore.getState().selected);
    },
    [commit]
  );

  useEffect(() => {
    const onSelection = (selected: readonly number[]) => {
      if (selected.length === 0) return;
      const next = loadIfFirstSelection(stateRef.current, selected);
      if (next !== stateRef.current) commit(next);
      applyBrush(next.brush, selected);
    };
    // Keys selected before the page opened take the brush, like the Svelte effect's first run.
    onSelection(keySelectionStore.getState().selected);
    return keySelectionStore.subscribe((selection, previous) => {
      if (selection.selected !== previous.selected) onSelection(selection.selected);
    });
  }, [commit]);

  return [state.brush.settings, updateSettings] as const;
}
