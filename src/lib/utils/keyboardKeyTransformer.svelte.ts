import * as kle from '@ijprest/kle-serial';
import * as ekc from 'emi-keyboard-controller';
import { Keycode } from '../../../src-controller/src/interface';
import { keyCodeToString, DynamicKeyToKeyName } from '../keycodes/KeycodeDisplay';

/**
 * Represents a layout group for multi-layout keyboards.
 * Keys with a layoutGroup are only visible when their group option is selected.
 */
export interface LayoutGroup {
  groupId: number;
  id: number;
}

/**
 * Extended key type that includes a numeric ID and optional layout group.
 * The id corresponds to the key's actual index in the controller's data arrays.
 */
export interface ExtendedKey extends kle.Key {
  id: number;
  layoutGroup: LayoutGroup | undefined;
}

/**
 * Parse a layout group string (format: "groupId,optionId") into a LayoutGroup.
 */
export function parseLayoutGroup(str: string | undefined): LayoutGroup | undefined {
  if (!str || str === '') return undefined;
  const [groupStr, optStr] = str.split(',');
  const groupId = parseInt(groupStr);
  const id = parseInt(optStr);
  if (Number.isNaN(groupId) || Number.isNaN(id)) return undefined;
  return { groupId, id };
}

/**
 * Parse the key ID from labels[0]. Falls back to the array index if not numeric.
 */
export function parseKeyId(labels: string[], fallbackIndex: number): number {
  const parsed = parseInt(labels[0]);
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
}

/**
 * Map raw KLE keys to ExtendedKeys with parsed id and layoutGroup.
 */
export function mapToExtendedKeys(keys: kle.Key[]): ExtendedKey[] {
  return keys.map((k, i) => ({
    ...k,
    id: parseKeyId(k.labels, i),
    layoutGroup: parseLayoutGroup(k.labels[8]),
  }));
}

/**
 * Filter keys based on the selected layout indices.
 * Keys without a layout group are always visible.
 * Keys with a layout group are only visible when their option matches the selected index for that group.
 */
export function filterVisibleKeys(keys: ExtendedKey[], selectedIndices: number[]): ExtendedKey[] {
  return keys.filter((key) => {
    if (key.layoutGroup != undefined) {
      return selectedIndices[key.layoutGroup.groupId] === key.layoutGroup.id;
    }
    return true;
  });
}

/**
 * Transforms keyboard keys based on the current page/mode
 * @param keys - The base keyboard layout keys
 * @param advancedKeys - Advanced key configurations
 * @param rgbConfigs - RGB configurations
 * @param activePage - The current active page path
 * @param keymap - Current keyboard keymap data (layers × keys)
 * @param selectedLayer - Currently selected layer (1-indexed)
 * @param dynamicKeys - Dynamic key configurations
 * @returns Transformed keys with appropriate labels
 */
