/**
 * libamp's mutex `mode` byte (`dynamic_key_m_process()` in dynamic_key.c):
 *
 * - the low nibble is the priority (`DynamicKeyMutexMode`);
 * - any bit of the high nibble also reports both keys while both are past their lower deadzone,
 *   i.e. bottomed out. Upstream's configurator writes 0xF0 for its "always" switch, and the
 *   Svelte app's null-bind "Alternative Bottom Out Behavior" describes the same behaviour.
 *
 * Snapshots and drafts carry the whole byte in `mode`, as the controller's `DynamicKeyMutex.mode`
 * does, so no flag is lost between loading and saving. Read it with `mutexPriority()` and
 * `mutexReportsBothOnBottomOut()`, and build it with `mutexMode()`.
 */
import { DynamicKeyMutexMode } from 'emi-keyboard-controller';
import type { MutexModeByte } from './types';
import { assertUint } from './validation';

const PRIORITY_BITS = 0x0f;
const FLAG_BITS = 0xf0;

/** The flag bits upstream's configurator writes to report both keys when both are bottomed out. */
export const MUTEX_BOTH_ON_BOTTOM_OUT = 0xf0;

const PRIORITIES: readonly DynamicKeyMutexMode[] = [
  DynamicKeyMutexMode.DKMutexDistancePriority,
  DynamicKeyMutexMode.DKMutexLastPriority,
  DynamicKeyMutexMode.DKMutexKey1Priority,
  DynamicKeyMutexMode.DKMutexKey2Priority,
  DynamicKeyMutexMode.DKMutexNeutral,
];

function withFlags(priority: DynamicKeyMutexMode, flags: number): MutexModeByte {
  return priority | (flags & FLAG_BITS);
}

/** The member of `members` equal to `value` (compared as numbers). */
function memberOf<E extends number>(members: readonly E[], value: number): E | undefined {
  return members.find(member => member === value);
}

/** The priority of a mode byte; unknown priorities read as distance priority. */
export function mutexPriority(mode: number): DynamicKeyMutexMode {
  return memberOf(PRIORITIES, mode & PRIORITY_BITS) ?? DynamicKeyMutexMode.DKMutexDistancePriority;
}

/** Whether a mode byte also reports both keys while both are bottomed out. */
export function mutexReportsBothOnBottomOut(mode: number): boolean {
  return (mode & FLAG_BITS) !== 0;
}

/** The mode byte for `priority`, with or without the bottom-out flag. */
export function mutexMode(priority: DynamicKeyMutexMode, bothOnBottomOut: boolean): MutexModeByte {
  return withFlags(mutexPriority(priority), bothOnBottomOut ? MUTEX_BOTH_ON_BOTTOM_OUT : 0);
}

/** A mode byte read from the device: its priority (unknown ones as distance), flag bits as they are. */
export function toMutexMode(byte: number): MutexModeByte {
  return withFlags(mutexPriority(byte), byte);
}

/** Swaps key-1 and key-2 priority (for a mutex whose keys are stored the other way round). */
export function swapMutexKeyPriority(mode: MutexModeByte): MutexModeByte {
  const priority = mutexPriority(mode);
  const swapped =
    priority === DynamicKeyMutexMode.DKMutexKey1Priority
      ? DynamicKeyMutexMode.DKMutexKey2Priority
      : priority === DynamicKeyMutexMode.DKMutexKey2Priority
        ? DynamicKeyMutexMode.DKMutexKey1Priority
        : priority;
  return withFlags(swapped, mode);
}

/** Throws a RangeError unless `mode` is a byte with a known priority. */
export function assertMutexMode(mode: number): void {
  assertUint(mode, 0xff, 'Mutex mode');
  const bits = mode & PRIORITY_BITS;
  if (memberOf(PRIORITIES, bits) === undefined) {
    throw new RangeError(`Mutex mode ${mode} has an unknown priority ${bits}`);
  }
}
