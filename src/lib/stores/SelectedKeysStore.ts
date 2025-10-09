import { writable, derived, get, type Readable } from 'svelte/store';

// Store that holds selected key indexes as a sorted array
const _selected = writable<number[]>([]);

export const selectedKeys = {
  subscribe: _selected.subscribe,
};

// Number of keys currently known (set by KeyboardRender)
const _totalKeys = writable(0);
export const totalKeys = {
  subscribe: _totalKeys.subscribe,
};

export function setTotalKeys(n: number) {
  _totalKeys.set(n);
}

export function toggleKey(index: number) {
  _selected.update(arr => {
    const s = new Set(arr);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    return Array.from(s).sort((a, b) => a - b);
  });
}

export function selectAll() {
  const n = get(_totalKeys) || 0;
  _selected.set(Array.from({ length: n }, (_, i) => i));
}

export function deselectAll() {
  _selected.set([]);
}

export function toggleSelectAll() {
  const n = get(_totalKeys) || 0;
  const current = get(_selected);
  if (current.length === n) {
    _selected.set([]);
  } else {
    _selected.set(Array.from({ length: n }, (_, i) => i));
  }
}

// Derived helpers
export const selectedCount = derived(_selected, $ => $ .length);

export function isSelected(index: number): Readable<boolean> {
  return derived(_selected, $ => $.includes(index));
}
