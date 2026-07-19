/**
 * Null-bind (SOCD) behaviors of the Null Bind editor and the firmware `DynamicKeyMutexMode` each
 * one selects (libamp `dynamic_key.h`). The Svelte app sent the behavior index as the mode, which
 * picked the wrong firmware behavior for all five (spec D13).
 */
import { DynamicKeyMutexMode } from 'emi-keyboard-controller';

export type NullBindBehavior = 0 | 1 | 2 | 3 | 4;

export interface NullBindBehaviorOption {
  readonly behavior: NullBindBehavior;
  readonly nameKey: string;
  readonly descriptionKey: string;
}

/** In the editor's order; name/description are translation keys. */
export const NULL_BIND_BEHAVIORS = [
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
] as const satisfies readonly NullBindBehaviorOption[];

const MODE_BY_BEHAVIOR: Readonly<Record<NullBindBehavior, DynamicKeyMutexMode>> = {
  0: DynamicKeyMutexMode.DKMutexLastPriority,
  1: DynamicKeyMutexMode.DKMutexKey1Priority,
  2: DynamicKeyMutexMode.DKMutexKey2Priority,
  3: DynamicKeyMutexMode.DKMutexNeutral,
  4: DynamicKeyMutexMode.DKMutexDistancePriority,
};

const BEHAVIOR_BY_MODE: Readonly<Partial<Record<number, NullBindBehavior>>> = {
  [DynamicKeyMutexMode.DKMutexLastPriority]: 0,
  [DynamicKeyMutexMode.DKMutexKey1Priority]: 1,
  [DynamicKeyMutexMode.DKMutexKey2Priority]: 2,
  [DynamicKeyMutexMode.DKMutexNeutral]: 3,
  [DynamicKeyMutexMode.DKMutexDistancePriority]: 4,
};

export function behaviorToMutexMode(behavior: NullBindBehavior): DynamicKeyMutexMode {
  return MODE_BY_BEHAVIOR[behavior];
}

/**
 * Behavior shown for a device mutex mode byte. Only the low nibble selects the mode (the firmware
 * uses the high nibble as a flag); unknown modes show the editor default, "last input".
 */
export function mutexModeToBehavior(mode: number): NullBindBehavior {
  return BEHAVIOR_BY_MODE[mode & 0x0f] ?? 0;
}
