import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { keySelection, keySelectionStore } from '../store/key-selection';
import { useSelectionShortcuts } from './use-selection-shortcuts';

function Page() {
  useSelectionShortcuts();
  return null;
}

beforeEach(() => {
  keySelection.setTotalKeys(4);
  keySelection.setAllowSelection(true);
  keySelection.deselectAll();
});
afterEach(() => {
  keySelection.deselectAll();
});

const selected = () => keySelectionStore.getState().selected;

describe('useSelectionShortcuts', () => {
  it('toggles select-all with Ctrl+A or ⌘+A and deselects with Ctrl/⌘+Escape', () => {
    render(<Page />);

    expect(fireEvent.keyDown(window, { key: 'a', ctrlKey: true })).toBe(false);
    expect(selected()).toEqual([0, 1, 2, 3]);
    fireEvent.keyDown(window, { key: 'A', metaKey: true });
    expect(selected()).toEqual([]);

    keySelection.setSelected([1, 2]);
    expect(fireEvent.keyDown(window, { key: 'Escape', metaKey: true })).toBe(false);
    expect(selected()).toEqual([]);
  });

  it('ignores the keys without a modifier and stops listening on unmount', () => {
    const { unmount } = render(<Page />);
    keySelection.setSelected([2]);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(selected()).toEqual([2]);

    unmount();
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(selected()).toEqual([2]);
  });
});
