import { describe, expect, it } from 'vitest';
import { DksAction, getIntervals, type DksBitmap, type DksInterval } from './dks-bitmap';
import { decodeKeyControl, encodeKeyControl } from './dks-codec';

const { Hold: H, Press: P, Release: R, Tap: T } = DksAction;

function at<V>(values: readonly V[], index: number): V {
  const value = values[index];
  if (value === undefined) throw new Error(`index ${index} out of range`);
  return value;
}

const ACTIONS: readonly DksAction[] = [H, P, R, T];
const ALL_BITMAPS: readonly DksBitmap[] = Array.from({ length: 256 }, (_, n): DksBitmap => [
  at(ACTIONS, n & 3),
  at(ACTIONS, (n >> 2) & 3),
  at(ACTIONS, (n >> 4) & 3),
  at(ACTIONS, (n >> 6) & 3),
]);
const ALL_BYTES = Array.from({ length: 256 }, (_, byte) => byte);

// libamp dynamic_key.h
const DKS_RELEASE = 0;
const DKS_TAP = 1;
const DKS_HOLD = 3;
const DKS_KEY_CONTROL = (a: number, b: number, c: number, d: number) =>
  (a & 0x03) | ((b & 0x03) << 2) | ((c & 0x03) << 4) | ((d & 0x03) << 6);
const stageValue = (byte: number, stage: number) => (byte >> (2 * stage)) & 0x03;

/**
 * One press/release cycle of libamp `dynamic_key_s_update_state` for one binding, starting
 * released: which stages leave the binding held, and where a tap (5 ms press) fires.
 */
function firmwareCycle(byte: number): { held: boolean[]; taps: boolean[] } {
  const held: boolean[] = [];
  const taps: boolean[] = [];
  for (let stage = 0; stage < 4; stage++) {
    const value = stageValue(byte, stage);
    held.push(value === DKS_HOLD); // DKS_RELEASE and the undefined value 2 reset the key
    taps.push(value === DKS_TAP);
  }
  return { held, taps };
}

/** What the UI intervals ask for: held over [start, end), taps at zero-length intervals. */
function uiIntent(intervals: readonly DksInterval[]): { held: boolean[]; taps: boolean[] } {
  const stages = [0, 1, 2, 3];
  return {
    held: stages.map(s => intervals.some(([start, end]) => start < end && start <= s && s < end)),
    taps: stages.map(s => intervals.some(([start, end]) => start === s && end === s)),
  };
}

describe('encodeKeyControl', () => {
  it('packs one 2-bit firmware action per stage (stage s at bits 2s)', () => {
    expect(encodeKeyControl([R, R, R, R])).toBe(0x00);
    expect(encodeKeyControl([P, H, H, R])).toBe(
      DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_HOLD, DKS_RELEASE)
    );
    expect(encodeKeyControl([T, H, H, H])).toBe(
      DKS_KEY_CONTROL(DKS_TAP, DKS_RELEASE, DKS_RELEASE, DKS_RELEASE)
    );
    expect(encodeKeyControl([P, R, P, R])).toBe(0x33);
    expect(encodeKeyControl([R, T, R, T])).toBe(0x44);
  });

  it('holds from an interval’s start until its end, where a tap starting there wins', () => {
    expect(encodeKeyControl([P, H, T, R])).toBe(
      DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_TAP, DKS_RELEASE)
    );
    // Touching intervals: the firmware cannot release and re-press in one stage.
    expect(encodeKeyControl([P, P, H, R])).toBe(encodeKeyControl([P, H, H, R]));
  });

  it('encodes nothing for a press that is never closed (it is not an interval)', () => {
    expect(encodeKeyControl([H, P, H, H])).toBe(0x00);
    expect(encodeKeyControl([H, H, H, H])).toBe(0x00);
  });

  it('makes the firmware hold exactly the stages the UI intervals cover, and tap at UI taps', () => {
    for (const bitmap of ALL_BITMAPS) {
      expect({ bitmap, ...firmwareCycle(encodeKeyControl(bitmap)) }).toEqual({
        bitmap,
        ...uiIntent(getIntervals(bitmap)),
      });
    }
  });
});

