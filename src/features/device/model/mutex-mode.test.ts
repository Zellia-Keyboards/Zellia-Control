import { DynamicKeyMutexMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  MUTEX_BOTH_ON_BOTTOM_OUT,
  assertMutexMode,
  mutexMode,
  mutexPriority,
  mutexReportsBothOnBottomOut,
  swapMutexKeyPriority,
  toMutexMode,
} from './mutex-mode';

const { DKMutexDistancePriority, DKMutexLastPriority, DKMutexKey1Priority, DKMutexKey2Priority } =
  DynamicKeyMutexMode;

describe('mutex mode byte', () => {
  it('splits the byte into the priority and the bottom-out flag', () => {
    expect(mutexPriority(0xf1)).toBe(DKMutexLastPriority);
    expect(mutexReportsBothOnBottomOut(0xf1)).toBe(true);
    expect(mutexPriority(DKMutexKey2Priority)).toBe(DKMutexKey2Priority);
    expect(mutexReportsBothOnBottomOut(DKMutexKey2Priority)).toBe(false);
    expect(mutexReportsBothOnBottomOut(0x10)).toBe(true);
  });

  it('builds the byte upstream writes for its "always" switch', () => {
    expect(MUTEX_BOTH_ON_BOTTOM_OUT).toBe(0xf0);
    expect(mutexMode(DKMutexKey1Priority, true)).toBe(0xf2);
    expect(mutexMode(DKMutexKey1Priority, false)).toBe(DKMutexKey1Priority);
  });

  it('reads device bytes without losing the flag bits', () => {
    expect(toMutexMode(0xf1)).toBe(0xf1);
    expect(toMutexMode(0x13)).toBe(0x13);
    expect(toMutexMode(DKMutexKey1Priority)).toBe(DKMutexKey1Priority);
    // Unknown priorities read as distance priority, like other unknown enum values.
    expect(toMutexMode(0x07)).toBe(DKMutexDistancePriority);
    expect(toMutexMode(0xf7)).toBe(0xf0);
  });

  it('swaps key priorities and keeps the flag bits', () => {
    expect(swapMutexKeyPriority(mutexMode(DKMutexKey1Priority, true))).toBe(0xf3);
    expect(swapMutexKeyPriority(DKMutexKey2Priority)).toBe(DKMutexKey1Priority);
    expect(swapMutexKeyPriority(mutexMode(DKMutexLastPriority, true))).toBe(0xf1);
  });

  it('accepts bytes with a known priority only', () => {
    for (const mode of [0, 4, 0xf0, 0xf4, 0x12]) {
      expect(() => {
        assertMutexMode(mode);
      }).not.toThrow();
    }
    expect(() => {
      assertMutexMode(0xf5);
    }).toThrow(new RangeError('Mutex mode 245 has an unknown priority 5'));
    for (const mode of [-1, 256, 1.5]) {
      expect(() => {
        assertMutexMode(mode);
      }).toThrow(new RangeError(`Mutex mode ${mode} is out of range 0..255`));
    }
  });
});
