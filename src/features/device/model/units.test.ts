import { describe, expect, it } from 'vitest';
import {
  TRAVEL_MM,
  bottomMmToLowerDeadzone,
  fractionToMm,
  lowerDeadzoneToBottomMm,
  mmToFraction,
} from './units';

const MM_STEPS = Array.from({ length: 41 }, (_, i) => i / 10); // 0.0 … 4.0 mm

describe('travel units', () => {
  it('uses a 4.0 mm full travel', () => {
    expect(TRAVEL_MM).toBe(4);
  });

  it('converts wire fractions to millimetres and back (mm = fraction × 4.0)', () => {
    expect(fractionToMm(0)).toBe(0);
    expect(fractionToMm(0.375)).toBe(1.5);
    expect(fractionToMm(0.5)).toBe(2);
    expect(fractionToMm(1)).toBe(4);
    expect(mmToFraction(1.5)).toBe(0.375);
    expect(mmToFraction(2)).toBe(0.5);
    expect(mmToFraction(4)).toBe(1);
  });

  it('round-trips every 0.1 mm step', () => {
    for (const mm of MM_STEPS) {
      expect(fractionToMm(mmToFraction(mm))).toBeCloseTo(mm, 12);
      expect(mmToFraction(fractionToMm(mm / TRAVEL_MM))).toBeCloseTo(mm / TRAVEL_MM, 12);
    }
  });
});

describe('lower deadzone (D12)', () => {
  it('stores the bottom-out point as (4.0 − bottom) / 4.0, like the Svelte performance page', () => {
    expect(bottomMmToLowerDeadzone(4)).toBe(0);
    expect(bottomMmToLowerDeadzone(3.5)).toBe(0.125);
    expect(bottomMmToLowerDeadzone(3.2)).toBeCloseTo(0.2, 12); // controller default
    expect(bottomMmToLowerDeadzone(3)).toBe(0.25);
    expect(bottomMmToLowerDeadzone(2)).toBe(0.5);
    expect(bottomMmToLowerDeadzone(1)).toBe(0.75);
    expect(bottomMmToLowerDeadzone(0)).toBe(1);
  });

  it('loads it inversely (the Svelte page loaded fraction × 4 and showed 0.5 mm for a 3.5 mm bottom-out)', () => {
    expect(lowerDeadzoneToBottomMm(0.125)).toBe(3.5);
    expect(lowerDeadzoneToBottomMm(0)).toBe(4);
    expect(lowerDeadzoneToBottomMm(1)).toBe(0);
    expect(lowerDeadzoneToBottomMm(0.2)).toBeCloseTo(3.2, 12); // controller default
    for (const mm of MM_STEPS) {
      expect(lowerDeadzoneToBottomMm(bottomMmToLowerDeadzone(mm))).toBeCloseTo(mm, 12);
    }
  });
});
