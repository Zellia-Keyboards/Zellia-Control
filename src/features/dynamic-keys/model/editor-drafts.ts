/**
 * Editor drafts of the four dynamic-key modes: what each editor loads for the selected key(s)
 * from the device snapshot plus session memory (spec D5), and the `DynamicKeyDraft` it applies.
 * Loading follows the Svelte editors' effects: tap-hold and null bind keep their values for keys
 * without a dynamic key of their kind, toggle and DKS reset to their defaults.
 */
import { mutexMode, mutexReportsBothOnBottomOut } from '../../device/model/mutex-mode';
import type { DynamicKeyDraft, KeyLocation, Keycode } from '../../device';
import type { DynamicKeyOf } from './configured-keys';
import {
  DKS_ACTUATION_MM,
  DKS_EMPTY_EDITOR,
  TAP_HOLD_DEFAULTS,
  TOGGLE_DEFAULT_BINDING,
  bottomOutMmOf,
  strokeBindings,
  strokeDistances,
  type DksEditorState,
} from './defaults';
import { decodeKeyControl, encodeKeyControl } from './dks-codec';
import { behaviorToMutexMode, mutexModeToBehavior, type NullBindBehavior } from './null-bind';
import type { NullBindFields, TapHoldFields, ToggleFields, ToggleTrigger } from './ui-fields';

// ---------------------------------------------------------------------------------------------
// Tap-hold

export interface TapHoldDraft {
  readonly tap: Keycode;
  readonly hold: Keycode;
  /** UI-only (D5). */
  readonly holdDelayMs: number;
  /** The mod-tap duration on the device. */
  readonly tapTimeoutMs: number;
}

export const TAP_HOLD_DRAFT: TapHoldDraft = {
  tap: TAP_HOLD_DEFAULTS.tap,
  hold: TAP_HOLD_DEFAULTS.hold,
  holdDelayMs: TAP_HOLD_DEFAULTS.holdDelayMs,
  tapTimeoutMs: TAP_HOLD_DEFAULTS.tapTimeoutMs,
};

/** A key with a mod-tap loads it (empty values fall back, as the Svelte `||` did). */
export function loadTapHoldDraft(
  modTap: DynamicKeyOf<'modTap'> | null,
  fields: TapHoldFields | undefined,
  previous: TapHoldDraft
): TapHoldDraft {
  if (!modTap) return previous;
  return {
    tap: modTap.tap || TAP_HOLD_DEFAULTS.tap,
    hold: modTap.hold || TAP_HOLD_DEFAULTS.hold,
    holdDelayMs: fields?.holdDelayMs || TAP_HOLD_DEFAULTS.holdDelayMs,
    tapTimeoutMs: modTap.durationMs || TAP_HOLD_DEFAULTS.tapTimeoutMs,
  };
}

export function modTapDraft(target: KeyLocation, draft: TapHoldDraft): DynamicKeyDraft {
  return {
    kind: 'modTap',
    target,
    tap: draft.tap,
    hold: draft.hold,
    durationMs: draft.tapTimeoutMs,
  };
}

// ---------------------------------------------------------------------------------------------
// Toggle

export interface ToggleDraft {
  readonly binding: Keycode;
  /** UI-only (D5). */
  readonly trigger: ToggleTrigger;
  /** UI-only (D5). */
  readonly state: boolean;
}

export const TOGGLE_DRAFT: ToggleDraft = {
  binding: TOGGLE_DEFAULT_BINDING,
  trigger: 'press',
  state: false,
};

export function loadToggleDraft(
  toggle: DynamicKeyOf<'toggle'> | null,
  fields: ToggleFields | undefined
): ToggleDraft {
  if (!toggle) return TOGGLE_DRAFT;
  return {
    binding: toggle.binding || TOGGLE_DEFAULT_BINDING,
    trigger: fields?.trigger ?? TOGGLE_DRAFT.trigger,
    state: fields?.state ?? TOGGLE_DRAFT.state,
  };
}

export function toggleDraft(target: KeyLocation, draft: ToggleDraft): DynamicKeyDraft {
  return { kind: 'toggle', target, binding: draft.binding };
}

