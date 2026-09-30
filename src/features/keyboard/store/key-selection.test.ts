import { beforeEach, describe, expect, it } from 'vitest';
import { addedKeys, INITIAL_KEY_SELECTION, keySelection, keySelectionStore } from './key-selection';

const selected = () => keySelectionStore.getState().selected;

beforeEach(() => {
  keySelectionStore.setState(INITIAL_KEY_SELECTION, true);
});

describe('key selection', () => {
  it('toggles keys and keeps the selection unique and ascending', () => {
    keySelection.toggleKey(5);
    keySelection.toggleKey(2);
    keySelection.toggleKey(9);
    expect(selected()).toEqual([2, 5, 9]);

    keySelection.toggleKey(5);
    expect(selected()).toEqual([2, 9]);

    keySelection.setSelected([7, 3, 7]);
    expect(selected()).toEqual([3, 7]);
  });

  it('selects ids 0..totalKeys-1 and toggles select-all like the Svelte store', () => {
    keySelection.setTotalKeys(4);
    keySelection.selectAll();
    expect(selected()).toEqual([0, 1, 2, 3]);

    keySelection.toggleSelectAll();
    expect(selected()).toEqual([]);

    keySelection.toggleKey(1);
    keySelection.toggleSelectAll();
    expect(selected()).toEqual([0, 1, 2, 3]);

    keySelection.deselectAll();
    expect(selected()).toEqual([]);
  });

  it('leaves the state alone when the key count does not change', () => {
    keySelection.setTotalKeys(4);
    const before = keySelectionStore.getState();

    keySelection.setTotalKeys(4);

    expect(keySelectionStore.getState()).toBe(before);
  });

  it('stores the 1-based layer and the selection permission', () => {
    expect(keySelectionStore.getState().layer).toBe(1);
    keySelection.setLayer(3);
    keySelection.setAllowSelection(false);
    expect(keySelectionStore.getState()).toMatchObject({ layer: 3, allowSelection: false });
  });

  it('reports the keys a selection change added', () => {
    expect(addedKeys([1, 2], [1, 2, 4, 6])).toEqual([4, 6]);
    expect(addedKeys([1, 2, 3], [2])).toEqual([]);
  });

  it('never exposes a mutable selection array', () => {
    keySelection.setSelected([1]);
    expect(Object.isFrozen(selected())).toBe(true);
  });
});
