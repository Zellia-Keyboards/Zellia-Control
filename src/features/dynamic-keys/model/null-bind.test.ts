import { DynamicKeyMutexMode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import {
  NULL_BIND_BEHAVIORS,
  behaviorToMutexMode,
  mutexModeToBehavior,
  type NullBindBehavior,
} from './null-bind';

describe('null-bind behaviors (D13)', () => {
  it('keeps the Svelte behavior list and translation keys', () => {
    expect(NULL_BIND_BEHAVIORS).toEqual([
      {
        behavior: 0,
        nameKey: 'advancedkey.lastInputBehavior',
        descriptionKey: 'advancedkey.lastInputBehaviorDesc',
      },
      {
        behavior: 1,
        nameKey: 'advancedkey.absolutePriority1Behavior',
        descriptionKey: 'advancedkey.absolutePriority1BehaviorDesc',
      },
      {
        behavior: 2,
        nameKey: 'advancedkey.absolutePriority2Behavior',
        descriptionKey: 'advancedkey.absolutePriority2BehaviorDesc',
      },
      {
        behavior: 3,
        nameKey: 'advancedkey.neutralBehavior',
        descriptionKey: 'advancedkey.neutralBehaviorDesc',
      },
      {
        behavior: 4,
        nameKey: 'advancedkey.distanceBehavior',
        descriptionKey: 'advancedkey.distanceBehaviorDesc',
      },
    ]);
  });

  it('maps each behavior to the libamp DynamicKeyMutexMode it describes', () => {
    expect(NULL_BIND_BEHAVIORS.map(({ behavior }) => behaviorToMutexMode(behavior))).toEqual([
      DynamicKeyMutexMode.DKMutexLastPriority, // last input wins
      DynamicKeyMutexMode.DKMutexKey1Priority, // key 1 always wins
      DynamicKeyMutexMode.DKMutexKey2Priority, // key 2 always wins
      DynamicKeyMutexMode.DKMutexNeutral, // both cancel
      DynamicKeyMutexMode.DKMutexDistancePriority, // deeper key wins
    ]);
    // Firmware enum values (dynamic_key.h): DISTANCE 0, LAST 1, KEY1 2, KEY2 3, NEUTRAL 4.
    expect([0, 1, 2, 3, 4].map(b => behaviorToMutexMode(b as NullBindBehavior))).toEqual([
      1, 2, 3, 4, 0,
    ]);
  });

  it('maps firmware modes back to behaviors', () => {
    for (const { behavior } of NULL_BIND_BEHAVIORS) {
      expect(mutexModeToBehavior(behaviorToMutexMode(behavior))).toBe(behavior);
    }
  });

  it('ignores the high-nibble flag of the mode byte and falls back to "last input" for unknown modes', () => {
    // dynamic_key_m_process uses `mode & 0x0F`; the high nibble enables "both keys when bottomed out".
    expect(mutexModeToBehavior(0x10 | DynamicKeyMutexMode.DKMutexNeutral)).toBe(3);
    expect(mutexModeToBehavior(0x0f)).toBe(0);
  });
});
