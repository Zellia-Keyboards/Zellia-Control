/**
 * The Performance page's settings (port of the `routes/performance/+page.svelte` state) and the
 * "brush" they form: the values of the first selected key (spec D12), edited by the controls and
 * applied to every selected key, including keys selected later (§1.4).
 *
 * The controls work in millimetres of the 4.0 mm travel (`features/device/model/units`); the
 * device stores fractions of travel. Loaded values are rounded to thousandths of a millimetre for
 * display, so a value the user has not changed is written back from the loaded key itself, never
 * from its rounded millimetres: an untouched key round-trips exactly.
 */
import { CalibrationMode, KeyMode } from 'emi-keyboard-controller';
import type { AdvancedKeyConfig } from '../../device';
import {
  bottomMmToLowerDeadzone,
  fractionToMm,
  lowerDeadzoneToBottomMm,
  mmToFraction,
} from '../../device/model/units';

/** What the controls show and edit, named like the Svelte page state. Distances in mm. */
export interface PerformanceSettings {
  readonly rapidTriggerEnabled: boolean;
  readonly actuationPoint: number;
  /** At most the actuation point − 0.1 mm (hysteresis), as the controls clamp it. */
  readonly deactivationPoint: number;
  /** Rapid-trigger distance for press and release while they are not separate. */
  readonly sensitivityValue: number;
  readonly separateSensitivity: boolean;
  readonly pressSensitivity: number;
  readonly releaseSensitivity: number;
  /** Start of the active range, from the top. */
  readonly upperDeadzone: number;
  /** Bottom-out point: end of the active range, from the top. */
  readonly lowerDeadzone: number;
}

/** The Svelte page's initial values, shown until the first key is selected. */
export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = Object.freeze({
  rapidTriggerEnabled: false,
  actuationPoint: 2.0,
  deactivationPoint: 1.5,
  sensitivityValue: 0.5,
  separateSensitivity: false,
  pressSensitivity: 0.5,
  releaseSensitivity: 0.5,
  upperDeadzone: 0.5,
  lowerDeadzone: 3.5,
});

/** Initial switch travel of the travel badge (mm). It only bounds the sliders. */
export const DEFAULT_MAX_TRAVEL_DISTANCE = 4.0;

export interface PerformanceBrush {
  readonly settings: PerformanceSettings;
  /** `settings` as loaded from `source`. */
  readonly loaded: PerformanceSettings;
  /** The key the settings were loaded from; supplies every value without a control. */
  readonly source: AdvancedKeyConfig;
}

function roundMm(mm: number): number {
  return Math.round(mm * 1000) / 1000;
}

