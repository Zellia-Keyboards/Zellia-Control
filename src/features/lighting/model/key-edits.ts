/**
 * Edits of the per-key lighting (docs/superpowers/specs/2026-10-01-lighting-redesign-design.md):
 * the keys an edit changes, the values they share, and the configurations an edit writes.
 */
import type { RGBMode } from 'emi-keyboard-controller';
import type { Rgb, RgbKeyConfig } from '../../device/model/types';

/** The value of a field that differs between the edited keys. */
export const MIXED = 'mixed';
export type Mixed = typeof MIXED;

/** One key's new configuration, as `deviceSession.setRgbKeys` takes it. */
export interface KeyConfigEntry {
  readonly keyId: number;
  readonly config: RgbKeyConfig;
}

/** What the key panel shows: each field the targets share, or `MIXED`. */
export interface SharedKeyValues {
  readonly mode: RGBMode | Mixed;
  readonly color: Rgb | Mixed;
  readonly speed: number | Mixed;
  /** The first target's configuration: a control shows it where its field is mixed. */
  readonly first: RgbKeyConfig;
}

/**
 * The keys a key-panel edit changes: the selected keys the keyboard has lighting for (in
 * selection order), or all `keyCount` keys while none is selected.
 */
export function lightingTargets(selected: readonly number[], keyCount: number): number[] {
  if (selected.length === 0) return Array.from({ length: keyCount }, (_, id) => id);
  return selected.filter(id => Number.isInteger(id) && id >= 0 && id < keyCount);
}

function sameRgb(a: Rgb, b: Rgb): boolean {
  return a.red === b.red && a.green === b.green && a.blue === b.blue;
}

/** The targets' shared values; null without targets. */
export function sharedKeyValues(
  rgbKeys: readonly RgbKeyConfig[],
  targets: readonly number[]
): SharedKeyValues | null {
  const configs = targets.flatMap(id => {
    const config = rgbKeys[id];
    return config ? [config] : [];
  });
  const [first] = configs;
  if (!first) return null;
  return {
    mode: configs.every(config => config.mode === first.mode) ? first.mode : MIXED,
    color: configs.every(config => sameRgb(config.color, first.color)) ? first.color : MIXED,
    speed: configs.every(config => config.speed === first.speed) ? first.speed : MIXED,
    first,
  };
}

/** Each target's configuration with `patch` applied; its other fields are kept. */
export function editKeys(
  rgbKeys: readonly RgbKeyConfig[],
  targets: readonly number[],
  patch: Partial<RgbKeyConfig>
): KeyConfigEntry[] {
  return targets.flatMap(keyId => {
    const config = rgbKeys[keyId];
    return config ? [{ keyId, config: { ...config, ...patch } }] : [];
  });
}

/** The keys of `colors` with their new colour; mode and speed are kept. */
export function recolorKeys(
  rgbKeys: readonly RgbKeyConfig[],
  colors: ReadonlyMap<number, Rgb>
): KeyConfigEntry[] {
  return [...colors].flatMap(([keyId, color]) => {
    const config = rgbKeys[keyId];
    return config ? [{ keyId, config: { ...config, color } }] : [];
  });
}