// ---------------------------------------------------------------------------------------------
// Dynamic keystroke (DKS)

/** Device distances are u16 fractions; round their noise away (3.0 mm reads 2.99998 mm). */
function roundMm(mm: number): number {
  return Math.round(mm * 1000) / 1000;
}

/**
 * A key with a DKS loads it. The device cannot tell unset bindings (sent as no key) from a
 * picked "None", so both load unset.
 */
export function loadDksEditor(stroke: DynamicKeyOf<'stroke'> | null): DksEditorState {
  if (!stroke) return DKS_EMPTY_EDITOR;
  const [b0, b1, b2, b3] = stroke.bindings.map(binding => (binding === 0 ? null : binding));
  const [c0, c1, c2, c3] = stroke.keyControl.map(decodeKeyControl);
  return {
    bindings: [b0 ?? null, b1 ?? null, b2 ?? null, b3 ?? null],
    bitmaps: [
      c0 ?? DKS_EMPTY_EDITOR.bitmaps[0],
      c1 ?? DKS_EMPTY_EDITOR.bitmaps[1],
      c2 ?? DKS_EMPTY_EDITOR.bitmaps[2],
      c3 ?? DKS_EMPTY_EDITOR.bitmaps[3],
    ],
    bottomOutMm: roundMm(bottomOutMmOf(stroke.distances)),
  };
}

/** The stroke for `editor`, pressed and released at the fixed 1.5 mm actuation point (D14). */
export function strokeDraft(target: KeyLocation, editor: DksEditorState): DynamicKeyDraft {
  const [c0, c1, c2, c3] = editor.bitmaps;
  return {
    kind: 'stroke',
    target,
    bindings: strokeBindings(editor.bindings),
    keyControl: [
      encodeKeyControl(c0),
      encodeKeyControl(c1),
      encodeKeyControl(c2),
      encodeKeyControl(c3),
    ],
    distances: strokeDistances(DKS_ACTUATION_MM, editor.bottomOutMm),
  };
}

// ---------------------------------------------------------------------------------------------
// Null bind

/** What the null-bind editor edits before Apply (the rest is the pair's remembered fields). */
export interface NullBindDraft {
  readonly behavior: NullBindBehavior;
  /** 0 while "Alternative Bottom Out Behavior" is off, else the committed bottom-out point. */
  readonly bottomOutMm: number;
  /** The bottom-out slider's position (committed into `bottomOutMm` on release). */
  readonly uiBottomOutMm: number;
}

/** The distance bottom-out switches on at (Svelte `SWITCH_DISTANCE`). */
export const NULL_BIND_SWITCH_DISTANCE_MM = 4.0;

export const NULL_BIND_DRAFT: NullBindDraft = {
  behavior: 0,
  bottomOutMm: 0,
  uiBottomOutMm: NULL_BIND_SWITCH_DISTANCE_MM,
};

/** The remembered fields of a pair nothing is remembered for (the Svelte editor's defaults). */
export const NULL_BIND_FIELD_DEFAULTS: NullBindFields = {
  bottomOutMm: 0,
  actuationMm: 1.5,
  rtDown: 0,
  rtUp: 0,
  continuous: false,
};

/**
 * A mutex's bottom-out point: 0 unless its mode byte reports both keys when bottomed out, else the
 * remembered point (4.0 mm when none is remembered).
 */
export function mutexBottomOutMm(
  mutex: DynamicKeyOf<'mutex'>,
  fields: NullBindFields | undefined
): number {
  if (!mutexReportsBothOnBottomOut(mutex.mode)) return 0;
  return fields?.bottomOutMm || NULL_BIND_SWITCH_DISTANCE_MM;
}

/**
 * A pair whose first key runs a mutex loads its behavior and bottom-out switch from the device's
 * mode byte (D13), with the remembered bottom-out point; other pairs keep the editor's values.
 */
export function loadNullBindDraft(
  mutex: DynamicKeyOf<'mutex'> | null,
  fields: NullBindFields | undefined,
  previous: NullBindDraft
): NullBindDraft {
  if (!mutex) return previous;
  const bottomOutMm = mutexBottomOutMm(mutex, fields);
  return {
    behavior: mutexModeToBehavior(mutex.mode),
    bottomOutMm,
    uiBottomOutMm: bottomOutMm > 0 ? bottomOutMm : previous.uiBottomOutMm,
  };
}