describe('decodeKeyControl', () => {
  it('turns hold runs into intervals and taps into taps', () => {
    expect(decodeKeyControl(0x00)).toEqual([R, R, R, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_HOLD, DKS_RELEASE))).toEqual([
      P,
      H,
      H,
      R,
    ]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_TAP, 0, 0, 0))).toEqual([T, R, R, R]);
    expect(decodeKeyControl(0x33)).toEqual([P, R, P, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, DKS_HOLD, DKS_TAP, 0))).toEqual([P, H, T, R]);
    expect(decodeKeyControl(0x44)).toEqual([R, T, R, T]);
  });

  it('reads the undefined stage value 2 as release, like the firmware', () => {
    expect(decodeKeyControl(0xaa)).toEqual([R, R, R, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_HOLD, 2, DKS_TAP, 2))).toEqual([P, R, T, R]);
  });

  it('clamps a hold that continues through release-fully (stage 3) to end at stage 3', () => {
    expect(decodeKeyControl(0xff)).toEqual([P, H, H, R]);
    expect(decodeKeyControl(DKS_KEY_CONTROL(0, DKS_HOLD, DKS_HOLD, DKS_HOLD))).toEqual([
      R,
      P,
      H,
      R,
    ]);
    // A hold that starts at stage 3 shrinks to a tap there.
    expect(decodeKeyControl(DKS_KEY_CONTROL(DKS_TAP, 0, 0, DKS_HOLD))).toEqual([T, R, R, T]);
  });

  it('decodes every byte to what the firmware does, except the clamped stage-3 holds', () => {
    for (const byte of ALL_BYTES) {
      const firmware = firmwareCycle(byte);
      const decoded = uiIntent(getIntervals(decodeKeyControl(byte)));
      if (stageValue(byte, 3) === DKS_HOLD) {
        // The hold ends at stage 3 instead of lasting into the next press.
        expect(decoded.held).toEqual([...firmware.held.slice(0, 3), false]);
      } else {
        expect(decoded).toEqual(firmware);
      }
    }
  });
});

