import * as kle from '@ijprest/kle-serial';
import * as ekc from 'emi-keyboard-controller';
import { Keycode } from '../../../src-controller/src/interface';

/**
 * Transforms keyboard keys based on the current page/mode
 * @param keys - The base keyboard layout keys
 * @param advancedKeys - Advanced key configurations
 * @param rgbConfigs - RGB configurations
 * @param activePage - The current active page path
 * @param keymap - Current keyboard keymap data
 * @returns Transformed keys with appropriate labels
 */
export function transformKeyboardKeys(
  keys: kle.Key[],
  advancedKeys: any[],
  rgbConfigs: any[],
  activePage: string,
  keymap?: number[][]
): kle.Key[] {
  // Deep clone the keys to avoid mutation
  let newKeys = keys.map(key => JSON.parse(JSON.stringify(key)));

  // Performance page transformations
  if (activePage === '/performance' || activePage.startsWith('/performance/')) {
    newKeys.forEach((key, index) => {
      const advanced_key = advancedKeys[index];
      let labels = newKeys[index].labels;
      labels = labels.map(() => '');

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

  // Remap page transformations
  if (activePage === '/remap' || activePage.startsWith('/remap/')) {
    newKeys.forEach((key, index) => {
      newKeys[index].labels[0];
    });
  }

  // Lighting page transformations
  if (activePage === '/lighting' || activePage.startsWith('/lighting/')) {
    newKeys.forEach((key, index) => {
      const rgb_config = rgbConfigs[index];
      let labels = newKeys[index].labels;
      labels = labels.map(() => '');

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
