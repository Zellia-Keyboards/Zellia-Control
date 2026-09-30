import { RGBBaseMode, RGBMode } from 'emi-keyboard-controller';
import type { TranslationKey } from '../../../lib/i18n';

/**
 * A mode button: the device value, its label and its explanation (written from libamp's
 * `src/rgb.c`; see the lighting redesign spec).
 */
export interface ModeOption<Mode> {
  readonly value: Mode;
  readonly label: TranslationKey;
  readonly description: TranslationKey;
}

export const BASE_MODES: readonly ModeOption<RGBBaseMode>[] = [
  {
    value: RGBBaseMode.RgbBaseModeOff,
    label: 'rgb_base_mode_off',
    description: 'rgb_base_mode_off_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeBlank,
    label: 'rgb_base_mode_blank',
    description: 'rgb_base_mode_blank_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeRainbow,
    label: 'rgb_base_mode_rainbow',
    description: 'rgb_base_mode_rainbow_desc',
  },
  {
    value: RGBBaseMode.RgbBaseModeWave,
    label: 'rgb_base_mode_wave',
    description: 'rgb_base_mode_wave_desc',
  },
];

export const KEY_MODES: readonly ModeOption<RGBMode>[] = [
  { value: RGBMode.RgbModeFixed, label: 'rgb_mode_fixed', description: 'rgb_mode_fixed_desc' },
  { value: RGBMode.RgbModeStatic, label: 'rgb_mode_static', description: 'rgb_mode_static_desc' },
  { value: RGBMode.RgbModeCycle, label: 'rgb_mode_cycle', description: 'rgb_mode_cycle_desc' },
  { value: RGBMode.RgbModeLinear, label: 'rgb_mode_linear', description: 'rgb_mode_linear_desc' },
  {
    value: RGBMode.RgbModeTrigger,
    label: 'rgb_mode_trigger',
    description: 'rgb_mode_trigger_desc',
  },
  { value: RGBMode.RgbModeString, label: 'rgb_mode_string', description: 'rgb_mode_string_desc' },
  {
    value: RGBMode.RgbModeFadingString,
    label: 'rgb_mode_fading_string',
    description: 'rgb_mode_fading_string_desc',
  },
  {
    value: RGBMode.RgbModeDiamondRipple,
    label: 'rgb_mode_diamond_ripple',
    description: 'rgb_mode_diamond_ripple_desc',
  },
  {
    value: RGBMode.RgbModeFadingDiamondRipple,
    label: 'rgb_mode_fading_diamond_ripple',
    description: 'rgb_mode_fading_diamond_ripple_desc',
  },
  { value: RGBMode.RgbModeJelly, label: 'rgb_mode_jelly', description: 'rgb_mode_jelly_desc' },
  { value: RGBMode.RgbModeBubble, label: 'rgb_mode_bubble', description: 'rgb_mode_bubble_desc' },
];

/** The option of `value`, if `modes` has it. */
export function modeOption<Mode>(
  modes: readonly ModeOption<Mode>[],
  value: Mode
): ModeOption<Mode> | undefined {
  return modes.find(mode => mode.value === value);
}
