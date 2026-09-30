import { useMemo } from 'react';
import { useModel } from '../../device';
import { layoutVariantIndices, parseLayout, visibleKeys, type LayoutKey } from '../model';
import { useLayoutOptions } from '../store/layout-options';

export interface LayoutKeys {
  /** Every key of the connected model's layout, including all layout-group variants. */
  readonly all: readonly LayoutKey[];
  /** Keys of the variants chosen in the Layout dropdown. */
  readonly visible: readonly LayoutKey[];
}

/** The connected keyboard's parsed layout, or `null` while no keyboard is connected. */
export function useLayoutKeys(): LayoutKeys | null {
  const model = useModel();
  const options = useLayoutOptions();
  const layoutJson = model?.layoutJson;
  const layoutLabels = model?.layoutLabels;

  const all = useMemo(
    () => (layoutJson === undefined ? null : parseLayout(layoutJson)),
    [layoutJson]
  );

  return useMemo(() => {
    if (!all || !layoutLabels) return null;
    return { all, visible: visibleKeys(all, layoutVariantIndices(layoutLabels, options)) };
  }, [all, layoutLabels, options]);
}
