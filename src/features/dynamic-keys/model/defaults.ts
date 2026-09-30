/**
 * Defaults and presets of the dynamic-key editors (from the Svelte editors), with bindings as full
 * EMI keycodes.
 */
import { Keycode as EmiKeycode, KeyModifier } from 'emi-keyboard-controller';
import type { Keycode, StrokeDistances } from '../../device/model/types';
import { fractionToMm, mmToFraction } from '../../device/model/units';
import { kc } from '../../keycodes';
import { DksAction, type DksBitmap } from './dks-bitmap';

/** DKS press/release point at the top of the stroke (fixed at 1.5 mm, as in the Svelte app). */
export const DKS_ACTUATION_MM = 1.5;

/**
 * Stage distances of a DKS: press-begin and release-fully at the actuation point, press-fully and
 * release-begin at the bottom-out point (spec D14).
 */
export function strokeDistances(actuationMm: number, bottomOutMm: number): StrokeDistances {
  return {
    pressBegin: mmToFraction(actuationMm),
    pressFully: mmToFraction(bottomOutMm),
    releaseBegin: mmToFraction(bottomOutMm),
    releaseFully: mmToFraction(actuationMm),
  };
}

/** Bottom-out point (mm) of a DKS read from the device. */
export function bottomOutMmOf(distances: StrokeDistances): number {
  return fractionToMm(distances.pressFully);
}

export interface DksEditorState {
  readonly bindings: readonly [Keycode, Keycode, Keycode, Keycode];
  readonly bitmaps: readonly [DksBitmap, DksBitmap, DksBitmap, DksBitmap];
  readonly bottomOutMm: number;
}

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;
const RELEASED: DksBitmap = [R, R, R, R];

/** Editor state for a key without a DKS. */
export const DKS_EMPTY_EDITOR: DksEditorState = {
  bindings: [kc.none, kc.none, kc.none, kc.none],
  bitmaps: [RELEASED, RELEASED, RELEASED, RELEASED],
  bottomOutMm: 3.0,
};

/** Preset loaded by the DKS editor's Reset. */
export const DKS_RESET_PRESET: DksEditorState = {
  bindings: [
    kc.key(EmiKeycode.Escape),
    kc.key(EmiKeycode.Enter),
    kc.key(EmiKeycode.Spacebar),
    kc.key(EmiKeycode.Backspace),
  ],
  bitmaps: [
    [P, H, H, R],
    [T, H, H, H],
    [P, P, H, R],
    [H, H, H, H],
  ],
  bottomOutMm: 4.0,
};

/**
 * Tap-hold editor defaults. The hold action is Left Ctrl as a standalone modifier (spec D15);
 * the tap timeout is the firmware mod-tap duration, the hold delay is UI-only (spec D5).
 */
export const TAP_HOLD_DEFAULTS: Readonly<{
  tap: Keycode;
  hold: Keycode;
  holdDelayMs: number;
  tapTimeoutMs: number;
}> = {
  tap: kc.key(EmiKeycode.Escape),
  hold: kc.modifier(KeyModifier.KeyLeftCtrl),
  holdDelayMs: 200,
  tapTimeoutMs: 150,
};

/** Toggle editor default binding. */
export const TOGGLE_DEFAULT_BINDING: Keycode = kc.key(EmiKeycode.CapsLock);
