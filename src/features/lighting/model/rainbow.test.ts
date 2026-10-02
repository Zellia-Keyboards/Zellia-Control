import { ZelliaStarlightController } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { parseLayout, visibleKeys, type LayoutKey } from '../../keyboard/model';
import { hexToRgb, rainbowColors, rgbToHex } from './rainbow';

const key = (id: number, x: number, y: number, width = 1, height = 1): LayoutKey => ({
  id,
  x,
  y,
  width,
  height,
  rotationAngle: 0,
  rotationX: 0,
  rotationY: 0,
  labels: [],
  layoutGroup: null,
});

const rgb = (red: number, green: number, blue: number) => ({ red, green, blue });

describe('rainbowColors (D11, upstream RGBPanel formula)', () => {
  const row = [key(0, 0, 0), key(1, 1, 0), key(2, 2, 0)];

  it('shifts the reference hue by density × the key centre’s distance along the direction', () => {
    // Centres 0.5, 1.5, 2.5 → hues 30°, 90°, 150° at full saturation and value.
    expect(rainbowColors(row, '#ff0000', 0, 60)).toEqual(
      new Map([
        [0, rgb(255, 128, 0)],
        [1, rgb(128, 255, 0)],
        [2, rgb(0, 255, 128)],
      ])
    );
  });

  it('measures along the direction in degrees (90° runs down the columns)', () => {
    const column = [key(0, 0, 0), key(1, 0, 1), key(2, 0, 2)];
    expect(rainbowColors(column, '#ff0000', 90, 60)).toEqual(rainbowColors(row, '#ff0000', 0, 60));
  });

  it('wraps negative hues into 0..360', () => {
    // Direction 180° → distance −0.5 → hue −30° → 330°.
    expect(rainbowColors([key(0, 0, 0)], '#ff0000', 180, 60).get(0)).toEqual(rgb(255, 0, 128));
  });

  it('keeps the reference colour’s saturation and value', () => {
    expect(rainbowColors([key(0, 0, 0)], '#800000', 0, 60).get(0)).toEqual(rgb(128, 64, 0));
    expect(rainbowColors([key(0, 0, 0)], '#ffffff', 0, 60).get(0)).toEqual(rgb(255, 255, 255));
  });

  it('colours the real layout by key id, using each key’s centre', () => {
    const keys = visibleKeys(
      parseLayout(new ZelliaStarlightController().get_layout_json()),
      [0, 0, 0]
    );
    const colors = rainbowColors(keys, '#ff0000', 0, 10);
    expect(colors.size).toBe(keys.length);
    expect(colors.get(0)).toEqual(rgb(255, 21, 0)); // centre x 0.5 → hue 5°
    expect(colors.get(13)).toEqual(rgb(0, 255, 85)); // 2u backspace at x 13: centre 14 → 140°
  });

  it('assigns per key id; for duplicate ids the last key wins, like upstream', () => {
    const colors = rainbowColors([key(7, 0, 0), key(7, 2, 0)], '#ff0000', 0, 60);
    expect([...colors]).toEqual([[7, rgb(0, 255, 128)]]);
  });
});

describe('colour helpers', () => {
  it('formats device colours as lower-case #rrggbb (Svelte rgbToHex)', () => {
    expect(rgbToHex(rgb(163, 55, 252))).toBe('#a337fc');
    expect(rgbToHex(rgb(0, 0, 0))).toBe('#000000');
    expect(rgbToHex(rgb(255, 255, 255))).toBe('#ffffff');
    expect(rgbToHex(rgb(12.7, 1, 16))).toBe('#0c0110');
  });

  it('parses colour-input values into device colours', () => {
    expect(hexToRgb('#a337fc')).toEqual(rgb(163, 55, 252));
    expect(hexToRgb('#A337FC')).toEqual(rgb(163, 55, 252));
    expect(hexToRgb(rgbToHex(rgb(1, 2, 3)))).toEqual(rgb(1, 2, 3));
  });
});
