import { Keycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import type { MacroAction } from '../../device/model/types';
import {
  recordPress,
  recordRelease,
  startRecording,
  stopRecording,
  type RecordingStep,
} from './recorder';

const RATE = 8000;
const LIMIT = 127;
/** libamp's modifier-only keycode of Left Shift and the Mouse keycode of the left button. */
const LEFT_SHIFT = 0x0200;
const MOUSE_LEFT = 0x00a5;

const recorded = (delay: number, keycode: number, event: 'down' | 'up'): MacroAction => ({
  delay,
  keycode,
  event,
  isVirtual: true,
  keyId: 0,
});

function down(
  step: RecordingStep,
  keycode: number | null,
  now: number,
  repeat = false
): RecordingStep {
  return recordPress(step.recording, step.actions, { keycode, now, repeat });
}

function up(step: RecordingStep, keycode: number | null, now: number): RecordingStep {
  return recordRelease(step.recording, step.actions, { keycode, now });
}

function start(actions: readonly MacroAction[] = [], limit = LIMIT): RecordingStep {
  return { recording: startRecording(actions, 1000, RATE, limit), actions };
}

describe('macro recorder', () => {
  it('records presses and releases as virtual actions timed from the start', () => {
    let step = start();
    step = down(step, Keycode.A, 1100);
    step = up(step, Keycode.A, 1180);
    expect(step.actions).toEqual([
      recorded(800, Keycode.A, 'down'),
      recorded(1440, Keycode.A, 'up'),
    ]);
    expect(step.recording.held).toEqual([]);
  });

  it('records mouse buttons like keys', () => {
    let step = down(start(), MOUSE_LEFT, 1100);
    step = up(step, MOUSE_LEFT, 1150);
    expect(step.actions).toEqual([
      recorded(800, MOUSE_LEFT, 'down'),
      recorded(1200, MOUSE_LEFT, 'up'),
    ]);
  });

  it('continues after the latest action of the slot', () => {
    const existing = [recorded(4000, Keycode.B, 'down')];
    const step = down(start(existing), Keycode.A, 1100);
    expect(step.actions.at(-1)).toEqual(recorded(4800, Keycode.A, 'down'));
  });

  it('ignores repeated keydowns and second presses of a held key', () => {
    let step = down(start(), Keycode.A, 1100);
    const held = step;
    step = down(step, Keycode.A, 1150, true);
    step = down(step, Keycode.A, 1160);
    expect(step.actions).toBe(held.actions);
  });

  it('skips and counts presses of keys without a keycode', () => {
    let step = down(start(), null, 1100);
    step = down(step, null, 1110);
    step = down(step, null, 1120, true);
    expect(step.actions).toEqual([]);
    expect(step.recording.skipped).toBe(2);
    expect(up(step, null, 1130).actions).toBe(step.actions);
  });

  it('ignores releases of keys it did not see pressed', () => {
    const before = start();
    expect(up(before, Keycode.A, 1100).actions).toBe(before.actions);
  });

  it('stops when the slot is full, releasing the keys still held', () => {
    let step = start([], 4);
    step = down(step, Keycode.A, 1100);
    step = down(step, Keycode.B, 1200);
    step = down(step, Keycode.C, 1300);
    expect(step.recording.full).toBe(true);
    expect(step.actions).toEqual([
      recorded(800, Keycode.A, 'down'),
      recorded(1600, Keycode.B, 'down'),
      recorded(2400, Keycode.A, 'up'),
      recorded(2400, Keycode.B, 'up'),
    ]);
    expect(down(step, Keycode.D, 1400).actions).toBe(step.actions);
  });

  it('releases the held keys when it stops', () => {
    const step = down(start(), LEFT_SHIFT, 1100);
    const stopped = stopRecording(step.recording, step.actions, 1250);
    expect(stopped.actions.at(-1)).toEqual(recorded(2000, LEFT_SHIFT, 'up'));
    expect(stopped.recording.held).toEqual([]);
    const idle = start();
    expect(stopRecording(idle.recording, idle.actions, 1300).actions).toBe(idle.actions);
  });
});
