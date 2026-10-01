import { describe, expect, it } from 'vitest';
import { formatMs, msToTicks, ticksToMs } from './timing';

describe('macro timing', () => {
  it('converts ticks to milliseconds at the polling rate', () => {
    expect(ticksToMs(400, 8000)).toBe(50);
    expect(ticksToMs(1, 8000)).toBe(0.125);
    expect(ticksToMs(50, 1000)).toBe(50);
    // A model without a polling rate ticks at the controller default, 1000 Hz.
    expect(ticksToMs(5, 0)).toBe(5);
  });

  it('rounds milliseconds to the nearest tick, within 0..u32', () => {
    expect(msToTicks(50, 8000)).toBe(400);
    expect(msToTicks(0.1, 8000)).toBe(1);
    expect(msToTicks(20, 1000)).toBe(20);
    expect(msToTicks(-3, 1000)).toBe(0);
    expect(msToTicks(Number.NaN, 1000)).toBe(0);
    expect(msToTicks(1e12, 8000)).toBe(0xffffffff);
  });

  it('shows at most three decimals', () => {
    expect(formatMs(0.125)).toBe('0.125');
    expect(formatMs(50)).toBe('50');
    expect(formatMs(1 / 3)).toBe('0.333');
  });
});
