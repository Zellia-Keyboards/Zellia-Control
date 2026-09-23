import { CalibrationMode, KeyMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { fractionToRaw, rawToFraction } from '../../../testing/virtual-keyboard';
import type { AdvancedKeyConfig } from '../../device';
import {
  DEFAULT_PERFORMANCE_SETTINGS,
  INITIAL_BRUSH,
  brushConfig,
  brushFromKey,
  clampToMaxTravel,
  withSettings,
  type PerformanceSettings,
} from './settings';

/** A fraction of travel as the keyboard reports it (quantized to the wire's u16). */
function wire(fraction: number): number {
  return rawToFraction(fractionToRaw(fraction));
}

const KEY: AdvancedKeyConfig = {
  mode: KeyMode.KeyAnalogRapidMode,
  calibrationMode: CalibrationMode.KeyAutoCalibrationUndefined,
  activation: 0.625,
  deactivation: 0.55,
  triggerDistance: 0.05,
  releaseDistance: 0.1,
  triggerSpeed: 0.02,
  releaseSpeed: 0.03,
  upperDeadzone: 0.075,
  lowerDeadzone: 0.15,
  upperBound: 2600,
  lowerBound: 140,
};

/** The Starlight's default key as read back from the keyboard. */
const DEFAULT_KEY: AdvancedKeyConfig = {
  mode: KeyMode.KeyAnalogNormalMode,
  calibrationMode: CalibrationMode.KeyAutoCalibrationUndefined,
  activation: wire(0.5),
  deactivation: wire(0.49),
  triggerDistance: wire(0.08),
  releaseDistance: wire(0.08),
  triggerSpeed: wire(0.01),
  releaseSpeed: wire(0.01),
  upperDeadzone: 0,
  lowerDeadzone: wire(0.2),
  upperBound: 2600,
  lowerBound: 140,
};

function edited(key: AdvancedKeyConfig, patch: Partial<PerformanceSettings>): AdvancedKeyConfig {
  const brush = brushFromKey(key);
  return brushConfig(withSettings(brush, { ...brush.settings, ...patch }));
}

describe('brushFromKey (D12)', () => {
  it('loads every value of the key, in millimetres of the 4.0 mm travel', () => {
    expect(brushFromKey(KEY).settings).toEqual({
      rapidTriggerEnabled: true,
      actuationPoint: 2.5,
      deactivationPoint: 2.2,
      sensitivityValue: 0.2,
      separateSensitivity: true,
      pressSensitivity: 0.2,
      releaseSensitivity: 0.4,
      upperDeadzone: 0.3,
      // Stored as the travel below the bottom-out point: (4.0 − 3.4) / 4.0 = 0.15.
      lowerDeadzone: 3.4,
    } satisfies PerformanceSettings);
  });

  it('shows the quantized device values rounded to thousandths of a millimetre', () => {
    expect(brushFromKey(DEFAULT_KEY).settings).toEqual({
      rapidTriggerEnabled: false,
      actuationPoint: 2,
      deactivationPoint: 1.96,
      sensitivityValue: 0.32,
      separateSensitivity: false,
      pressSensitivity: 0.32,
      releaseSensitivity: 0.32,
      upperDeadzone: 0,
      lowerDeadzone: 3.2,
    } satisfies PerformanceSettings);
  });

  it('enables rapid trigger only for keys in rapid mode', () => {
    for (const mode of [
      KeyMode.KeyDigitalMode,
      KeyMode.KeyAnalogNormalMode,
      KeyMode.KeyAnalogSpeedMode,
    ]) {
      expect(brushFromKey({ ...KEY, mode }).settings.rapidTriggerEnabled).toBe(false);
    }
    expect(brushFromKey(KEY).settings.rapidTriggerEnabled).toBe(true);
  });
});

describe('brushConfig', () => {
  it('writes an untouched key back exactly as it was loaded, so selecting it changes nothing', () => {
    const keys = [
      KEY,
      DEFAULT_KEY,
      // Raw values that do not survive a round trip through rounded millimetres.
      {
        ...KEY,
        mode: KeyMode.KeyDigitalMode,
        activation: rawToFraction(12_345),
        deactivation: rawToFraction(101),
        triggerDistance: rawToFraction(777),
        releaseDistance: rawToFraction(778),
        upperDeadzone: rawToFraction(3),
        lowerDeadzone: rawToFraction(13_107),
      },
    ];
    for (const key of keys) expect(brushConfig(brushFromKey(key))).toEqual(key);
  });

  it('converts edited values symmetrically: fraction = mm / 4.0', () => {
    expect(edited(DEFAULT_KEY, { actuationPoint: 3, deactivationPoint: 2.5 })).toMatchObject({
      activation: 0.75,
      deactivation: 0.625,
    });
    expect(edited(KEY, { upperDeadzone: 0.5, lowerDeadzone: 3.5 })).toMatchObject({
      upperDeadzone: 0.125,
      lowerDeadzone: 0.125,
    });
  });

  it('writes the combined sensitivity to both distances unless they are separate', () => {
    expect(
      edited(KEY, { separateSensitivity: false, sensitivityValue: 1, pressSensitivity: 0.6 })
    ).toMatchObject({ triggerDistance: 0.25, releaseDistance: 0.25 });
    expect(
      edited(DEFAULT_KEY, {
        separateSensitivity: true,
        pressSensitivity: 0.4,
        releaseSensitivity: 0.8,
      })
    ).toMatchObject({ triggerDistance: 0.1, releaseDistance: 0.2 });
  });

  it('uses the exact loaded distance when the other sensitivity is copied', () => {
    // Joining separate distances keeps the loaded press distance for both.
    expect(edited(KEY, { separateSensitivity: false })).toMatchObject({
      triggerDistance: KEY.triggerDistance,
      releaseDistance: KEY.triggerDistance,
    });
    const quantized = { ...KEY, triggerDistance: wire(0.05), releaseDistance: wire(0.1) };
    expect(edited(quantized, { releaseSensitivity: 0.2 })).toMatchObject({
      triggerDistance: quantized.triggerDistance,
      releaseDistance: quantized.triggerDistance,
    });
  });

  it('maps the rapid trigger switch to the key mode', () => {
    expect(edited(DEFAULT_KEY, { rapidTriggerEnabled: true }).mode).toBe(
      KeyMode.KeyAnalogRapidMode
    );
    expect(edited(KEY, { rapidTriggerEnabled: false }).mode).toBe(KeyMode.KeyAnalogNormalMode);
    expect(edited(KEY, { actuationPoint: 1 }).mode).toBe(KeyMode.KeyAnalogRapidMode);
    expect(edited(DEFAULT_KEY, { actuationPoint: 1 }).mode).toBe(KeyMode.KeyAnalogNormalMode);
  });

  it('writes the switch’s mode over other modes once a setting changes, as Svelte did', () => {
    for (const mode of [KeyMode.KeyDigitalMode, KeyMode.KeyAnalogSpeedMode]) {
      const key = { ...DEFAULT_KEY, mode };
      expect(edited(key, { actuationPoint: 1 }).mode).toBe(KeyMode.KeyAnalogNormalMode);
      expect(edited(key, { upperDeadzone: 0.2 }).mode).toBe(KeyMode.KeyAnalogNormalMode);
      expect(edited(key, { rapidTriggerEnabled: true }).mode).toBe(KeyMode.KeyAnalogRapidMode);
    }
  });

  it('copies the loaded key exactly, mode included, while no setting differs from it', () => {
    const digital = { ...DEFAULT_KEY, mode: KeyMode.KeyDigitalMode };
    const brush = brushFromKey(digital);
    expect(brushConfig(brush)).toEqual(digital);
    // Changed and changed back: the loaded key again.
    const on = withSettings(brush, { ...brush.settings, rapidTriggerEnabled: true });
    const off = withSettings(on, { ...on.settings, rapidTriggerEnabled: false });
    expect(brushConfig(off)).toEqual(digital);
  });

  it('keeps the values without a control (speeds, calibration, sensor bounds)', () => {
    expect(edited(KEY, { actuationPoint: 1 })).toMatchObject({
      triggerSpeed: 0.02,
      releaseSpeed: 0.03,
      calibrationMode: CalibrationMode.KeyAutoCalibrationUndefined,
      upperBound: 2600,
      lowerBound: 140,
    });
  });

  it('clamps converted values to the travel (0..1)', () => {
    expect(edited(KEY, { deactivationPoint: -0.095, lowerDeadzone: 4.5 })).toMatchObject({
      deactivation: 0,
      lowerDeadzone: 0,
    });
    expect(edited(KEY, { actuationPoint: 4.2, upperDeadzone: Number.NaN })).toMatchObject({
      activation: 1,
      upperDeadzone: 0,
    });
  });
});

describe('INITIAL_BRUSH', () => {
  it('starts from the Svelte page defaults', () => {
    expect(INITIAL_BRUSH.settings).toEqual(DEFAULT_PERFORMANCE_SETTINGS);
    expect(DEFAULT_PERFORMANCE_SETTINGS).toEqual({
      rapidTriggerEnabled: false,
      actuationPoint: 2.0,
      deactivationPoint: 1.5,
      sensitivityValue: 0.5,
      separateSensitivity: false,
      pressSensitivity: 0.5,
      releaseSensitivity: 0.5,
      upperDeadzone: 0.5,
      lowerDeadzone: 3.5,
    } satisfies PerformanceSettings);
  });

  it('writes the defaults with the controller defaults for everything else', () => {
    expect(brushConfig(INITIAL_BRUSH)).toEqual({
      mode: KeyMode.KeyAnalogNormalMode,
      calibrationMode: CalibrationMode.KeyNoCalibration,
      activation: 0.5,
      deactivation: 0.375,
      triggerDistance: 0.125,
      releaseDistance: 0.125,
      triggerSpeed: 0.01,
      releaseSpeed: 0.01,
      upperDeadzone: 0.125,
      lowerDeadzone: 0.125,
      upperBound: 4096,
      lowerBound: 0,
    } satisfies AdvancedKeyConfig);
  });
});

describe('clampToMaxTravel', () => {
  it('pulls the bottom and actuation points down to the switch travel', () => {
    expect(
      clampToMaxTravel(
        { ...DEFAULT_PERFORMANCE_SETTINGS, actuationPoint: 3.5, lowerDeadzone: 3.8 },
        3
      )
    ).toMatchObject({ actuationPoint: 3, lowerDeadzone: 3 });
  });

  it('keeps 0.1 mm between deactivation and actuation, and between start and bottom', () => {
    expect(
      clampToMaxTravel(
        {
          ...DEFAULT_PERFORMANCE_SETTINGS,
          actuationPoint: 2,
          deactivationPoint: 1.96,
          upperDeadzone: 3.15,
          lowerDeadzone: 3.2,
        },
        4
      )
    ).toMatchObject({
      actuationPoint: 2,
      deactivationPoint: 2 - 0.1,
      upperDeadzone: 3.2 - 0.1,
      lowerDeadzone: 3.2,
    });
    // After pulling the actuation point down, the deactivation point follows it.
    expect(
      clampToMaxTravel({ ...DEFAULT_PERFORMANCE_SETTINGS, actuationPoint: 3.9 }, 1)
    ).toMatchObject({ actuationPoint: 1, deactivationPoint: 1 - 0.1 });
  });

  it('returns the same settings when nothing needs clamping', () => {
    expect(clampToMaxTravel(DEFAULT_PERFORMANCE_SETTINGS, 4)).toBe(DEFAULT_PERFORMANCE_SETTINGS);
  });
});
