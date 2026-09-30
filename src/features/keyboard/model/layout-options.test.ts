import { Zellia60Controller, ZelliaStarlightController } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT_OPTIONS,
  LAYOUT_OPTIONS_STORAGE_KEY,
  layoutVariantIndices,
  parseLayoutOptions,
  type LayoutOptions,
} from './layout-options';

const STARLIGHT_LABELS = new ZelliaStarlightController().get_layout_labels();
const ZELLIA_60_LABELS = new Zellia60Controller().get_layout_labels();

const options = (overrides: Partial<LayoutOptions>): LayoutOptions => ({
  ...DEFAULT_LAYOUT_OPTIONS,
  ...overrides,
});

describe('layout options', () => {
  it('keeps the Svelte storage key and defaults', () => {
    expect(LAYOUT_OPTIONS_STORAGE_KEY).toBe('zellia-layout-config');
    expect(DEFAULT_LAYOUT_OPTIONS).toEqual({
      bottomRowConfig: '6.25u',
      splitSpacebar: false,
      rightShiftSplit: false,
      leftShiftSplit: false,
      splitBackspace: false,
    });
  });

  it('parses stored options and falls back to the default for each missing or invalid field', () => {
    const stored = {
      bottomRowConfig: '7u',
      splitSpacebar: true,
      rightShiftSplit: true,
      leftShiftSplit: false,
      splitBackspace: true,
    };
    expect(parseLayoutOptions(stored)).toEqual(stored);
    expect(parseLayoutOptions({ splitBackspace: true, extra: 1 })).toEqual(
      options({ splitBackspace: true })
    );
    expect(parseLayoutOptions({ bottomRowConfig: '8u', splitSpacebar: 'yes' })).toEqual(
      DEFAULT_LAYOUT_OPTIONS
    );
    for (const invalid of [null, undefined, 'x', 42, [], [true]]) {
      expect(parseLayoutOptions(invalid)).toEqual(DEFAULT_LAYOUT_OPTIONS);
    }
  });
});

describe('layoutVariantIndices (LayoutConfigDropdown mapping)', () => {
  it('maps group 0 to split backspace, 1 to right-shift split and 2 to the bottom row × 4', () => {
    expect(STARLIGHT_LABELS).toHaveLength(3);
    const indices = (overrides: Partial<LayoutOptions>) =>
      layoutVariantIndices(STARLIGHT_LABELS, options(overrides));
    expect(indices({})).toEqual([0, 0, 0]);
    expect(indices({ splitBackspace: true })).toEqual([1, 0, 0]);
    expect(indices({ rightShiftSplit: true })).toEqual([0, 1, 0]);
    expect(indices({ splitSpacebar: true })).toEqual([0, 0, 1]);
    expect(indices({ bottomRowConfig: '7u' })).toEqual([0, 0, 2]);
    expect(indices({ bottomRowConfig: '7u', splitSpacebar: true })).toEqual([0, 0, 3]);
    // No group 3 on the Starlight: left-shift split has no effect.
    expect(indices({ leftShiftSplit: true })).toEqual([0, 0, 0]);
  });

  it('applies the same fixed mapping to other models (Starlight-shaped, as in the Svelte app)', () => {
    // Zellia 60 groups: backspace, left shift, enter (1 option), space (2 options).
    const indices = (overrides: Partial<LayoutOptions>) =>
      layoutVariantIndices(ZELLIA_60_LABELS, options(overrides));
    expect(indices({ rightShiftSplit: true })).toEqual([0, 1, 0, 0]);
    expect(indices({ leftShiftSplit: true })).toEqual([0, 0, 0, 1]);
    // The bottom-row index is clamped to the group's label count (not count - 1).
    expect(indices({ bottomRowConfig: '7u', splitSpacebar: true })).toEqual([0, 0, 1, 0]);
  });

  it('leaves groups without labels and groups beyond the fourth at option 0', () => {
    const all = options({
      bottomRowConfig: '7u',
      splitSpacebar: true,
      rightShiftSplit: true,
      leftShiftSplit: true,
      splitBackspace: true,
    });
    expect(layoutVariantIndices([[], [], [], []], all)).toEqual([0, 0, 0, 0]);
    expect(layoutVariantIndices([['a'], ['b'], ['c', 'd'], ['e'], ['f']], all)).toEqual([
      1, 1, 2, 1, 0,
    ]);
    expect(layoutVariantIndices([], all)).toEqual([]);
  });
});
