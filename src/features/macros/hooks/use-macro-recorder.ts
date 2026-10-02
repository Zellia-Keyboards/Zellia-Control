/**
 * Recording a macro slot from this computer's keyboard and mouse buttons (window events while
 * recording), as upstream records them. Every recorded event is staged at once, so the table
 * fills while recording. While recording, keys and mouse buttons do nothing else: their default
 * actions are prevented, and so are clicks, middle clicks and the context menu, except on the
 * Stop button (`data-macro-recorder-stop`), whose clicks are not recorded. Recording ends with
 * Stop, when the macro is full, when the window loses focus (releases would be missed), when the
 * keyboard starts loading a configuration (profile switch, factory reset, reconnect: the session
 * would reject every edit, so nothing is staged and keys still held are dropped, not released —
 * the load replaces the macros anyway) and when the editor unmounts (leaving the page); keys
 * still held are released then.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceSession, deviceStore, type MacroAction } from '../../device';
import { slotActions } from '../commands';
import {
  hidKeycodeOf,
  mouseButtonKeycodeOf,
  recordPress,
  recordRelease,
  startRecording,
  stopRecording,
  type Recording,
  type RecordingStep,
} from '../model';

export interface RecorderState {
  readonly recording: boolean;
  /** Presses of keys without a HID keycode, which were not recorded. */
  readonly skipped: number;
  /** The last recording ended because the macro was full. */
  readonly full: boolean;
}

export interface MacroRecorder extends RecorderState {
  readonly start: () => void;
  readonly stop: () => void;
}

/** What the page shows, for the slot it was recorded in. */
interface Shown extends RecorderState {
  readonly slot: number;
}

const IDLE: RecorderState = { recording: false, skipped: 0, full: false };

/** Events on the Stop button are neither recorded nor suppressed. */
function onStopButton(event: Event): boolean {
  return (
    event.target instanceof Element && event.target.closest('[data-macro-recorder-stop]') !== null
  );
}

/** Keeps a recorded or suppressed event from doing anything else. */
function swallow(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

export function useMacroRecorder(slot: number, pollingRate: number, limit: number): MacroRecorder {
  // The recording in progress, for the window listeners; null while not recording.
  const recording = useRef<Recording | null>(null);
  const [shown, setShown] = useState<Shown>({ ...IDLE, slot });

  /** Stages a step's actions; the recording ends when `ended` or when the macro is full. */
  const apply = useCallback(
    (before: readonly MacroAction[], step: RecordingStep, ended: boolean) => {
      if (step.actions !== before) deviceSession.setMacro(slot, step.actions);
      const done = ended || step.recording.full;
      recording.current = done ? null : step.recording;
      setShown({
        slot,
        recording: !done,
        skipped: step.recording.skipped,
        full: step.recording.full,
      });
    },
    [slot]
  );

  const start = useCallback(() => {
    recording.current = startRecording(slotActions(slot), performance.now(), pollingRate, limit);
    setShown({ slot, recording: true, skipped: 0, full: false });
  }, [slot, pollingRate, limit]);

  const stop = useCallback(() => {
    const current = recording.current;
    if (!current) return;
    const before = slotActions(slot);
    apply(before, stopRecording(current, before, performance.now()), true);
  }, [slot, apply]);

  const active = shown.slot === slot && shown.recording;
  useEffect(() => {
    if (!active) return;
    const record = (
      event: Event,
      step: (current: Recording, before: readonly MacroAction[], now: number) => RecordingStep
    ) => {
      const current = recording.current;
      if (!current) return;
      // A recorded event does nothing else: Space or Enter would press a focused button.
      swallow(event);
      const before = slotActions(slot);
      apply(before, step(current, before, performance.now()), false);
    };
    const onKey = (event: KeyboardEvent) => {
      const keycode = hidKeycodeOf(event.code);
      record(event, (current, before, now) =>
        event.type === 'keydown'
          ? recordPress(current, before, { keycode, repeat: event.repeat, now })
          : recordRelease(current, before, { keycode, now })
      );
    };
    const onMouseButton = (event: MouseEvent) => {
      const keycode = mouseButtonKeycodeOf(event.button);
      // Buttons beyond the fifth are left alone.
      if (keycode === null || onStopButton(event)) return;
      record(event, (current, before, now) =>
        event.type === 'mousedown'
          ? recordPress(current, before, { keycode, repeat: false, now })
          : recordRelease(current, before, { keycode, now })
      );
    };
    // A click would press what is under the pointer, a middle click open a link, a right click
    // the context menu.
    const suppress = (event: MouseEvent) => {
      if (!onStopButton(event)) swallow(event);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('mousedown', onMouseButton, true);
    window.addEventListener('mouseup', onMouseButton, true);
    window.addEventListener('click', suppress, true);
    window.addEventListener('auxclick', suppress, true);
    window.addEventListener('contextmenu', suppress, true);
    window.addEventListener('blur', stop);
    // A device load rejects every edit: end the recording at once, staging nothing, so held keys
    // are dropped rather than released into the draft the load is about to replace anyway.
    const unsubscribe = deviceStore.subscribe(state => {
      const current = recording.current;
      if (!state.reloading || !current) return;
      recording.current = null;
      setShown({ slot, recording: false, skipped: current.skipped, full: current.full });
    });
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('mousedown', onMouseButton, true);
      window.removeEventListener('mouseup', onMouseButton, true);
      window.removeEventListener('click', suppress, true);
      window.removeEventListener('auxclick', suppress, true);
      window.removeEventListener('contextmenu', suppress, true);
      window.removeEventListener('blur', stop);
      unsubscribe();
    };
  }, [active, slot, apply, stop]);

  // Unmounting ends the recording. Keys still held are released where the session takes edits:
  // not while the keyboard loads a configuration, and not once it is gone.
  useEffect(
    () => () => {
      const current = recording.current;
      recording.current = null;
      const { connection, reloading } = deviceStore.getState();
      if (current && current.held.length > 0 && connection.status === 'ready' && !reloading) {
        deviceSession.setMacro(
          slot,
          stopRecording(current, slotActions(slot), performance.now()).actions
        );
      }
    },
    [slot]
  );

  const state = shown.slot === slot ? shown : IDLE;
  return { recording: state.recording, skipped: state.skipped, full: state.full, start, stop };
}
