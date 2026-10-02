import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { en } from '../../../lib/i18n/en';
import { BASE_MODES, KEY_MODES, modeOption } from './modes';

describe('lighting modes', () => {
  it('list every base mode and every key mode in device order', () => {
    expect(BASE_MODES.map(mode => mode.value)).toEqual([
      RGBBaseMode.RgbBaseModeOff,
      RGBBaseMode.RgbBaseModeBlank,
      RGBBaseMode.RgbBaseModeRainbow,
      RGBBaseMode.RgbBaseModeWave,
    ]);
    expect(KEY_MODES.map(mode => mode.value)).toEqual([
      RGBMode.RgbModeFixed,
      RGBMode.RgbModeStatic,
      RGBMode.RgbModeCycle,
      RGBMode.RgbModeLinear,
      RGBMode.RgbModeTrigger,
      RGBMode.RgbModeString,
      RGBMode.RgbModeFadingString,
      RGBMode.RgbModeDiamondRipple,
      RGBMode.RgbModeFadingDiamondRipple,
      RGBMode.RgbModeJelly,
      RGBMode.RgbModeBubble,
    ]);
  });

  it('explain each mode with copy of its own', () => {
    const descriptions = [...BASE_MODES, ...KEY_MODES].map(mode => en[mode.description]);
    expect(new Set(descriptions).size).toBe(15);
  });

  it('find a mode by its device value', () => {
    expect(modeOption(KEY_MODES, RGBMode.RgbModeJelly)?.label).toBe('rgb_mode_jelly');
    expect(modeOption(BASE_MODES.slice(1), RGBBaseMode.RgbBaseModeOff)).toBeUndefined();
  });
});
