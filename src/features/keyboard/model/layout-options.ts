/**
 * Layout options of the toolbar's Layout dropdown, persisted under `zellia-layout-config` with
 * the Svelte schema, and their mapping onto the model's layout groups
 * (`controller.get_layout_labels()`), ported verbatim from `LayoutConfigDropdown.svelte`.
 */

export interface LayoutOptions {
  readonly bottomRowConfig: '6.25u' | '7u';
  readonly splitSpacebar: boolean;
  readonly rightShiftSplit: boolean;
  readonly leftShiftSplit: boolean;
  readonly splitBackspace: boolean;
}

export const LAYOUT_OPTIONS_STORAGE_KEY = 'zellia-layout-config';

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  bottomRowConfig: '6.25u',
  splitSpacebar: false,
  rightShiftSplit: false,
  leftShiftSplit: false,
  splitBackspace: false,
};

/** Validates stored options; each missing or invalid field falls back to its default. */
export function parseLayoutOptions(value: unknown): LayoutOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return DEFAULT_LAYOUT_OPTIONS;
  }
  const stored = value as Partial<Record<keyof LayoutOptions, unknown>>;
  const flag = (name: Exclude<keyof LayoutOptions, 'bottomRowConfig'>): boolean => {
    const field = stored[name];
    return typeof field === 'boolean' ? field : DEFAULT_LAYOUT_OPTIONS[name];
  };
  return {
    bottomRowConfig:
      stored.bottomRowConfig === '6.25u' || stored.bottomRowConfig === '7u'
        ? stored.bottomRowConfig
        : DEFAULT_LAYOUT_OPTIONS.bottomRowConfig,
    splitSpacebar: flag('splitSpacebar'),
    rightShiftSplit: flag('rightShiftSplit'),
    leftShiftSplit: flag('leftShiftSplit'),
    splitBackspace: flag('splitBackspace'),
  };
}

/**
 * Selected option per layout group: 0 split backspace, 1 right-shift split, 2 bottom row
 * (0 = 6.25u, 1 = 6.25u split, 2 = 7u, 3 = 7u split), 3 left-shift split; other groups 0.
 * The mapping is Starlight-shaped for every model, as in the Svelte app.
 */
export function layoutVariantIndices(
  labels: readonly (readonly string[])[],
  options: LayoutOptions
): readonly number[] {
  const indices = labels.map(() => 0);
  const hasOptions = (group: number) => (labels[group]?.length ?? 0) > 0;
  if (hasOptions(0)) indices[0] = options.splitBackspace ? 1 : 0;
  if (hasOptions(1)) indices[1] = options.rightShiftSplit ? 1 : 0;
  if (hasOptions(2)) {
    const base = (options.bottomRowConfig === '7u' ? 2 : 0) + (options.splitSpacebar ? 1 : 0);
    // Clamped to the label count (not count - 1), exactly like the dropdown.
    indices[2] = Math.min(base, labels[2]?.length ?? 0);
  }
  if (hasOptions(3)) indices[3] = options.leftShiftSplit ? 1 : 0;
  return indices;
}
