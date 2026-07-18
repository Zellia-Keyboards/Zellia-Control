/**
 * DKS UI bitmap ↔ firmware `key_control` byte (libamp `dynamic_key.h` / `dynamic_key.c`).
 *
 * The firmware stores, per binding, 4 × 2 bits: stage `s` (0 press-begin, 1 press-fully,
 * 2 release-begin, 3 release-fully) at bits `2s` holds the state applied when the key crosses
 * that stage: `DKS_RELEASE` (0), `DKS_TAP` (1, a 5 ms press) or `DKS_HOLD` (3, pressed until a
 * later stage changes it). The undefined value 2 behaves like release.
 *
 * Encode: an interval `[s, e]` holds stages `s … e−1`; a tap at `i` is `DKS_TAP`; every other
 * stage is `DKS_RELEASE` (so an interval ends with a release at `e` unless a tap or another
 * interval starts there). Decode: each maximal hold run becomes a press at its start and a
 * release (or the tap found there) at the first stage after it; a run reaching stage 3 — a hold
 * lasting into the next press, which the UI cannot show — is clamped to end at stage 3.
 */
import { DKS_STAGE_COUNT, DksAction, getIntervals, type DksBitmap } from './dks-bitmap';

const DKS_RELEASE = 0;
const DKS_TAP = 1;
const DKS_HOLD = 3;

const LAST_STAGE = DKS_STAGE_COUNT - 1;

/** Firmware `key_control` byte for one binding's UI bitmap. */
export function encodeKeyControl(bitmap: DksBitmap): number {
  const stages = [DKS_RELEASE, DKS_RELEASE, DKS_RELEASE, DKS_RELEASE];
  for (const [start, end] of getIntervals(bitmap)) {
    if (start === end) stages[start] = DKS_TAP;
    for (let stage = start; stage < end; stage++) stages[stage] = DKS_HOLD;
  }
  return stages.reduce((byte, value, stage) => byte | (value << (2 * stage)), 0);
}

/** UI bitmap shown for a firmware `key_control` byte (canonical: idle stages are `Release`). */
export function decodeKeyControl(byte: number): DksBitmap {
  const stage = (index: number): number => (byte >> (2 * index)) & 0x03;
  const actionAt = (index: number): DksAction =>
    stage(index) === DKS_TAP ? DksAction.Tap : DksAction.Release;
  const actions: [DksAction, DksAction, DksAction, DksAction] = [
    DksAction.Release,
    DksAction.Release,
    DksAction.Release,
    DksAction.Release,
  ];
  let index = 0;
  while (index < DKS_STAGE_COUNT) {
    if (stage(index) !== DKS_HOLD) {
      actions[index] = actionAt(index);
      index++;
      continue;
    }
    const start = index;
    while (index < DKS_STAGE_COUNT && stage(index) === DKS_HOLD) index++;
    if (index === DKS_STAGE_COUNT) {
      // Held through release-fully: end the interval at stage 3 (a tap if it starts there).
      if (start === LAST_STAGE) {
        actions[LAST_STAGE] = DksAction.Tap;
      } else {
        actions[start] = DksAction.Press;
        for (let held = start + 1; held < LAST_STAGE; held++) actions[held] = DksAction.Hold;
        actions[LAST_STAGE] = DksAction.Release;
      }
      break;
    }
    actions[start] = DksAction.Press;
    for (let held = start + 1; held < index; held++) actions[held] = DksAction.Hold;
    actions[index] = actionAt(index); // closes the interval; a tap here also taps
    index++;
  }
  return actions;
}
