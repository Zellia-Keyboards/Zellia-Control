/**
 * Keyboard feature: the on-screen keyboard, key selection/layer state and layout options.
 * Pure layout parsing and label builders live in `./model`.
 */
export { KeyboardRender, type KeyboardRenderProps } from './KeyboardRender';
export { useLayoutKeys, type LayoutKeys } from './hooks/use-layout-keys';
export { useSelectionShortcuts } from './hooks/use-selection-shortcuts';
export {
  addedKeys,
  INITIAL_KEY_SELECTION,
  keySelection,
  keySelectionStore,
  useAllowSelection,
  useIsKeySelected,
  useSelectedKeys,
  useSelectedLayer,
  type KeySelectionState,
} from './store/key-selection';
export { layoutOptionsStore, setLayoutOptions, useLayoutOptions } from './store/layout-options';
