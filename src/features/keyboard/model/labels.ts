/**
 * Per-page keycap labels: a port of the Svelte `transformKeyboardKeys`, as pure functions of the
 * layout keys and one device slice. Each returns 12 KLE label slots per key id (`''` when empty);
 * the keycap renders slots 0..8 (3×3 grid), and Remap keeps a dynamic key's slot number in slot 9.
 */
import { KeyMode, RGBMode } from 'emi-keyboard-controller';
import type {
  AdvancedKeyConfig,
  DynamicKeySlot,
  Keymap,
  RgbKeyConfig,
} from '../../device/model/types';
import { fractionToMm } from '../../device/model/units';
import { DYNAMIC_KEY_KIND_NAMES, describeKeycode, dynamicKeySlotOf } from '../../keycodes';
import { KLE_LABEL_SLOTS, type LayoutKey } from './layout';

/** KLE label slots 0..11: 0 top-left, 1 top-center, … 8 bottom-right (see `Key` rendering). */
export type KeyLabels = readonly string[];

const emptyLabels = (): string[] => Array.from({ length: KLE_LABEL_SLOTS }, () => '');

/** The key's own layout labels, as exactly `KLE_LABEL_SLOTS` slots. */
const layoutLabels = (key: LayoutKey): KeyLabels =>
  key.labels.length === KLE_LABEL_SLOTS
    ? key.labels
    : Array.from({ length: KLE_LABEL_SLOTS }, (_, slot) => key.labels[slot] ?? '');

/** Labels per key id; for duplicate ids the first key wins. */
function labelsById(
  keys: readonly LayoutKey[],
  labelsFor: (key: LayoutKey) => KeyLabels
): ReadonlyMap<number, KeyLabels> {
  const labels = new Map<number, KeyLabels>();
  for (const key of keys) {
    if (!labels.has(key.id)) labels.set(key.id, labelsFor(key));
  }
  return labels;
}

/** Millimetres with three decimals (values are compared in this form, as displayed). */
const mm = (fraction: number): string => fractionToMm(fraction).toFixed(3);

function setPressRelease(labels: string[], press: number, release: number): void {
  const pressMm = mm(press);
  const releaseMm = mm(release);
  if (pressMm === releaseMm) {
    labels[4] = `⇅${pressMm}`;
  } else {
    labels[1] = `↓${pressMm}`;
    labels[7] = `↑${releaseMm}`;
  }
}

function setDeadzones(labels: string[], config: AdvancedKeyConfig): void {
  labels[0] = `↧${mm(config.upperDeadzone)}`;
  labels[8] = `↥${mm(config.lowerDeadzone)}`;
}

/**
 * Performance page: actuation/release points (normal mode), rapid-trigger distances or speeds
 * plus deadzones (rapid and speed modes); digital keys stay blank.
 */
export function performanceLabels(
  keys: readonly LayoutKey[],
  advancedKeys: readonly AdvancedKeyConfig[]
): ReadonlyMap<number, KeyLabels> {
  return labelsById(keys, key => {
    const labels = emptyLabels();
    const config = advancedKeys[key.id];
    switch (config?.mode) {
      case KeyMode.KeyAnalogNormalMode:
        setPressRelease(labels, config.activation, config.deactivation);
        break;
      case KeyMode.KeyAnalogRapidMode:
        setPressRelease(labels, config.triggerDistance, config.releaseDistance);
        setDeadzones(labels, config);
        break;
      case KeyMode.KeyAnalogSpeedMode:
        setPressRelease(labels, config.triggerSpeed, config.releaseSpeed);
        setDeadzones(labels, config);
        break;
      default:
        break;
    }
    return labels;
  });
}

/**
 * Remap page: the keycode on layer `layerIndex` (0-based) — modifiers/category top-left and the
 * key name bottom-left; a dynamic key shows its kind (or its slot number when the slot does not
 * exist) with the slot number in slot 9. Keys without a keymap entry keep their layout labels.
 */
export function remapLabels(
  keys: readonly LayoutKey[],
  keymap: Keymap,
  layerIndex: number,
  dynamicKeys: readonly DynamicKeySlot[]
): ReadonlyMap<number, KeyLabels> {
  const layer = keymap[layerIndex];
  return labelsById(keys, key => {
    const keycode = layer?.[key.id];
    if (keycode === undefined) return layoutLabels(key);
    const labels = emptyLabels();
    const description = describeKeycode(keycode);
    const slot = dynamicKeySlotOf(keycode);
    if (slot === null) {
      labels[0] = description.sub;
      labels[6] = description.main;
    } else {
      const dynamicKey = dynamicKeys[slot];
      labels[6] = dynamicKey ? DYNAMIC_KEY_KIND_NAMES[dynamicKey.kind] : description.main;
      labels[9] = description.main;
    }
    return labels;
  });
}

/** Lighting page: the static, reactive (linear) and ripple modes are named in slot 3. */
export function lightingLabels(
  keys: readonly LayoutKey[],
  rgbKeys: readonly RgbKeyConfig[]
): ReadonlyMap<number, KeyLabels> {
  return labelsById(keys, key => {
    const labels = emptyLabels();
    switch (rgbKeys[key.id]?.mode) {
      case RGBMode.RgbModeStatic:
        labels[3] = 'Static';
        break;
      case RGBMode.RgbModeLinear:
        labels[3] = 'reactive';
        break;
      case RGBMode.RgbModeFadingDiamondRipple:
        labels[3] = 'ripple';
        break;
      default:
        break;
    }
    return labels;
  });
}
