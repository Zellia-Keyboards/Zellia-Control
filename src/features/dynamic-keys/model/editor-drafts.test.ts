import { DynamicKeyMutexMode, Keycode as EmiKeycode } from 'emi-keyboard-controller';
import { describe, expect, it } from 'vitest';
import { mutexMode } from '../../device/model/mutex-mode';
import type { KeyLocation } from '../../device';
import { kc } from '../../keycodes';
import type { DynamicKeyOf } from './configured-keys';
import { DKS_EMPTY_EDITOR, TAP_HOLD_DEFAULTS, TOGGLE_DEFAULT_BINDING } from './defaults';
import { DksAction } from './dks-bitmap';
import { encodeKeyControl } from './dks-codec';
import {
  NULL_BIND_DRAFT,
  NULL_BIND_PERFORMANCE_DEFAULTS,
  TAP_HOLD_DRAFT,
  TOGGLE_DRAFT,
  loadDksEditor,
  loadNullBindDraft,
  loadNullBindPerformance,
  loadTapHoldDraft,
  loadToggleDraft,
  modTapDraft,
  mutexDraft,
  strokeDraft,
  toggleDraft,
  withBottomOut,
} from './editor-drafts';
import { UNKNOWN_KEY_NAME, keyIndexName } from './key-names';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;
const at = (layer: number, id: number): KeyLocation => ({ layer, id });
const A = kc.key(EmiKeycode.A);
const B = kc.key(EmiKeycode.B);

const modTap = (tap: number, hold: number, durationMs: number): DynamicKeyOf<'modTap'> => ({
  kind: 'modTap',
  tap,
  hold,
  durationMs,
  target: at(0, 1),
});

describe('key names (as the Svelte editors showed them)', () => {
  it('names keys by index in tap-hold and toggle, and Unknown elsewhere', () => {
    expect(keyIndexName(12)).toBe('Key 12');
    expect(UNKNOWN_KEY_NAME).toBe('Unknown');
  });
});

describe('tap-hold draft', () => {
  it('starts with Esc / Left Ctrl, 200 ms hold delay and 150 ms tap timeout (D15)', () => {
    expect(TAP_HOLD_DRAFT).toEqual({
      tap: TAP_HOLD_DEFAULTS.tap,
      hold: TAP_HOLD_DEFAULTS.hold,
      holdDelayMs: 200,
      tapTimeoutMs: 150,
    });
  });

  it("loads a key's mod-tap from the device and its hold delay from session memory", () => {
    expect(loadTapHoldDraft(modTap(A, B, 300), { holdDelayMs: 450 }, TAP_HOLD_DRAFT)).toEqual({
      tap: A,
      hold: B,
      holdDelayMs: 450,
      tapTimeoutMs: 300,
    });
    expect(loadTapHoldDraft(modTap(A, B, 300), undefined, TAP_HOLD_DRAFT).holdDelayMs).toBe(200);
  });

  it('falls back to the defaults for empty values, like the Svelte `||`', () => {
    expect(loadTapHoldDraft(modTap(0, 0, 0), { holdDelayMs: 0 }, TAP_HOLD_DRAFT)).toEqual(
      TAP_HOLD_DRAFT
    );
  });

  it('keeps the editor values for a key without a mod-tap', () => {
    const edited = { ...TAP_HOLD_DRAFT, tap: B };
    expect(loadTapHoldDraft(null, undefined, edited)).toBe(edited);
  });

  it('builds the mod-tap draft: the tap timeout is the firmware duration', () => {
    expect(modTapDraft(at(1, 5), { tap: A, hold: B, holdDelayMs: 600, tapTimeoutMs: 175 })).toEqual(
      { kind: 'modTap', target: at(1, 5), tap: A, hold: B, durationMs: 175 }
    );
  });
});

