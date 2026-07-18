/**
 * Lighting helpers: the rainbow preset (spec D11) and colour conversions for colour inputs.
 */
import tinycolor from 'tinycolor2';
import type { Rgb } from '../../device/model/types';
import type { LayoutKey } from '../../keyboard/model';

/**
 * Per-key colours of the rainbow preset, with the upstream EMIKeyboardConfigurator formula: the
 * reference colour's hue shifted by `density` degrees per key unit of the key centre's distance
 * along `directionDeg` (saturation and value kept). Keyed by key id; pass the keys to colour
 * (e.g. the visible, selected keys).
 */
export function rainbowColors(
  keys: readonly LayoutKey[],
  referenceHex: string,
  directionDeg: number,
  density: number
): ReadonlyMap<number, Rgb> {
  const reference = tinycolor(referenceHex).toHsv();
  const direction = (directionDeg / 360) * 2 * Math.PI;
  const colors = new Map<number, Rgb>();
  for (const key of keys) {
    const distance =
      (key.x + key.width / 2) * Math.cos(direction) +
      (key.y + key.height / 2) * Math.sin(direction);
    let hue = (reference.h + distance * density) % 360;
    if (hue < 0) hue += 360;
    const { r, g, b } = tinycolor({ ...reference, h: hue }).toRgb();
    colors.set(key.id, { red: r, green: g, blue: b });
  }
  return colors;
}

/** `#rrggbb` for a device colour (components floored, as in the Svelte panels). */
export function rgbToHex({ red, green, blue }: Rgb): string {
  const hex = (component: number) => `0${Math.floor(component).toString(16)}`.slice(-2);
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/** Device colour for a colour-input value. */
export function hexToRgb(hex: string): Rgb {
  const { r, g, b } = tinycolor(hex).toRgb();
  return { red: r, green: g, blue: b };
}
