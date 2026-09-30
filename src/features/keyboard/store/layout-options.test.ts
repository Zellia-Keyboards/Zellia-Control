import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYOUT_OPTIONS, LAYOUT_OPTIONS_STORAGE_KEY } from '../model';

async function loadStore() {
  vi.resetModules();
  return import('./layout-options');
}

afterEach(() => {
  localStorage.clear();
});

describe('layout options store', () => {
  it('starts from the persisted options and falls back to the defaults', async () => {
    localStorage.setItem(
      LAYOUT_OPTIONS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_LAYOUT_OPTIONS, splitBackspace: true })
    );
    const persisted = await loadStore();
    expect(persisted.layoutOptionsStore.getState().splitBackspace).toBe(true);

    localStorage.setItem(LAYOUT_OPTIONS_STORAGE_KEY, '{not json');
    const fallback = await loadStore();
    expect(fallback.layoutOptionsStore.getState()).toEqual(DEFAULT_LAYOUT_OPTIONS);
  });

  it('persists every change under the Svelte key and schema', async () => {
    const { setLayoutOptions } = await loadStore();

    setLayoutOptions({ bottomRowConfig: '7u', splitSpacebar: true });

    expect(JSON.parse(localStorage.getItem(LAYOUT_OPTIONS_STORAGE_KEY) ?? 'null')).toEqual({
      ...DEFAULT_LAYOUT_OPTIONS,
      bottomRowConfig: '7u',
      splitSpacebar: true,
    });
  });
});
