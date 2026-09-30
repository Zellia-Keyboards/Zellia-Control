import { describe, expect, it } from 'vitest';
import { assertFraction, assertUint, clampFraction, isEqual } from './validation';

describe('assertUint', () => {
  it('accepts integers from 0 to the maximum', () => {
    for (const value of [0, 1, 255]) {
      expect(() => {
        assertUint(value, 255, 'Brightness');
      }).not.toThrow();
    }
  });

  it.each([-1, 256, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', value => {
    expect(() => {
      assertUint(value, 255, 'Brightness');
    }).toThrow(new RangeError(`Brightness ${value} is out of range 0..255`));
  });
});

describe('assertFraction', () => {
  it('accepts fractions of travel', () => {
    for (const value of [0, 0.25, 1]) {
      expect(() => {
        assertFraction(value, 'Activation');
      }).not.toThrow();
    }
  });

  it.each([-0.1, 1.01, Number.NaN, Number.NEGATIVE_INFINITY])('rejects %s', value => {
    expect(() => {
      assertFraction(value, 'Activation');
    }).toThrow(new RangeError(`Activation ${value} is not a fraction of travel (0..1)`));
  });
});

describe('clampFraction', () => {
  it('clamps to 0..1 and maps non-finite values to 0', () => {
    expect([-1, 0, 0.4, 1, 2, Number.NaN, Number.POSITIVE_INFINITY].map(clampFraction)).toEqual([
      0, 0, 0.4, 1, 1, 0, 0,
    ]);
  });
});

describe('isEqual', () => {
  it('compares plain values structurally', () => {
    expect(isEqual({ a: [1, { b: null }] }, { a: [1, { b: null }] })).toBe(true);
    expect(isEqual({ kind: 'none' }, { kind: 'none' })).toBe(true);
    expect(isEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqual({ a: undefined }, { b: undefined })).toBe(false);
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqual([1], { 0: 1 })).toBe(false);
    expect(isEqual({ target: null }, { target: { layer: 0, id: 1 } })).toBe(false);
    expect(isEqual(0, '0')).toBe(false);
  });
});