function clampFraction(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

/** Loads all values of `key` (D12): distances in mm, the lower deadzone as the bottom-out point. */
export function brushFromKey(key: AdvancedKeyConfig): PerformanceBrush {
  const trigger = roundMm(fractionToMm(key.triggerDistance));
  const settings: PerformanceSettings = {
    rapidTriggerEnabled: key.mode === KeyMode.KeyAnalogRapidMode,
    actuationPoint: roundMm(fractionToMm(key.activation)),
    deactivationPoint: roundMm(fractionToMm(key.deactivation)),
    sensitivityValue: trigger,
    separateSensitivity: key.triggerDistance !== key.releaseDistance,
    pressSensitivity: trigger,
    releaseSensitivity: roundMm(fractionToMm(key.releaseDistance)),
    upperDeadzone: roundMm(fractionToMm(key.upperDeadzone)),
    lowerDeadzone: roundMm(lowerDeadzoneToBottomMm(key.lowerDeadzone)),
  };
  return { settings, loaded: settings, source: key };
}

/** The same brush with other control values. */
export function withSettings(brush: PerformanceBrush, settings: PerformanceSettings) {
  return settings === brush.settings ? brush : { ...brush, settings };
}

/**
 * The configuration the brush writes to each selected key. Values still equal to what was loaded
 * come from the source key exactly; edited ones are converted (`mm / 4.0`, the bottom-out point
 * as `(4.0 − bottom) / 4.0`) and clamped to the travel.
 */
export function brushConfig({ settings, loaded, source }: PerformanceBrush): AdvancedKeyConfig {
  const fraction = (mm: number) => clampFraction(mmToFraction(mm));
  const kept = (mm: number, loadedMm: number, loadedFraction: number) =>
    mm === loadedMm ? loadedFraction : fraction(mm);
  // Either rapid-trigger distance may take the other's loaded value (e.g. when joining them).
  const pressMm = settings.separateSensitivity
    ? settings.pressSensitivity
    : settings.sensitivityValue;
  const releaseMm = settings.separateSensitivity
    ? settings.releaseSensitivity
    : settings.sensitivityValue;
  const triggerDistance =
    pressMm === loaded.pressSensitivity
      ? source.triggerDistance
      : kept(pressMm, loaded.releaseSensitivity, source.releaseDistance);
  const releaseDistance =
    releaseMm === loaded.releaseSensitivity
      ? source.releaseDistance
      : kept(releaseMm, loaded.pressSensitivity, source.triggerDistance);

  return {
    ...source,
    mode:
      settings.rapidTriggerEnabled === loaded.rapidTriggerEnabled
        ? source.mode
        : settings.rapidTriggerEnabled
          ? KeyMode.KeyAnalogRapidMode
          : KeyMode.KeyAnalogNormalMode,
    activation: kept(settings.actuationPoint, loaded.actuationPoint, source.activation),
    deactivation: kept(settings.deactivationPoint, loaded.deactivationPoint, source.deactivation),
    triggerDistance,
    releaseDistance,
    upperDeadzone: kept(settings.upperDeadzone, loaded.upperDeadzone, source.upperDeadzone),
    lowerDeadzone:
      settings.lowerDeadzone === loaded.lowerDeadzone
        ? source.lowerDeadzone
        : clampFraction(bottomMmToLowerDeadzone(settings.lowerDeadzone)),
  };
}

/**
 * Before any key is selected: the Svelte defaults, and the emi-keyboard-controller
 * `AdvancedKeyConfiguration` defaults for the values without a control.
 */
export const INITIAL_BRUSH: PerformanceBrush = Object.freeze({
  settings: DEFAULT_PERFORMANCE_SETTINGS,
  loaded: DEFAULT_PERFORMANCE_SETTINGS,
  source: Object.freeze({
    mode: KeyMode.KeyAnalogNormalMode,
    calibrationMode: CalibrationMode.KeyNoCalibration,
    activation: mmToFraction(DEFAULT_PERFORMANCE_SETTINGS.actuationPoint),
    deactivation: mmToFraction(DEFAULT_PERFORMANCE_SETTINGS.deactivationPoint),
    triggerDistance: mmToFraction(DEFAULT_PERFORMANCE_SETTINGS.sensitivityValue),
    releaseDistance: mmToFraction(DEFAULT_PERFORMANCE_SETTINGS.sensitivityValue),
    triggerSpeed: 0.01,
    releaseSpeed: 0.01,
    upperDeadzone: mmToFraction(DEFAULT_PERFORMANCE_SETTINGS.upperDeadzone),
    lowerDeadzone: bottomMmToLowerDeadzone(DEFAULT_PERFORMANCE_SETTINGS.lowerDeadzone),
    upperBound: 4096,
    lowerBound: 0,
  }),
});

/**
 * `clampValuesToMaxDistance` of the Svelte page, run whenever the travel badge changes: the
 * bottom-out and actuation points stay within the travel, the deactivation point 0.1 mm above the
 * actuation point and the start 0.1 mm above the bottom-out point.
 */
export function clampToMaxTravel(
  settings: PerformanceSettings,
  maxDistance: number
): PerformanceSettings {
  let { lowerDeadzone, actuationPoint, deactivationPoint, upperDeadzone } = settings;
  if (lowerDeadzone > maxDistance) lowerDeadzone = maxDistance;
  if (actuationPoint > maxDistance) actuationPoint = maxDistance;
  if (deactivationPoint > actuationPoint - 0.1) deactivationPoint = actuationPoint - 0.1;
  if (upperDeadzone > lowerDeadzone - 0.1) upperDeadzone = lowerDeadzone - 0.1;
  const unchanged =
    lowerDeadzone === settings.lowerDeadzone &&
    actuationPoint === settings.actuationPoint &&
    deactivationPoint === settings.deactivationPoint &&
    upperDeadzone === settings.upperDeadzone;
  return unchanged
    ? settings
    : { ...settings, lowerDeadzone, actuationPoint, deactivationPoint, upperDeadzone };
}
