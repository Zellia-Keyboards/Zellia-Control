import { RGBMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { RgbKeyConfig } from '../../device/model/types';
import { MIXED, editKeys, lightingTargets, recolorKeys, sharedKeyValues } from './key-edits';

const red = { red: 255, green: 0, blue: 0 };
const blue = { red: 0, green: 0, blue: 255 };
const green = { red: 0, green: 255, blue: 0 };

const STATIC_RED: RgbKeyConfig = { mode: RGBMode.RgbModeStatic, color: red, speed: 20 };
const LINEAR_RED: RgbKeyConfig = { mode: RGBMode.RgbModeLinear, color: red, speed: 20 };
const LINEAR_BLUE: RgbKeyConfig = { mode: RGBMode.RgbModeLinear, color: blue, speed: 30 };
const KEYS: readonly RgbKeyConfig[] = [STATIC_RED, LINEAR_RED, LINEAR_BLUE];

describe('lightingTargets', () => {
  it('is every key while none is selected', () => {
    expect(lightingTargets([], 3)).toEqual([0, 1, 2]);
  });

  it('is the selected keys the keyboard has lighting for, in selection order', () => {
    expect(lightingTargets([2, 0, 7], 3)).toEqual([2, 0]);
  });

  it('is empty when only keys without lighting are selected', () => {
    expect(lightingTargets([5], 3)).toEqual([]);
  });
});

describe('sharedKeyValues', () => {
  it('shows the values the targets share', () => {
    expect(sharedKeyValues(KEYS, [1])).toEqual({
      mode: RGBMode.RgbModeLinear,
      color: red,
      speed: 20,
      first: LINEAR_RED,
    });
  });

  it('marks each field that differs as mixed and keeps the first target', () => {
    expect(sharedKeyValues(KEYS, [0, 1])).toEqual({
      mode: MIXED,
      color: red,
      speed: 20,
      first: STATIC_RED,
    });
    expect(sharedKeyValues(KEYS, [1, 2])).toEqual({
      mode: RGBMode.RgbModeLinear,
      color: MIXED,
      speed: MIXED,
      first: LINEAR_RED,
    });
  });

  it('is null without targets', () => {
    expect(sharedKeyValues(KEYS, [])).toBeNull();
    expect(sharedKeyValues(KEYS, [9])).toBeNull();
  });
});

describe('editKeys', () => {
  it('changes only the edited field of every target', () => {
    expect(editKeys(KEYS, [0, 2], { mode: RGBMode.RgbModeTrigger })).toEqual([
      { keyId: 0, config: { mode: RGBMode.RgbModeTrigger, color: red, speed: 20 } },
      { keyId: 2, config: { mode: RGBMode.RgbModeTrigger, color: blue, speed: 30 } },
    ]);
  });

  it('skips keys without lighting', () => {
    expect(editKeys(KEYS, [9], { speed: 1 })).toEqual([]);
  });
});

describe('recolorKeys', () => {
  it('gives each key its colour and keeps its mode and speed', () => {
    expect(
      recolorKeys(
        KEYS,
        new Map([
          [2, green],
          [9, green],
        ])
      )
    ).toEqual([{ keyId: 2, config: { mode: RGBMode.RgbModeLinear, color: green, speed: 30 } }]);
  });
});