describe('toggle draft', () => {
  const toggle = (binding: number): DynamicKeyOf<'toggle'> => ({
    kind: 'toggle',
    binding,
    target: at(0, 3),
  });

  it('starts with Caps Lock, on press, inactive', () => {
    expect(TOGGLE_DRAFT).toEqual({
      binding: TOGGLE_DEFAULT_BINDING,
      trigger: 'press',
      state: false,
    });
  });

  it('loads the binding from the device and trigger/state from session memory', () => {
    expect(loadToggleDraft(toggle(A), { trigger: 'release', state: true })).toEqual({
      binding: A,
      trigger: 'release',
      state: true,
    });
    expect(loadToggleDraft(toggle(A), undefined)).toEqual({ ...TOGGLE_DRAFT, binding: A });
    expect(loadToggleDraft(toggle(0), undefined)).toEqual(TOGGLE_DRAFT);
  });

  it('resets to the defaults for a key without a toggle', () => {
    expect(loadToggleDraft(null, { trigger: 'release', state: true })).toBe(TOGGLE_DRAFT);
  });

  it('builds the toggle draft', () => {
    expect(toggleDraft(at(0, 3), { binding: B, trigger: 'release', state: true })).toEqual({
      kind: 'toggle',
      target: at(0, 3),
      binding: B,
    });
  });
});

describe('DKS editor', () => {
  const stroke: DynamicKeyOf<'stroke'> = {
    kind: 'stroke',
    bindings: [A, 0, B, 0],
    keyControl: [
      encodeKeyControl([P, H, H, R]),
      encodeKeyControl([T, R, R, R]),
      encodeKeyControl([R, R, R, R]),
      encodeKeyControl([P, R, R, R]),
    ],
    // What the device reports for 3.0 mm after u16 quantization.
    distances: {
      pressBegin: 24575 / 65535,
      pressFully: 49151 / 65535,
      releaseBegin: 49151 / 65535,
      releaseFully: 24575 / 65535,
    },
    target: at(0, 2),
  };

  it("loads a key's DKS: unset bindings blank, bitmaps decoded, bottom-out in mm", () => {
    expect(loadDksEditor(stroke)).toEqual({
      bindings: [A, null, B, null],
      bitmaps: [
        [P, H, H, R],
        [T, R, R, R],
        [R, R, R, R],
        [P, R, R, R],
      ],
      bottomOutMm: 3,
    });
  });

  it('shows the empty editor for a key without a DKS', () => {
    expect(loadDksEditor(null)).toBe(DKS_EMPTY_EDITOR);
  });

  it('builds the stroke draft at the 1.5 mm actuation point (D14)', () => {
    const draft = strokeDraft(at(2, 7), loadDksEditor(stroke));
    expect(draft).toEqual({
      kind: 'stroke',
      target: at(2, 7),
      bindings: [A, 0, B, 0],
      keyControl: stroke.keyControl,
      distances: { pressBegin: 0.375, pressFully: 0.75, releaseBegin: 0.75, releaseFully: 0.375 },
    });
  });
});

