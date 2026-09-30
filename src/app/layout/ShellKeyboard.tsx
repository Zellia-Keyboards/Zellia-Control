import { useMemo } from 'react';
import { useDeviceStore } from '../../features/device';
import {
  KeyboardRender,
  useAllowSelection,
  useLayoutKeys,
  useSelectedLayer,
} from '../../features/keyboard';
import {
  KLE_LABEL_SLOTS,
  lightingLabels,
  performanceLabels,
  remapLabels,
  type KeyLabels,
  type LayoutKey,
} from '../../features/keyboard/model';
import { keyboardLabelsFor, type KeyboardLabels } from '../navigation';

const NO_KEYS: readonly LayoutKey[] = [];
const EMPTY_LABELS: KeyLabels = Object.freeze(Array.from({ length: KLE_LABEL_SLOTS }, () => ''));

/**
 * The keycap labels of `kind` for `keys`, rebuilt only when the device slice they show changes
 * (and, for keycodes, the selected layer).
 */
function useKeycapLabels(
  kind: KeyboardLabels,
  keys: readonly LayoutKey[] | null
): ReadonlyMap<number, KeyLabels> | null {
  const advancedKeys = useDeviceStore(state =>
    kind === 'performance' ? state.config?.advancedKeys : undefined
  );
  const rgbKeys = useDeviceStore(state =>
    kind === 'lighting' ? state.config?.rgbKeys : undefined
  );
  const keymap = useDeviceStore(state => (kind === 'remap' ? state.config?.keymap : undefined));
  const dynamicKeys = useDeviceStore(state =>
    kind === 'remap' ? state.config?.dynamicKeys : undefined
  );
  // The layer selector is 1-based; keymap layers are 0-based.
  const layer = useSelectedLayer() - 1;
  const layerIndex = kind === 'remap' ? layer : 0;

  return useMemo(() => {
    if (!keys) return null;
    if (advancedKeys) return performanceLabels(keys, advancedKeys);
    if (rgbKeys) return lightingLabels(keys, rgbKeys);
    if (keymap && dynamicKeys) return remapLabels(keys, keymap, layerIndex, dynamicKeys);
    return null;
  }, [keys, advancedKeys, rgbKeys, keymap, dynamicKeys, layerIndex]);
}

export interface ShellKeyboardProps {
  readonly pathname: string;
}

/**
 * The global keyboard above the pages (the KeyboardRender block of `MainContentArea.svelte` and
 * the per-page labels of `+layout.svelte`): performance values, lighting modes, or the selected
 * layer's keycodes. Performance and Lighting use smaller legends (global classes in app.css).
 */
export function ShellKeyboard({ pathname }: ShellKeyboardProps) {
  const all = useLayoutKeys()?.all ?? null;
  const labels = useKeycapLabels(keyboardLabelsFor(pathname), all);
  const allowSelection = useAllowSelection();

  const keys = useMemo(
    () =>
      all && labels
        ? all.map(key => ({ ...key, labels: labels.get(key.id) ?? EMPTY_LABELS }))
        : NO_KEYS,
    [all, labels]
  );

  let className = 'relative';
  if (pathname.includes('/performance')) className += ' performance-page-keys';
  if (pathname.includes('/lighting')) className += ' lighting-page-keys';

  return (
    <div className={className}>
      <KeyboardRender keys={keys} allowSelection={allowSelection} />
    </div>
  );
}
