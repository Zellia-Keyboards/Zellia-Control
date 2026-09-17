import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Which keys are selected on the on-screen keyboard and which layer the configurator edits.
 * Shared by the global keyboard (layout) and the pages; survives route changes, as in the
 * Svelte app (`SelectedKeysStore` + `SelectedLayerStore`).
 */
export interface KeySelectionState {
  /** Selected key ids, unique and ascending. */
  readonly selected: readonly number[];
  /** Whether clicking keys changes the selection (pages switch this). */
  readonly allowSelection: boolean;
  /** Selectable key ids for select-all: highest visible key id + 1 (set by the keyboard). */
  readonly totalKeys: number;
  /** Layer shown and edited in the UI, 1-based like the layer selector (device layer + 1). */
  readonly layer: number;
}

export const INITIAL_KEY_SELECTION: KeySelectionState = Object.freeze({
  selected: Object.freeze([]),
  allowSelection: true,
  totalKeys: 0,
  layer: 1,
});

export const keySelectionStore = createStore<KeySelectionState>()(() => INITIAL_KEY_SELECTION);

function normalized(ids: Iterable<number>): readonly number[] {
  return Object.freeze([...new Set(ids)].sort((a, b) => a - b));
}

function allKeys(totalKeys: number): readonly number[] {
  return normalized(Array.from({ length: totalKeys }, (_, id) => id));
}

export const keySelection = {
  toggleKey(id: number): void {
    const { selected } = keySelectionStore.getState();
    const next = selected.includes(id) ? selected.filter(key => key !== id) : [...selected, id];
    keySelectionStore.setState({ selected: normalized(next) });
  },
  setSelected(ids: readonly number[]): void {
    keySelectionStore.setState({ selected: normalized(ids) });
  },
  selectAll(): void {
    keySelectionStore.setState(state => ({ selected: allKeys(state.totalKeys) }));
  },
  deselectAll(): void {
    keySelectionStore.setState({ selected: INITIAL_KEY_SELECTION.selected });
  },
  /** Selects every key, or clears the selection when every key is already selected. */
  toggleSelectAll(): void {
    keySelectionStore.setState(state => ({
      selected:
        state.selected.length === state.totalKeys
          ? INITIAL_KEY_SELECTION.selected
          : allKeys(state.totalKeys),
    }));
  },
  setAllowSelection(allowSelection: boolean): void {
    keySelectionStore.setState({ allowSelection });
  },
  setTotalKeys(totalKeys: number): void {
    if (keySelectionStore.getState().totalKeys !== totalKeys) {
      keySelectionStore.setState({ totalKeys });
    }
  },
  /** `layer` is 1-based, as shown in the layer selector. */
  setLayer(layer: number): void {
    keySelectionStore.setState({ layer });
  },
};

/** Keys present in `next` but not in `previous`, e.g. to apply a paint brush to new picks. */
export function addedKeys(previous: readonly number[], next: readonly number[]): number[] {
  const before = new Set(previous);
  return next.filter(id => !before.has(id));
}

export function useSelectedKeys(): readonly number[] {
  return useStore(keySelectionStore, state => state.selected);
}

export function useIsKeySelected(id: number): boolean {
  return useStore(keySelectionStore, state => state.selected.includes(id));
}

export function useAllowSelection(): boolean {
  return useStore(keySelectionStore, state => state.allowSelection);
}

/** 1-based UI layer. */
export function useSelectedLayer(): number {
  return useStore(keySelectionStore, state => state.layer);
}
