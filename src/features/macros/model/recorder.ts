/**
 * Recording a macro from this computer: key and mouse-button events become virtual actions with
 * key ID 0, as upstream records them, timed from the moment recording started and continuing
 * after the slot's latest action. Each press keeps room for its release, and stopping releases
 * the keys still held, so playback never leaves a key held. Pure: the page resolves each event's
 * keycode (`hidKeycodeOf`, `mouseButtonKeycodeOf`) and passes `performance.now()`.
 */
import type { Keycode, MacroAction, MacroEvent } from '../../device/model/types';
import { hasRoom, lastTicks } from './actions';
import { msToTicks } from './timing';

export interface Recording {
  /** `performance.now()` when recording started. */
  readonly startedAt: number;
  /** The slot's latest action time when recording started: recorded times continue from it. */
  readonly baseTicks: number;
  readonly pollingRate: number;
  /** The most actions the slot holds. */
  readonly limit: number;
  /** Keys and buttons pressed and not released yet. */
  readonly held: readonly Keycode[];
  /** Presses of keys without a HID keycode, which were not recorded. */
  readonly skipped: number;
  /** Recording ended because the slot is full. */
  readonly full: boolean;
}

export interface RecordedPress {
  /** The keycode of the key or mouse button; null for a key without one (skipped and counted). */
  readonly keycode: Keycode | null;
  /** An auto-repeated keydown (`KeyboardEvent.repeat`). */
  readonly repeat: boolean;
  /** `performance.now()` of the event. */
  readonly now: number;
}

export interface RecordedRelease {
  readonly keycode: Keycode | null;
  /** `performance.now()` of the event. */
  readonly now: number;
}

/** A recording and the slot's actions after an event; `actions` is unchanged when nothing was recorded. */
export interface RecordingStep {
  readonly recording: Recording;
  readonly actions: readonly MacroAction[];
}

export function startRecording(
  actions: readonly MacroAction[],
  now: number,
  pollingRate: number,
  limit: number
): Recording {
  return {
    startedAt: now,
    baseTicks: lastTicks(actions),
    pollingRate,
    limit,
    held: [],
    skipped: 0,
    full: false,
  };
}

function recordedAction(
  recording: Recording,
  keycode: Keycode,
  event: MacroEvent,
  now: number
): MacroAction {
  return {
    delay: recording.baseTicks + msToTicks(now - recording.startedAt, recording.pollingRate),
    keycode,
    event,
    isVirtual: true,
    keyId: 0,
  };
}

/** Releases the keys still held. */
export function stopRecording(
  recording: Recording,
  actions: readonly MacroAction[],
  now: number
): RecordingStep {
  if (recording.held.length === 0) return { recording, actions };
  return {
    recording: { ...recording, held: [] },
    actions: [
      ...actions,
      ...recording.held.map(keycode => recordedAction(recording, keycode, 'up', now)),
    ],
  };
}

/** A press: recorded unless it repeats a held key; when the slot is full, recording ends. */
export function recordPress(
  recording: Recording,
  actions: readonly MacroAction[],
  press: RecordedPress
): RecordingStep {
  if (press.repeat || recording.full) return { recording, actions };
  const { keycode } = press;
  if (keycode === null) {
    return { recording: { ...recording, skipped: recording.skipped + 1 }, actions };
  }
  if (recording.held.includes(keycode)) return { recording, actions };
  // Room for this press and its release, and for the releases of the keys still held.
  if (!hasRoom(actions, recording.held.length + 2, recording.limit)) {
    const stopped = stopRecording(recording, actions, press.now);
    return { recording: { ...stopped.recording, full: true }, actions: stopped.actions };
  }
  return {
    recording: { ...recording, held: [...recording.held, keycode] },
    actions: [...actions, recordedAction(recording, keycode, 'down', press.now)],
  };
}

/** A release of a held key or button. */
export function recordRelease(
  recording: Recording,
  actions: readonly MacroAction[],
  release: RecordedRelease
): RecordingStep {
  const { keycode } = release;
  if (recording.full || keycode === null || !recording.held.includes(keycode)) {
    return { recording, actions };
  }
  return {
    recording: { ...recording, held: recording.held.filter(held => held !== keycode) },
    actions: [...actions, recordedAction(recording, keycode, 'up', release.now)],
  };
}
