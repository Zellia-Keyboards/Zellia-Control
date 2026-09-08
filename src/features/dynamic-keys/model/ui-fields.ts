/**
 * Editor fields the firmware does not store (spec D5). They live in session memory keyed by the
 * dynamic key's target (a mutex's first target), not by slot: freeing a slot moves the dynamic
 * keys above it down, but their keys stay. Absent fields fall back to the editor defaults.
 */

/** Tap-hold: the hold delay is shown and remembered, the firmware only has the tap timeout. */
export interface TapHoldFields {
  readonly holdDelayMs: number;
}

export type ToggleTrigger = 'press' | 'release';

export interface ToggleFields {
  readonly trigger: ToggleTrigger;
  readonly state: boolean;
}

/**
 * Null bind: the bottom-out point and the performance tab's values (the Svelte `null-bind`
 * configuration object). Whether bottom-out is on is the mutex mode's flag on the device.
 */
export interface NullBindFields {
  readonly bottomOutMm: number;
  readonly actuationMm: number;
  readonly rtDown: number;
  readonly rtUp: number;
  readonly continuous: boolean;
  /** Written by the performance tab once the pair is configured. */
  readonly deactivationMm?: number;
  readonly upperDeadzoneMm?: number;
  readonly lowerDeadzoneMm?: number;
}