describe('null-bind draft', () => {
  const mutex = (mode: number): DynamicKeyOf<'mutex'> => ({
    kind: 'mutex',
    bindings: [A, B],
    mode,
    targets: [at(0, 1), at(0, 3)],
  });

  it('starts with last input, bottom-out off, 1.5 mm actuation and no rapid trigger', () => {
    expect(NULL_BIND_DRAFT).toEqual({
      behavior: 0,
      bottomOutMm: 0,
      uiBottomOutMm: 4,
      actuationMm: 1.5,
      rtDown: 0,
      rtUp: 0,
      continuous: false,
    });
  });

  it("loads the behavior and bottom-out switch from the device's mode byte (D13)", () => {
    const neutral = mutex(mutexMode(DynamicKeyMutexMode.DKMutexNeutral, false));
    expect(loadNullBindDraft(neutral, undefined, NULL_BIND_DRAFT)).toEqual({
      ...NULL_BIND_DRAFT,
      behavior: 3,
    });
    const key2 = mutex(mutexMode(DynamicKeyMutexMode.DKMutexKey2Priority, true));
    expect(loadNullBindDraft(key2, undefined, NULL_BIND_DRAFT)).toMatchObject({
      behavior: 2,
      bottomOutMm: 4,
      uiBottomOutMm: 4,
    });
  });

  it('loads the UI-only fields from session memory', () => {
    const flagged = mutex(mutexMode(DynamicKeyMutexMode.DKMutexDistancePriority, true));
    const fields = { bottomOutMm: 3.2, actuationMm: 2, rtDown: 0.3, rtUp: 0.2, continuous: true };
    expect(loadNullBindDraft(flagged, fields, NULL_BIND_DRAFT)).toEqual({
      behavior: 4,
      bottomOutMm: 3.2,
      uiBottomOutMm: 3.2,
      actuationMm: 2,
      rtDown: 0.3,
      rtUp: 0.2,
      continuous: true,
    });
    // The switch follows the device: a remembered distance does not turn it on.
    const plain = mutex(DynamicKeyMutexMode.DKMutexLastPriority);
    expect(loadNullBindDraft(plain, fields, NULL_BIND_DRAFT)).toMatchObject({
      bottomOutMm: 0,
      uiBottomOutMm: 4,
    });
  });

  it('keeps the editor values for keys without a mutex', () => {
    const edited = { ...NULL_BIND_DRAFT, behavior: 3 as const };
    expect(loadNullBindDraft(null, undefined, edited)).toBe(edited);
  });

  it('turns bottom-out on at 4.0 mm and off again', () => {
    const on = withBottomOut(NULL_BIND_DRAFT, true);
    expect(on).toMatchObject({ bottomOutMm: 4, uiBottomOutMm: 4 });
    expect(withBottomOut({ ...on, uiBottomOutMm: 3 }, false)).toMatchObject({
      bottomOutMm: 0,
      uiBottomOutMm: 3,
    });
  });

  it("builds the mutex draft with the behavior's firmware mode and the bottom-out flag", () => {
    const targets = [at(1, 4), at(1, 9)] as const;
    expect(mutexDraft(targets, [A, B], { ...NULL_BIND_DRAFT, behavior: 1 })).toEqual({
      kind: 'mutex',
      targets,
      bindings: [A, B],
      mode: DynamicKeyMutexMode.DKMutexKey1Priority,
    });
    expect(
      mutexDraft(targets, [A, B], { ...NULL_BIND_DRAFT, behavior: 0, bottomOutMm: 3 })
    ).toMatchObject({ mode: mutexMode(DynamicKeyMutexMode.DKMutexLastPriority, true) });
  });
});

describe('null-bind performance tab', () => {
  it('starts from the Svelte defaults', () => {
    expect(NULL_BIND_PERFORMANCE_DEFAULTS).toEqual({
      rtDown: 0,
      actuationMm: 2,
      deactivationMm: 1.5,
      sensitivity: 0.5,
      separateSensitivity: false,
      pressSensitivity: 0.5,
      releaseSensitivity: 0.5,
      upperDeadzoneMm: 0.5,
      lowerDeadzoneMm: 3.5,
    });
    expect(loadNullBindPerformance(undefined)).toEqual(NULL_BIND_PERFORMANCE_DEFAULTS);
  });

  it('loads the remembered values of a configured pair, rapid trigger as the sensitivity', () => {
    expect(
      loadNullBindPerformance({
        bottomOutMm: 0,
        actuationMm: 1.5,
        rtDown: 0.4,
        rtUp: 0.25,
        continuous: false,
        deactivationMm: 1.2,
        upperDeadzoneMm: 0.3,
        lowerDeadzoneMm: 3.1,
      })
    ).toEqual({
      rtDown: 0.4,
      actuationMm: 1.5,
      deactivationMm: 1.2,
      sensitivity: 0.4,
      separateSensitivity: true,
      pressSensitivity: 0.4,
      releaseSensitivity: 0.25,
      upperDeadzoneMm: 0.3,
      lowerDeadzoneMm: 3.1,
    });
  });

  it('keeps zero sensitivities of a pair without rapid trigger (Svelte `??`)', () => {
    const performance = loadNullBindPerformance({
      bottomOutMm: 0,
      actuationMm: 1.5,
      rtDown: 0,
      rtUp: 0,
      continuous: false,
    });
    expect(performance).toMatchObject({
      rtDown: 0,
      actuationMm: 1.5,
      deactivationMm: 1.5,
      sensitivity: 0,
      pressSensitivity: 0,
      releaseSensitivity: 0,
      separateSensitivity: false,
    });
  });
});