/** The bottom-out switch (Svelte `updateNullBindBottomOut`): on at 4.0 mm, or off. */
export function withBottomOut(draft: NullBindDraft, enabled: boolean): NullBindDraft {
  return enabled
    ? {
        ...draft,
        bottomOutMm: NULL_BIND_SWITCH_DISTANCE_MM,
        uiBottomOutMm: NULL_BIND_SWITCH_DISTANCE_MM,
      }
    : { ...draft, bottomOutMm: 0 };
}

/** The mutex for the pair: the behavior's firmware priority plus the bottom-out flag. */
export function mutexDraft(
  targets: readonly [KeyLocation, KeyLocation],
  bindings: readonly [Keycode, Keycode],
  draft: NullBindDraft
): DynamicKeyDraft {
  return {
    kind: 'mutex',
    targets,
    bindings,
    mode: mutexMode(behaviorToMutexMode(draft.behavior), draft.bottomOutMm > 0),
  };
}

/**
 * The fields an Apply remembers for the pair: the bottom-out point, and the pair's current values
 * of the rest. Like the Svelte configuration object it replaces, it drops the performance tab's
 * deactivation and deadzones.
 */
export function nullBindFieldsOnApply(
  draft: NullBindDraft,
  current: NullBindFields | undefined
): NullBindFields {
  const { actuationMm, rtDown, rtUp, continuous } = current ?? NULL_BIND_FIELD_DEFAULTS;
  return { bottomOutMm: draft.bottomOutMm, actuationMm, rtDown, rtUp, continuous };
}

/** State of the null-bind performance tab (Svelte `NullBindPerformanceTab`). */
export interface NullBindPerformance {
  readonly rtDown: number;
  readonly actuationMm: number;
  readonly deactivationMm: number;
  readonly sensitivity: number;
  readonly separateSensitivity: boolean;
  readonly pressSensitivity: number;
  readonly releaseSensitivity: number;
  readonly upperDeadzoneMm: number;
  readonly lowerDeadzoneMm: number;
}

export const NULL_BIND_PERFORMANCE_DEFAULTS: NullBindPerformance = {
  rtDown: 0,
  actuationMm: 2.0,
  deactivationMm: 1.5,
  sensitivity: 0.5,
  separateSensitivity: false,
  pressSensitivity: 0.5,
  releaseSensitivity: 0.5,
  upperDeadzoneMm: 0.5,
  lowerDeadzoneMm: 3.5,
};

/** A configured pair loads its remembered values (with the Svelte `??` fallbacks). */
export function loadNullBindPerformance(fields: NullBindFields | undefined): NullBindPerformance {
  if (!fields) return NULL_BIND_PERFORMANCE_DEFAULTS;
  const defaults = NULL_BIND_PERFORMANCE_DEFAULTS;
  return {
    rtDown: fields.rtDown,
    actuationMm: fields.actuationMm,
    deactivationMm: fields.deactivationMm ?? defaults.deactivationMm,
    sensitivity: fields.rtDown,
    separateSensitivity: fields.rtDown !== fields.rtUp,
    pressSensitivity: fields.rtDown,
    releaseSensitivity: fields.rtUp,
    upperDeadzoneMm: fields.upperDeadzoneMm ?? defaults.upperDeadzoneMm,
    lowerDeadzoneMm: fields.lowerDeadzoneMm ?? defaults.lowerDeadzoneMm,
  };
}

/** The pair's remembered fields after a performance-tab change (Svelte write-back effect). */
export function withPerformance(
  fields: NullBindFields,
  performance: NullBindPerformance
): NullBindFields {
  return {
    ...fields,
    rtDown: performance.rtDown,
    rtUp: performance.releaseSensitivity,
    actuationMm: performance.actuationMm,
    deactivationMm: performance.deactivationMm,
    upperDeadzoneMm: performance.upperDeadzoneMm,
    lowerDeadzoneMm: performance.lowerDeadzoneMm,
  };
}
