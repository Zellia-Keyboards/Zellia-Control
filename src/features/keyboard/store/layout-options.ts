import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { readJson, writeJson } from '../../../lib/storage';
import {
  DEFAULT_LAYOUT_OPTIONS,
  LAYOUT_OPTIONS_STORAGE_KEY,
  parseLayoutOptions,
  type LayoutOptions,
} from '../model';

/** Physical layout choices from the toolbar's Layout dropdown, persisted like the Svelte app. */
export const layoutOptionsStore = createStore<LayoutOptions>()(() =>
  readJson(LAYOUT_OPTIONS_STORAGE_KEY, parseLayoutOptions, DEFAULT_LAYOUT_OPTIONS)
);

layoutOptionsStore.subscribe(options => {
  writeJson(LAYOUT_OPTIONS_STORAGE_KEY, options);
});

export function setLayoutOptions(patch: Partial<LayoutOptions>): void {
  layoutOptionsStore.setState(patch);
}

export function useLayoutOptions(): LayoutOptions {
  return useStore(layoutOptionsStore);
}