export function transformKeyboardKeys(
  keys: ExtendedKey[],
  advancedKeys: any[],
  rgbConfigs: any[],
  activePage: string,
  keymap?: number[][],
  selectedLayer?: number,
  dynamicKeys?: ekc.IDynamicKey[]
): ExtendedKey[] {
  // Deep clone the keys to avoid mutation
  let newKeys = keys.map(key => ({ ...JSON.parse(JSON.stringify(key)), id: key.id, layoutGroup: key.layoutGroup } as ExtendedKey));

  // Performance page transformations
  if (activePage === '/performance' || activePage.startsWith('/performance/')) {
    newKeys.forEach((key, index) => {
      const keyId = key.id;
      const advanced_key = advancedKeys[keyId];
      let labels = newKeys[index].labels;
      labels = labels.map(() => '');

      if (!advanced_key) {
        newKeys[index].labels = labels;
        return;
      }

      // Helper to convert percentage (0-1) to mm and format nicely
      const toMm = (val: number) => (val * 4.0).toFixed(3);

      // KLE label positions:
      // 0=top-left, 1=top-center, 2=top-right
      // 3=center-left, 4=center, 5=center-right
      // 6=bottom-left, 7=bottom-center, 8=bottom-right

      switch (advanced_key.mode) {
        case ekc.KeyMode.KeyAnalogNormalMode: {
          const activationMm = toMm(advanced_key.activation_value);
          const deactivationMm = toMm(advanced_key.deactivation_value);
          // If activation and deactivation are the same, show single value with ⇅ in center
          if (activationMm === deactivationMm) {
            labels[4] = `⇅${activationMm}`;
          } else {
            labels[1] = `↓${activationMm}`; // press at top-center
            labels[7] = `↑${deactivationMm}`; // release at bottom-center
          }
          break;
        }
        case ekc.KeyMode.KeyAnalogRapidMode: {
          const triggerMm = toMm(advanced_key.trigger_distance);
          const releaseMm = toMm(advanced_key.release_distance);
          const upperDz = toMm(advanced_key.upper_deadzone);
          const lowerDz = toMm(advanced_key.lower_deadzone);
          // If trigger and release distances are the same, show single value with ⇅ in center
          if (triggerMm === releaseMm) {
            labels[4] = `⇅${triggerMm}`;
          } else {
            labels[7] = `↑${releaseMm}`; // release at bottom-center
            labels[1] = `↓${triggerMm}`; // press at top-center
          }
          labels[0] = `↧${upperDz}`; // upper deadzone at top-left
          labels[8] = `↥${lowerDz}`; // lower deadzone at bottom-right
          break;
        }
        case ekc.KeyMode.KeyAnalogSpeedMode: {
          const triggerSpd = toMm(advanced_key.trigger_speed);
          const releaseSpd = toMm(advanced_key.release_speed);
          const upperDz = toMm(advanced_key.upper_deadzone);
          const lowerDz = toMm(advanced_key.lower_deadzone);
          if (triggerSpd === releaseSpd) {
            labels[4] = `⇅${triggerSpd}`;
          } else {
            labels[1] = `↓${triggerSpd}`; // press at top-center
            labels[7] = `↑${releaseSpd}`; // release at bottom-center
          }
          labels[0] = `↧${upperDz}`; // upper deadzone at top-left
          labels[8] = `↥${lowerDz}`; // lower deadzone at bottom-right
          break;
        }
        default: {
          break;
        }
      }
      newKeys[index].labels = labels;
    });
  }

  // Remap page transformations - show keycode labels from keymap
  if (activePage === '/remap' || activePage.startsWith('/remap/')) {
    if (keymap && keymap.length > 0 && selectedLayer != null) {
      const layerIndex = selectedLayer - 1;
      if (layerIndex >= 0 && layerIndex < keymap.length) {
        const layer = keymap[layerIndex];
        newKeys.forEach((key, index) => {
          const keyId = key.id;
          if (keyId < layer.length && layer[keyId] != null) {
            let labels = newKeys[index].labels;
            labels = labels.map(() => '');
            const keycodeValue = layer[keyId];

            if ((keycodeValue & 0xff) === Keycode.DynamicKey) {
              const strings = keyCodeToString(keycodeValue);
              const dkId = (keycodeValue >> 8) & 0xff;
              if (dynamicKeys && dynamicKeys[dkId]) {
                labels[6] = DynamicKeyToKeyName[dynamicKeys[dkId].type as ekc.DynamicKeyType] ?? '';
              } else {
                labels[6] = strings.mainString;
              }
              labels[9] = strings.mainString;
            } else {
              const strings = keyCodeToString(keycodeValue);
              labels[0] = strings.subString;
              labels[6] = strings.mainString;
            }

            newKeys[index].labels = labels;
          }
        });
      }
    }
  }

  // Lighting page transformations
  if (activePage === '/lighting' || activePage.startsWith('/lighting/')) {
    newKeys.forEach((key, index) => {
      const keyId = key.id;
      const rgb_config = rgbConfigs[keyId];
      let labels = newKeys[index].labels;
      labels = labels.map(() => '');

      if (!rgb_config) {
        newKeys[index].labels = labels;
        return;
      }

      switch (rgb_config.mode) {
        case ekc.RGBMode.RgbModeStatic: {
          labels[3] = `Static`;
          break;
        }
        case ekc.RGBMode.RgbModeLinear: {
          labels[3] = `reactive`;
          break;
        }
        case ekc.RGBMode.RgbModeFadingDiamondRipple: {
          labels[3] = `ripple`;
          break;
        }
        default: {
          break;
        }
      }
      newKeys[index].labels = labels;
    });
  }

  return newKeys;
}
