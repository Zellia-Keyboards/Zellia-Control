import {
  Zellia60Controller,
  Zellia80Controller,
  ZelliaStarlightController,
} from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { parseLayout, visibleKeys, type LayoutKey } from './layout';

const starlight = parseLayout(new ZelliaStarlightController().get_layout_json());

function keyById(keys: readonly LayoutKey[], id: number): LayoutKey {
  const key = keys.find(k => k.id === id);
  if (!key) throw new Error(`no key ${id}`);
  return key;
}

describe('parseLayout', () => {
  it('parses the KLE layout with key ids from labels[0] and layout groups from labels[8]', () => {
    expect(starlight).toHaveLength(91);
    expect(starlight[0]).toEqual({
      id: 0,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotationAngle: 0,
      rotationX: 0,
      rotationY: 0,
      labels: ['0', '', '', '', '', '', '', '', '', '', '', ''],
      layoutGroup: null,
    });
    // "13\n\n\n0,0" (w 2) and the split backspace "14\n\n\n0,1" drawn over it at x - 2.
    expect(starlight[13]).toMatchObject({
      id: 13,
      x: 13,
      width: 2,
      layoutGroup: { groupId: 0, option: 0 },
    });
    expect(starlight[13]?.labels).toEqual(['13', '', '', '', '', '', '', '', '0,0', '', '', '']);
    expect(starlight[14]).toMatchObject({ id: 14, x: 13, layoutGroup: { groupId: 0, option: 1 } });
    expect(new Set(starlight.map(k => k.id)).size).toBe(70);
  });

  it('keeps all 12 KLE label slots in their normalized positions', () => {
    const [key] = parseLayout(JSON.stringify([['a\nb\nc\nd\ne\n\nf\ng\nh\ni\nj']]));
    // Default alignment 4: line n goes to slot [0, 6, 2, 8, 10, -, 3, 5, 1, 4, 7, -][n].
    expect(key?.labels).toEqual(['a', 'h', 'c', 'f', 'i', 'g', 'b', 'j', 'd', '', 'e', '']);
    expect(key?.layoutGroup).toBeNull(); // labels[8] "d" is not "group,option"
  });

  it('falls back to the key index when labels[0] is not numeric (text layouts such as Zellia 80)', () => {
    const zellia80 = parseLayout(new Zellia80Controller().get_layout_json());
    expect(zellia80.slice(0, 3).map(k => [k.id, k.labels[0]])).toEqual([
      [0, 'Esc'],
      [1, 'F1'],
      [2, 'F2'],
    ]);
    const tilde = zellia80.find(k => k.labels[0] === '~');
    expect(tilde?.labels[6]).toBe('`');
    expect(zellia80.map(k => k.id)).toEqual(zellia80.map((_, index) => index));
  });

  it('parses multi-line JSON layouts (Zellia 60)', () => {
    const zellia60 = parseLayout(new Zellia60Controller().get_layout_json());
    expect(zellia60.length).toBeGreaterThan(60);
    expect(zellia60.some(k => k.layoutGroup?.groupId === 3)).toBe(true);
  });

  it('passes rotation through from kle-serial', () => {
    const keys = parseLayout(
      JSON.stringify([
        [{ r: 15, rx: 1, ry: 2 }, '0', '1'],
        [{ x: 0.5 }, '2'],
      ])
    );
    expect(keys.map(k => [k.id, k.x, k.y, k.rotationAngle, k.rotationX, k.rotationY])).toEqual([
      [0, 0, 0, 15, 1, 2],
      [1, 1, 0, 15, 1, 2],
      [2, 1.5, 1, 15, 1, 2],
    ]);
  });

  it('ignores malformed layout groups like the Svelte parser', () => {
    const keys = parseLayout(
      JSON.stringify([['0\n\n\n1', '1\n\n\nx,1', '2\n\n\n2,y', '3\n\n\n4,5']])
    );
    expect(keys.map(k => k.layoutGroup)).toEqual([null, null, null, { groupId: 4, option: 5 }]);
  });

  it('returns no keys for an empty layout and throws a descriptive Error for invalid input', () => {
    expect(parseLayout('[]')).toEqual([]);
    expect(() => parseLayout('not json')).toThrow(/Invalid keyboard layout/);
    expect(() => parseLayout('{}')).toThrow(/Invalid keyboard layout/);
    expect(() => parseLayout(JSON.stringify([['0', { r: 5 }, '1']]))).toThrow(
      /rotation can only be specified on the first key in a row/
    );
  });
});

describe('visibleKeys', () => {
  it('shows ungrouped keys and the selected option of each layout group', () => {
    const defaults = visibleKeys(starlight, [0, 0, 0]);
    expect(defaults.map(k => k.id)).toContain(13);
    expect(defaults.map(k => k.id)).not.toContain(14);
    expect(new Set(defaults.map(k => k.id)).size).toBe(defaults.length);
    expect(keyById(defaults, 60)).toMatchObject({
      width: 6.25,
      layoutGroup: { groupId: 2, option: 0 },
    });

    const split = visibleKeys(starlight, [1, 1, 3]);
    expect(split.map(k => k.id)).toEqual(expect.arrayContaining([14, 15, 55, 56, 68, 67, 69]));
    expect(split.map(k => k.id)).not.toContain(13);
    expect(keyById(split, 68)).toMatchObject({ width: 3, layoutGroup: { groupId: 2, option: 3 } });
  });

  it('hides every grouped key when no option is selected for its group', () => {
    expect(visibleKeys(starlight, []).every(k => k.layoutGroup === null)).toBe(true);
    expect(visibleKeys(starlight, [])).toHaveLength(starlight.filter(k => !k.layoutGroup).length);
  });
});