describe('round trips', () => {
  it('re-encodes every firmware byte identically unless it holds at stage 3 or uses value 2', () => {
    const identical = ALL_BYTES.filter(byte => encodeKeyControl(decodeKeyControl(byte)) === byte);
    const expected = ALL_BYTES.filter(
      byte =>
        [0, 1, 2, 3].every(stage => stageValue(byte, stage) !== 2) &&
        stageValue(byte, 3) !== DKS_HOLD
    );
    expect(identical).toEqual(expected);
    expect(identical).toHaveLength(54);
    // Value 2 is re-encoded as 0 (both release in the firmware).
    for (const byte of ALL_BYTES.filter(b => stageValue(b, 3) !== DKS_HOLD)) {
      const releaseFor2 = [0, 1, 2, 3].reduce(
        (sum, stage) =>
          sum | ((stageValue(byte, stage) === 2 ? 0 : stageValue(byte, stage)) << (2 * stage)),
        0
      );
      expect(encodeKeyControl(decodeKeyControl(byte))).toBe(releaseFor2);
    }
  });

  it('enumerates the lossy firmware bytes: holds lasting into the next press (stage 3)', () => {
    // Stage letters: R release (0), T tap (1), H hold (3); bytes using the undefined value 2
    // are left out (they re-encode as release, which the firmware treats identically).
    const stages = (byte: number) =>
      [0, 1, 2, 3].map(stage => 'RT2H'.charAt(stageValue(byte, stage))).join('');
    const clamped = ALL_BYTES.filter(
      byte => stageValue(byte, 3) === DKS_HOLD && !stages(byte).includes('2')
    ).map(byte => {
      const decoded = decodeKeyControl(byte);
      const ui = decoded.map(action => 'HPRT'.charAt(action)).join('');
      return `${stages(byte)} → ${ui} → ${stages(encodeKeyControl(decoded))}`;
    });
    expect(clamped).toEqual([
      'RRRH → RRRT → RRRT',
      'TRRH → TRRT → TRRT',
      'HRRH → PRRT → HRRT',
      'RTRH → RTRT → RTRT',
      'TTRH → TTRT → TTRT',
      'HTRH → PTRT → HTRT',
      'RHRH → RPRT → RHRT',
      'THRH → TPRT → THRT',
      'HHRH → PHRT → HHRT',
      'RRTH → RRTT → RRTT',
      'TRTH → TRTT → TRTT',
      'HRTH → PRTT → HRTT',
      'RTTH → RTTT → RTTT',
      'TTTH → TTTT → TTTT',
      'HTTH → PTTT → HTTT',
      'RHTH → RPTT → RHTT',
      'THTH → TPTT → THTT',
      'HHTH → PHTT → HHTT',
      'RRHH → RRPR → RRHR',
      'TRHH → TRPR → TRHR',
      'HRHH → PRPR → HRHR',
      'RTHH → RTPR → RTHR',
      'TTHH → TTPR → TTHR',
      'HTHH → PTPR → HTHR',
      'RHHH → RPHR → RHHR',
      'THHH → TPHR → THHR',
      'HHHH → PHHR → HHHR',
    ]);
  });

  it('keeps every UI bitmap’s intervals except touching intervals, which merge', () => {
    const merged = ALL_BITMAPS.filter(
      bitmap =>
        JSON.stringify(getIntervals(decodeKeyControl(encodeKeyControl(bitmap)))) !==
        JSON.stringify(getIntervals(bitmap))
    );
    const touching = (bitmap: DksBitmap) => {
      const intervals = getIntervals(bitmap).filter(([start, end]) => start < end);
      return intervals.some(([, end]) => intervals.some(([start]) => start === end));
    };
    expect(merged).toEqual(ALL_BITMAPS.filter(touching));
    const show = (intervals: readonly DksInterval[]) =>
      intervals.map(([start, end]) => `[${start},${end}]`).join(' ');
    expect(
      merged.map(
        bitmap =>
          `${bitmap.map(action => 'HPRT'.charAt(action)).join('')}: ${show(getIntervals(bitmap))} → ${show(getIntervals(decodeKeyControl(encodeKeyControl(bitmap))))}`
      )
    ).toEqual([
      'PPPH: [0,1] [1,2] → [0,2]',
      'PPRH: [0,1] [1,2] → [0,2]',
      'PPTH: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHP: [0,1] [1,3] → [0,3]',
      'PHPP: [0,2] [2,3] → [0,3]',
      'HPPP: [1,2] [2,3] → [1,3]',
      'PPPP: [0,1] [1,2] [2,3] → [0,3]',
      'RPPP: [1,2] [2,3] → [1,3]',
      'TPPP: [0,0] [1,2] [2,3] → [0,0] [1,3]',
      'PPRP: [0,1] [1,2] → [0,2]',
      'PPTP: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHR: [0,1] [1,3] → [0,3]',
      'PHPR: [0,2] [2,3] → [0,3]',
      'HPPR: [1,2] [2,3] → [1,3]',
      'PPPR: [0,1] [1,2] [2,3] → [0,3]',
      'RPPR: [1,2] [2,3] → [1,3]',
      'TPPR: [0,0] [1,2] [2,3] → [0,0] [1,3]',
      'PPRR: [0,1] [1,2] → [0,2]',
      'PPTR: [0,1] [1,2] [2,2] → [0,2] [2,2]',
      'PPHT: [0,1] [1,3] [3,3] → [0,3] [3,3]',
      'PHPT: [0,2] [2,3] [3,3] → [0,3] [3,3]',
      'HPPT: [1,2] [2,3] [3,3] → [1,3] [3,3]',
      'PPPT: [0,1] [1,2] [2,3] [3,3] → [0,3] [3,3]',
      'RPPT: [1,2] [2,3] [3,3] → [1,3] [3,3]',
      'TPPT: [0,0] [1,2] [2,3] [3,3] → [0,0] [1,3] [3,3]',
      'PPRT: [0,1] [1,2] [3,3] → [0,2] [3,3]',
      'PPTT: [0,1] [1,2] [2,2] [3,3] → [0,2] [2,2] [3,3]',
    ]);
  });

  it('decodes to canonical bitmaps (decode ∘ encode is idempotent)', () => {
    for (const bitmap of ALL_BITMAPS) {
      const canonical = decodeKeyControl(encodeKeyControl(bitmap));
      expect(decodeKeyControl(encodeKeyControl(canonical))).toEqual(canonical);
    }
  });
});
