import * as kle from '@ijprest/kle-serial';
import * as ekc from 'emi-keyboard-controller';

/**
 * Transforms keyboard keys based on the current page/mode
 * @param keys - The base keyboard layout keys
 * @param advancedKeys - Advanced key configurations
 * @param rgbConfigs - RGB configurations
 * @param activePage - The current active page path
 * @returns Transformed keys with appropriate labels
 */
export function transformKeyboardKeys(
  keys: kle.Key[],
  advancedKeys: any[],
  rgbConfigs: any[],
  activePage: string
): kle.Key[] {
  // Deep clone the keys to avoid mutation
  let newKeys = keys.map(key => JSON.parse(JSON.stringify(key)));

  // Performance page transformations
  if (activePage === '/performance' || activePage.startsWith('/performance/')) {
    newKeys.forEach((key, index) => {
      const advanced_key = advancedKeys[index];
      let labels = newKeys[index].labels;
      labels = labels.map(() => "");
      
      switch (advanced_key.mode) {
        case ekc.KeyMode.KeyAnalogNormalMode: {
          labels[3] = `↓${Math.round(advanced_key.activation_value * 1000) / 10}\t↑${Math.round(advanced_key.deactivation_value * 1000) / 10}`;
          break;
        }
        case ekc.KeyMode.KeyAnalogRapidMode: {
          labels[3] = `↓${Math.round(advanced_key.trigger_distance * 1000) / 10}\t↑${Math.round(advanced_key.release_distance * 1000) / 10}`;
          labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
          break;
        }
        case ekc.KeyMode.KeyAnalogSpeedMode: {
          labels[3] = `↓${Math.round(advanced_key.trigger_speed * 1000) / 10}\t↑${Math.round(advanced_key.release_speed * 1000) / 10}`;
          labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
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
      newKeys[index].labels[0] = "2";
    });
  }

  // Lighting page transformations
  if (activePage === '/lighting' || activePage.startsWith('/lighting/')) {
    newKeys.forEach((key, index) => {
      const rgb_config = rgbConfigs[index];
      let labels = newKeys[index].labels;
      labels = labels.map(() => "");
      
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
